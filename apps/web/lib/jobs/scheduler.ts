import { expireUnpaidOffers, releaseExpiredReservations } from './expire-unpaid-offers';

/**
 * Background schedule, started from inside the app itself.
 *
 * The site is self-hosted on a VPS with no platform scheduler, and a hand-
 * maintained crontab is invisible from the repo and easy to lose on a rebuild.
 * So the schedule lives in code and starts with the server.
 *
 * It hangs off `apiHandler` rather than Next's `instrumentation.ts` hook on
 * purpose: Next compiles instrumentation for the edge runtime as well as Node,
 * and the MongoDB driver's `net`/`crypto` imports cannot resolve there — which
 * breaks the edge compile and takes the whole server down with 500s. API routes
 * only ever run on Node, so starting from there sidesteps the problem entirely.
 *
 * The cost is that the first tick waits for the first request after boot. On a
 * live site that is immediate, and the timer runs unattended from then on.
 *
 * The /api/cron/* endpoints call the same two functions, so an external
 * scheduler can still be pointed at them; the jobs are safe to run twice.
 */

let started = false;
let running = false;

function intervalMs(): number {
  const minutes = Number(process.env.CRON_INTERVAL_MINUTES);
  const valid = Number.isFinite(minutes) && minutes >= 1 && minutes <= 720;
  return (valid ? minutes : 15) * 60_000;
}

async function tick(): Promise<void> {
  // Skip if the previous tick is still going — the jobs are safe to overlap,
  // but there is no reason to pile them up behind a slow database.
  if (running) return;
  running = true;
  try {
    const [offers, reservations] = await Promise.all([
      expireUnpaidOffers(),
      releaseExpiredReservations(),
    ]);
    if (offers.expired > 0 || reservations.released > 0) {
      console.log(
        `[Scheduler] Expired ${offers.expired} offer(s), released ${reservations.released} reservation(s).`
      );
    }
  } catch (err) {
    // A failed tick must never bring the request down with it.
    console.error('[Scheduler] Tick failed:', err);
  } finally {
    running = false;
  }
}

/** Idempotent — safe to call on every request; only the first one starts it. */
export function startScheduler(): void {
  if (started) return;
  started = true;

  if (process.env.DISABLE_IN_PROCESS_CRON === 'true') {
    console.log('[Scheduler] Disabled by DISABLE_IN_PROCESS_CRON.');
    return;
  }

  const ms = intervalMs();

  // Let the request that triggered this finish first.
  setTimeout(() => { void tick(); }, 10_000);

  const timer = setInterval(() => { void tick(); }, ms);
  timer.unref?.(); // do not hold the process open on shutdown

  console.log(`[Scheduler] Offer expiry and reservation cleanup every ${ms / 60_000} minute(s).`);
}
