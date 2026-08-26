import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health — container healthcheck and reverse-proxy probe.
 *
 * Deliberately does not go through `apiHandler`: that would run
 * `ensureIndexes()` on every probe. A `ping` is enough to tell whether the app
 * can actually reach MongoDB, which is the failure mode worth restarting for.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      latencyMs: Date.now() - startedAt,
      environment: process.env.AUTHORIZENET_ENV === 'production' ? 'production' : 'sandbox',
    });
  } catch (err) {
    console.error('[Health] Database unreachable:', err);
    return NextResponse.json(
      { status: 'error', database: 'unreachable' },
      { status: 503 }
    );
  }
}
