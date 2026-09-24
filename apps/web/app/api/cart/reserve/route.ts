import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { requireCustomer } from '@/lib/auth-middleware';
import { getNumbersCollection } from '@/lib/collections';
import { apiHandler } from '@/lib/api-handler';
import { formatNumberDoc } from '@/lib/utils/pricing';

const RESERVATION_MINUTES = 15;

export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    const auth = await requireCustomer(req);
    const { numberId } = await req.json();

    if (!numberId || !ObjectId.isValid(numberId)) {
      return NextResponse.json({ error: 'Invalid number ID' }, { status: 400 });
    }

    const col = await getNumbersCollection();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + RESERVATION_MINUTES * 60 * 1000);

    // Atomically reserve: only if available OR reservation expired
    const result = await col.findOneAndUpdate(
      {
        _id: new ObjectId(numberId),
        $or: [
          { status: 'available' },
          { status: 'reserved', reservationExpiresAt: { $lt: now } },
        ],
      },
      {
        $set: {
          status: 'reserved' as const,
          reservedBy: new ObjectId(auth.userId),
          reservedAt: now,
          reservationExpiresAt: expiresAt,
          updatedAt: now,
        },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Number is no longer available' },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...formatNumberDoc(result),
        expiresAt: expiresAt.toISOString(),
      },
    });
  });
}
