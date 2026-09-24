import { getSettingsCollection } from '../collections';


/** Hours a buyer gets to pay after their offer is accepted. */
export const DEFAULT_PAYMENT_WINDOW_HOURS = 24;

/**
 * How long the buyer has to pay, in hours.
 *
 * Admin-configurable via the `offerPaymentHours` setting; falls back to 24. A
 * bad or missing value must never shorten the window to zero, which would
 * expire every offer the moment it was accepted — so anything unusable falls
 * back to the default rather than to 0.
 */
export async function getPaymentWindowHours(): Promise<number> {
  try {
    const settings = await getSettingsCollection();
    const doc = await settings.findOne({ key: 'offerPaymentHours' });
    const raw = Number(doc?.value);
    if (Number.isFinite(raw) && raw >= 1 && raw <= 24 * 30) return raw;
  } catch {
    // Fall through to the default — a settings outage must not break accepting.
  }
  return DEFAULT_PAYMENT_WINDOW_HOURS;
}

export function addHours(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export { timeLeftLabel } from './time-left';
