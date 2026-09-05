import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { getSettingsCollection } from '@/lib/collections';
import { apiHandler } from '@/lib/api-handler';

const DEFAULT_SETTINGS: Record<string, unknown> = {
  siteName: 'NumberDepot',
  supportEmail: 'support@numberdepotinc.com',
  supportPhone: '(800) 555-0199',
  defaultCommissionRate: 10,
  numberbarnMarkup: 15,
  reservationMinutes: 15,
};

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);

    const col = await getSettingsCollection();
    const docs = await col.find({}).toArray();

    const settings = { ...DEFAULT_SETTINGS };
    for (const doc of docs) {
      settings[doc.key] = doc.value;
    }

    return NextResponse.json({ success: true, data: settings });
  });
}

export async function PUT(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);
    const body = await req.json();
    const col = await getSettingsCollection();
    const now = new Date();

    const ops = Object.entries(body).map(([key, value]) =>
      col.updateOne(
        { key },
        { $set: { key, value, updatedAt: now } },
        { upsert: true }
      )
    );
    await Promise.all(ops);

    // Return updated settings
    const docs = await col.find({}).toArray();
    const settings = { ...DEFAULT_SETTINGS };
    for (const doc of docs) {
      settings[doc.key] = doc.value;
    }

    return NextResponse.json({ success: true, data: settings });
  });
}
