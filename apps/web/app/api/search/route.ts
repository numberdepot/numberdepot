import { NextRequest, NextResponse } from 'next/server';
import { getNumbersCollection } from '@/lib/collections';
import { apiHandler } from '@/lib/api-handler';
import { formatNumberDoc, dollarsToCents } from '@/lib/utils/pricing';
import { searchNumbers as nbSearch, toOurFormat } from '@/lib/numberbarn';

// Prevent Next.js from caching this route
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    const params = req.nextUrl.searchParams;
    const q = params.get('q')?.trim();
    const areaCode = params.get('area_code');
    const numberType = params.get('number_type');
    const priceMin = params.get('price_min');
    const priceMax = params.get('price_max');
    const sort = params.get('sort') || 'price_asc';
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(params.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const col = await getNumbersCollection();

    // Clean up expired reservations inline (lightweight — uses TTL index)
    const now = new Date();
    await col.updateMany(
      { status: 'reserved', reservationExpiresAt: { $lt: now } },
      { $set: { status: 'available' }, $unset: { reservedBy: '', reservedAt: '', reservationExpiresAt: '' } }
    );

    // Build optimized filter — uses compound indexes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { status: 'available' };

    if (areaCode) filter.areaCode = areaCode;
    if (numberType) filter.numberType = numberType;

    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = dollarsToCents(parseFloat(priceMin));
      if (priceMax) filter.price.$lte = dollarsToCents(parseFloat(priceMax));
    }

    // Text/number search — improved for accuracy
    if (q) {
      const digits = q.replace(/\D/g, '');
      const letters = q.replace(/[^a-zA-Z]/g, '');
      const conditions: Record<string, unknown>[] = [];

      // Digit-based search on the `number` field (stored as E.164: "12125551234")
      if (digits.length >= 2 && digits.length <= 11) {
        if (digits.length === 3 && !areaCode && !letters) {
          // Pure 3-digit query without letters — area code search
          filter.areaCode = digits;
        } else if (digits.length === 10) {
          // Full 10-digit number — match with or without leading country code "1"
          conditions.push({ number: { $regex: `1?${digits}$` } });
        } else if (digits.length === 11 && digits.startsWith('1')) {
          // Full 11-digit E.164 — exact suffix match
          conditions.push({ number: digits });
        } else {
          // Partial digits — substring match on number
          conditions.push({ number: { $regex: digits } });
        }
      }

      // Letter-based search on vanityText and formattedNumber (partial, case-insensitive)
      if (letters.length >= 2) {
        const escaped = letters.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        conditions.push({ vanityText: { $regex: escaped, $options: 'i' } });
      }

      // Full query search on formattedNumber (handles "(212) 555-1234" style)
      if (q.length >= 2 && /[()-\s]/.test(q)) {
        const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        conditions.push({ formattedNumber: { $regex: escaped, $options: 'i' } });
      }

      // Combine conditions with $or (if we have conditions and didn't set areaCode directly)
      if (conditions.length === 1) {
        Object.assign(filter, conditions[0]);
      } else if (conditions.length > 1) {
        filter.$or = conditions;
      }
    }

    // Sort — use fields that match compound indexes
    let sortObj: Record<string, 1 | -1> = { price: 1 };
    switch (sort) {
      case 'price_asc': sortObj = { price: 1 }; break;
      case 'price_desc': sortObj = { price: -1 }; break;
      case 'featured': sortObj = { isPremium: -1, price: 1 }; break;
      case 'newest': sortObj = { createdAt: -1 }; break;
    }

    // Fetch inventory + NumberBarn in parallel, then merge & paginate
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let nbFormatted: any[] = [];

    const inventoryPromise = Promise.all([
      col.find(filter).sort(sortObj).toArray(),
      col.countDocuments(filter),
    ]);

    // NumberBarn search (runs in parallel with inventory)
    let nbPromise: Promise<void> = Promise.resolve();
    if (areaCode || q) {
      nbPromise = (async () => {
        try {
          let nbNpa = areaCode || undefined;
          const qDigits = q ? q.replace(/\D/g, '') : '';
          if (!nbNpa && qDigits.length >= 3) {
            if (qDigits.length >= 10) {
              const d = qDigits.length === 11 && qDigits.startsWith('1') ? qDigits.slice(1) : qDigits;
              nbNpa = d.slice(0, 3);
            } else if (qDigits.length === 3) {
              nbNpa = qDigits;
            }
          }

          const nbParams = {
            npa: nbNpa,
            search: q && /[a-zA-Z]/.test(q) ? q : undefined,
            limit: 100,
            priceMin: priceMin ? dollarsToCents(parseFloat(priceMin)) : undefined,
            priceMax: priceMax ? dollarsToCents(parseFloat(priceMax)) : undefined,
          };
          console.log('[Search] NumberBarn params:', JSON.stringify(nbParams));

          const nbResults = await nbSearch(nbParams);
          console.log(`[Search] NumberBarn returned ${nbResults.length} results`);

          nbFormatted = await Promise.all(nbResults.map(toOurFormat));
        } catch (err) {
          console.error('[Search] NumberBarn search failed:', err);
        }
      })();
    }

    const [[results], _] = await Promise.all([inventoryPromise, nbPromise]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let allData: any[] = results.map((doc) => formatNumberDoc(doc as any));

    // Merge NumberBarn results, excluding duplicates
    if (nbFormatted.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingNumbers = new Set(results.map((r) => (r as any).number));
      const unique = nbFormatted.filter((n: { rawNumber: string }) => !existingNumbers.has(n.rawNumber));
      allData = [...allData, ...unique];
    }

    // Sort the merged results — inventory first, then NumberBarn
    allData.sort((a, b) => {
      // Primary: inventory numbers always come before NumberBarn
      if (a.source !== b.source) {
        return a.source === 'inventory' ? -1 : 1;
      }
      // Secondary: sort within same source by selected criteria
      switch (sort) {
        case 'price_desc':
          return (b.salePrice ?? 0) - (a.salePrice ?? 0);
        case 'featured':
          if (a.isPremium !== b.isPremium) return a.isPremium ? -1 : 1;
          return (a.salePrice ?? 0) - (b.salePrice ?? 0);
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'price_asc':
        default:
          return (a.salePrice ?? 0) - (b.salePrice ?? 0);
      }
    });

    // Paginate the merged + sorted results
    const adjustedTotal = allData.length;
    const data = allData.slice(skip, skip + limit);
    const totalPages = Math.max(1, Math.ceil(adjustedTotal / limit));

    return NextResponse.json({
      success: true,
      data,
      pagination: { page, limit, total: adjustedTotal, totalPages },
    });
  });
}
