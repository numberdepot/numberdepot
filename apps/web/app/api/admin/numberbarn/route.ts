import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth-middleware';
import { apiHandler } from '@/lib/api-handler';
import { getSettingsCollection, getNumbersCollection } from '@/lib/collections';
import { searchNumbers, toOurFormat } from '@/lib/numberbarn';

export const dynamic = 'force-dynamic';

/** GET /api/admin/numberbarn — Status + stats */
export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);

    const settings = await getSettingsCollection();
    const numbers = await getNumbersCollection();

    // Get config
    const markupDoc = await settings.findOne({ key: 'numberbarnMarkup' });
    const markup = markupDoc?.value ?? 15;
    // Check token from env or DB settings
    let hasToken = !!process.env.NUMBERBARN_API_TOKEN;
    if (!hasToken) {
      const tokenDoc = await settings.findOne({ key: 'numberbarnApiToken' });
      hasToken = !!(tokenDoc?.value);
    }

    // Inventory stats
    const [totalInventory, availableInventory, soldInventory, reservedInventory] = await Promise.all([
      numbers.countDocuments({ source: 'inventory' }),
      numbers.countDocuments({ source: 'inventory', status: 'available' }),
      numbers.countDocuments({ source: 'inventory', status: 'sold' }),
      numbers.countDocuments({ source: 'inventory', status: 'reserved' }),
    ]);

    // NumberBarn API health check — search is public, no token needed
    let apiStatus: 'connected' | 'error' | 'no_token' = 'error';
    let apiMessage = 'Could not reach NumberBarn API';
    let sampleCount = 0;

    try {
      const testResults = await searchNumbers({ limit: 1 });
      if (testResults && testResults.length > 0) {
        apiStatus = hasToken ? 'connected' : 'connected';
        apiMessage = hasToken
          ? 'Search & Purchase APIs ready'
          : 'Search API working (add token to enable purchases)';
        sampleCount = testResults.length;
      } else {
        apiStatus = 'connected';
        apiMessage = 'API reachable but returned no results';
      }
    } catch {
      apiStatus = 'error';
      apiMessage = 'Failed to reach NumberBarn API';
    }

    return NextResponse.json({
      success: true,
      data: {
        numberbarn: {
          apiStatus,
          apiMessage,
          hasToken,
          markup,
          sampleCount,
        },
        inventory: {
          total: totalInventory,
          available: availableInventory,
          sold: soldInventory,
          reserved: reservedInventory,
        },
      },
    });
  });
}

/** POST /api/admin/numberbarn — Paginated search */
export async function POST(req: NextRequest) {
  return apiHandler(async () => {
    requireAdmin(req);
    const body = await req.json();
    const { areaCode, search, page = 1, rowsPerPage = 25 } = body;

    if (!areaCode && !search) {
      return NextResponse.json({ error: 'Provide areaCode or search term' }, { status: 400 });
    }

    const limit = Math.min(rowsPerPage, 100);
    const skip = (page - 1) * limit;

    const nbResults = await searchNumbers({
      npa: areaCode || undefined,
      search: search || undefined,
      limit,
      skip,
    });

    const formatted = await Promise.all((nbResults || []).map(toOurFormat));

    // Fetch one extra to know if there are more pages
    const hasMore = formatted.length === limit;

    return NextResponse.json({
      success: true,
      data: {
        results: formatted,
        count: formatted.length,
        hasMore,
        page,
        rowsPerPage: limit,
        source: 'numberbarn',
      },
    });
  });
}
