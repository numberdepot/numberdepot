import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getNumbersCollection } from '@/lib/collections';
import { authenticateRequest } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { formatNumberDoc } from '@/lib/utils/pricing';
import { getNumberInfo, toOurFormat } from '@/lib/numberbarn';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const { id } = await params;

    // NumberBarn numbers
    if (id.startsWith('nb_')) {
      const tn = id.slice(3);
      const nbNum = await getNumberInfo(tn);
      if (!nbNum) {
        return NextResponse.json({ error: 'Number not found on NumberBarn' }, { status: 404 });
      }
      const formatted = await toOurFormat(nbNum);
      return NextResponse.json({ success: true, data: { ...formatted, isPurchasable: true } });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid number ID' }, { status: 400 });
    }

    const col = await getNumbersCollection();
    const doc = await col.findOne({ _id: new ObjectId(id) });

    if (!doc) {
      return NextResponse.json({ error: 'Number not found' }, { status: 404 });
    }

    // A sold or delisted number must not be browsable. Without this, a direct
    // link, a bookmark or a search-engine result would still render a full
    // product page — complete with a working Add to Cart button — for a number
    // somebody else already owns.
    if (doc.status === 'sold' || doc.status === 'inactive') {
      return NextResponse.json(
        { error: 'This number is no longer available' },
        { status: 404 }
      );
    }

    // A live reservation held by someone else means the number is viewable but
    // not buyable right now. The viewer's own reservation still counts as
    // purchasable so they can complete their checkout.
    const auth = authenticateRequest(req);
    const now = new Date();
    const reservationActive =
      doc.status === 'reserved' &&
      !!doc.reservationExpiresAt &&
      doc.reservationExpiresAt > now;
    const reservedByViewer =
      reservationActive && !!auth && doc.reservedBy?.toString() === auth.userId;

    return NextResponse.json({
      success: true,
      data: {
        ...formatNumberDoc(doc),
        isPurchasable: !reservationActive || reservedByViewer,
        reservedByOther: reservationActive && !reservedByViewer,
      },
    });
  });
}
