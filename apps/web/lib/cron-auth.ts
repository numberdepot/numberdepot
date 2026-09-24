import { NextRequest } from 'next/server';
import { HttpError } from './http-error';

/**
 * Gate for scheduled jobs.
 *
 * These endpoints decline offers, release inventory and email customers, so
 * they must not be callable by anyone who knows the URL. Accepts either
 * `Authorization: Bearer <CRON_SECRET>` or `?key=<CRON_SECRET>`, which covers
 * every scheduler people actually use (Vercel Cron, GitHub Actions, curl in
 * crontab, uptime pingers).
 *
 * If CRON_SECRET is unset the route refuses to run rather than defaulting to
 * open — an unprotected job that cancels sales is worse than one that does not
 * run, because the failure is silent either way but only one of them is
 * exploitable.
 */
export function requireCron(req: NextRequest): void {
  const secret = process.env.CRON_SECRET?.trim();

  if (!secret) {
    throw new HttpError(
      'Scheduled jobs are disabled: set CRON_SECRET in the environment.',
      503
    );
  }

  const header = req.headers.get('authorization');
  const bearer = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
  const query = req.nextUrl.searchParams.get('key');
  const provided = bearer || query;

  if (!provided || !timingSafeEqual(provided, secret)) {
    throw new HttpError('Forbidden', 403);
  }
}

/** Constant-time compare, so the secret cannot be guessed a character at a time. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
