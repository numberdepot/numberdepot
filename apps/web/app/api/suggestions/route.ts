import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { authenticateRequest } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getSuggestionsCollection, getSettingsCollection } from '@/lib/collections';

/**
 * POST /api/suggestions — public suggestion box.
 *
 * Anyone can submit, signed in or not. The record lands in the admin panel
 * under Suggestions and a copy is emailed to the support address so nothing
 * sits unread.
 */

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;
const NAME_MAX = 100;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Light per-IP throttle so a bored script cannot flood the inbox. In-memory is
// fine here: it resets on deploy and that is an acceptable failure mode for a
// suggestion box.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  // Keep the map from growing without bound.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const ip = clientIp(req);
    if (throttled(ip)) {
      return NextResponse.json(
        { error: 'Too many suggestions in a short time — please try again in an hour.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const message = typeof body?.message === 'string' ? body.message.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim().slice(0, NAME_MAX) : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const source = typeof body?.source === 'string' ? body.source.trim().slice(0, 50) : '';

    if (message.length < MESSAGE_MIN) {
      return NextResponse.json(
        { error: `Please write at least ${MESSAGE_MIN} characters.` },
        { status: 400 }
      );
    }
    if (message.length > MESSAGE_MAX) {
      return NextResponse.json(
        { error: `Please keep it under ${MESSAGE_MAX} characters.` },
        { status: 400 }
      );
    }
    if (email && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'That email address does not look right.' }, { status: 400 });
    }

    // Attach the account when the sender is signed in, so the admin can reply.
    const auth = authenticateRequest(req);
    const now = new Date();

    const col = await getSuggestionsCollection();
    const result = await col.insertOne({
      name: name || undefined,
      email: email || auth?.email || undefined,
      message,
      userId: auth ? new ObjectId(auth.userId) : undefined,
      source: source || undefined,
      status: 'new',
      ip,
      userAgent: req.headers.get('user-agent')?.slice(0, 300) || undefined,
      createdAt: now,
    });

    // Best-effort email to support — the record is already saved either way.
    try {
      const settings = await getSettingsCollection();
      const doc = await settings.findOne({ key: 'supportEmail' });
      const to =
        (typeof doc?.value === 'string' && doc.value) || 'support@numberdepotinc.com';
      const { sendSuggestionNotification } = await import('@/lib/resend');
      await sendSuggestionNotification(to, {
        name: name || (auth ? auth.email : 'Anonymous'),
        email: email || auth?.email || '',
        message,
        source,
      });
    } catch (err) {
      console.error('[Suggestions] Notification email failed:', err);
    }

    return NextResponse.json({
      success: true,
      data: { id: result.insertedId.toString(), message: 'Thanks — your suggestion has been sent.' },
    });
  });
}
