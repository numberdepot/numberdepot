/**
 * Pure time formatting — no imports, so it is safe in client components.
 *
 * Kept out of `offer-window.ts` on purpose: that module reads settings from
 * MongoDB, and importing it from a 'use client' file would drag the driver
 * into the browser bundle.
 */

/** "2h 15m left", "3d 4h left", or "overdue". */
export function timeLeftLabel(due: Date | string | null | undefined, now = new Date()): string {
  if (!due) return '';
  const ms = new Date(due).getTime() - now.getTime();
  if (ms <= 0) return 'overdue';

  const mins = Math.floor(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;

  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `${d}d ${h % 24}h left`;
  }
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}
