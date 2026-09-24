import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { requireCron } from '@/lib/cron-auth';
import { expireUnpaidOffers } from '@/lib/jobs/expire-unpaid-offers';

/**
 * GET /api/cron/expire-unpaid-offers
 *
 * Manual trigger for the offer-expiry sweep, and the hook for an external
 * scheduler. The app already runs this on a timer of its own (see
 * `instrumentation.ts`) — this endpoint calls the exact same function, so the
 * two can coexist without stepping on each other.
 */
export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    requireCron(req);

    const result = await expireUnpaidOffers();

    return NextResponse.json({
      success: true,
      data: { ...result, at: new Date().toISOString() },
    });
  });
}
