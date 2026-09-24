import { NextRequest, NextResponse } from 'next/server';
import { apiHandler } from '@/lib/api-handler';
import { requireCron } from '@/lib/cron-auth';
import { releaseExpiredReservations } from '@/lib/jobs/expire-unpaid-offers';

/**
 * GET /api/cron/cleanup-reservations
 *
 * Releases cart holds that have run out. Also runs on the app's own timer (see
 * `instrumentation.ts`); this endpoint is the manual override.
 */
export async function GET(req: NextRequest) {
  return apiHandler(async () => {
    requireCron(req);

    const { released } = await releaseExpiredReservations();

    return NextResponse.json({
      success: true,
      data: { cleaned: released, at: new Date().toISOString() },
    });
  });
}
