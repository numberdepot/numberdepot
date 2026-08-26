import { getSettingsCollection } from '../collections';

/** A configurable checkout fee, as stored in settings under the `fees` key. */
export interface FeeItem {
  id: string;
  label: string;
  amount: number; // dollars
  perItem: boolean; // true = charged once per number, false = once per order
}

/**
 * Canonical reader for the admin-configured checkout fees.
 *
 * Handles the legacy object shape ({ setupFee, monthlyPrice }) as well as the
 * current array shape, so every caller — the admin fees route, the cart, and
 * the order pricer — agrees on exactly one list.
 */
export async function getFees(): Promise<FeeItem[]> {
  try {
    const col = await getSettingsCollection();
    const doc = await col.findOne({ key: 'fees' });
    const value = doc?.value;

    if (Array.isArray(value)) {
      return (value as FeeItem[])
        .map((f) => ({
          id: String(f.id || '').trim(),
          label: String(f.label || '').trim(),
          amount: Number(f.amount) || 0,
          perItem: !!f.perItem,
        }))
        .filter((f) => f.id && f.label);
    }

    if (value && typeof value === 'object') {
      const legacy = value as { setupFee?: number; monthlyPrice?: number };
      return [
        { id: 'setup_fee', label: 'Setup Fee', amount: Number(legacy.setupFee) || 0, perItem: true },
        { id: 'first_month', label: 'First Month Service', amount: Number(legacy.monthlyPrice) || 0, perItem: true },
      ].filter((f) => f.amount > 0);
    }
  } catch (err) {
    // A settings read failure must not silently produce a cheaper order, so
    // surface it rather than quietly returning an empty fee list.
    throw new Error(`Could not load checkout fees: ${err instanceof Error ? err.message : String(err)}`);
  }

  return [];
}
