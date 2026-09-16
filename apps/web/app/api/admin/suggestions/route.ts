import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getSuggestionsCollection } from '@/lib/collections';
import type { SuggestionDoc } from '@/lib/types/db';

/** GET /api/admin/suggestions — list, newest first, with unread count. */
export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);

    const params = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '25')));
    const skip = (page - 1) * limit;
    const status = params.get('status'); // new | read | archived | all
    const search = params.get('q')?.trim();

    const col = await getSuggestionsCollection();

    const filter: Record<string, unknown> = {};
    if (status && status !== 'all') filter.status = status;
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const rx = { $regex: escaped, $options: 'i' };
      filter.$or = [{ name: rx }, { email: rx }, { message: rx }];
    }

    const [rows, total, unread] = await Promise.all([
      col.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      col.countDocuments(filter),
      col.countDocuments({ status: 'new' }),
    ]);

    return NextResponse.json({
      success: true,
      data: rows.map((s) => ({
        id: s._id.toString(),
        name: s.name || '',
        email: s.email || '',
        message: s.message,
        userId: s.userId?.toString() || null,
        source: s.source || '',
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        readAt: s.readAt?.toISOString() || null,
      })),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      unread,
    });
  });
}

/** PUT /api/admin/suggestions — body: { id, status } */
export async function PUT(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const { id, status } = body || {};

    if (!id || !ObjectId.isValid(String(id))) {
      return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
    }
    const allowed: SuggestionDoc['status'][] = ['new', 'read', 'archived'];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: 'status must be new, read or archived' }, { status: 400 });
    }

    const col = await getSuggestionsCollection();
    const update: Record<string, unknown> =
      status === 'new'
        ? { $set: { status }, $unset: { readAt: '' } }
        : { $set: { status, readAt: new Date() } };

    const result = await col.updateOne({ _id: new ObjectId(String(id)) }, update);

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { id, status } });
  });
}

/** DELETE /api/admin/suggestions?id=… */
export async function DELETE(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);
    const id = req.nextUrl.searchParams.get('id');
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Valid id is required' }, { status: 400 });
    }
    const col = await getSuggestionsCollection();
    const result = await col.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Suggestion not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: { id } });
  });
}
