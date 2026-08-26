import { getSettingsCollection } from './collections';

const NUMBERBARN_BASE_URL = 'https://www.numberbarn.com/api';
const DEFAULT_MARKUP = 15; // percent

async function getToken(): Promise<string> {
  // 1. Check env first (fastest)
  if (process.env.NUMBERBARN_API_TOKEN) return process.env.NUMBERBARN_API_TOKEN;

  // 2. Fallback to DB settings (admin can set from panel)
  try {
    const settings = await getSettingsCollection();
    const doc = await settings.findOne({ key: 'numberbarnApiToken' });
    if (doc?.value && typeof doc.value === 'string') return doc.value;
  } catch {
    // ignore
  }
  return '';
}

// Simple in-memory cache with 5-min TTL
const cache = new Map<string, { data: unknown; expiresAt: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, expiresAt: Date.now() + 5 * 60 * 1000 });
}

async function getMarkup(): Promise<number> {
  try {
    const envMarkup = process.env.NUMBERBARN_MARKUP;
    if (envMarkup) return parseFloat(envMarkup);

    const settings = await getSettingsCollection();
    const doc = await settings.findOne({ key: 'numberbarnMarkup' });
    if (doc?.value && typeof doc.value === 'number') return doc.value;
  } catch {
    // Fall through to default
  }
  return DEFAULT_MARKUP;
}

function applyMarkup(priceInCents: number, markupPercent: number): number {
  return Math.round(priceInCents * (1 + markupPercent / 100));
}

interface NumberBarnNumber {
  tn: string;
  formattedTn: string;
  localizedTn?: string;
  npa: string;
  type: string;
  state?: string;
  country?: string;
  city?: string;
  rateCenter?: string;
  pattern?: string[];
  price: number; // cents
  retailPrice?: number;
  isForSale?: boolean;
  isForLicense?: boolean;
  isNegotiable?: boolean;
  fulfillmentDays?: number;
  score?: number;
}

interface NumberBarnSearchParams {
  npa?: string;
  search?: string;
  limit?: number;
  skip?: number;
  priceMin?: number;
  priceMax?: number;
}

async function nbFetch<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  const token = await getToken();

  const url = new URL(`${NUMBERBARN_BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) url.searchParams.set(k, v);
    }
  }

  try {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      console.error(`[NumberBarn] API error ${res.status}: ${await res.text()}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    console.error('[NumberBarn] Fetch failed:', err);
    return null;
  }
}

export async function searchNumbers(params: NumberBarnSearchParams) {
  const cacheKey = `search:${JSON.stringify(params)}`;
  const cached = getCached<NumberBarnNumber[]>(cacheKey);
  if (cached) return cached;

  const queryParams: Record<string, string> = {};
  if (params.npa) queryParams.npa = params.npa;
  if (params.search) queryParams.search = params.search;
  if (params.limit) queryParams['$limit'] = String(params.limit);
  if (params.skip) queryParams['$skip'] = String(params.skip);
  if (params.priceMin) queryParams['price[$gte]'] = String(params.priceMin);
  if (params.priceMax) queryParams['price[$lte]'] = String(params.priceMax);

  const data = await nbFetch<{ data?: NumberBarnNumber[]; numbers?: NumberBarnNumber[] }>('/availableNumbers', queryParams);
  const numbers = data?.data || data?.numbers || [];
  setCache(cacheKey, numbers);
  return numbers;
}

export async function getNumberInfo(tn: string): Promise<NumberBarnNumber | null> {
  const cacheKey = `info:${tn}`;
  const cached = getCached<NumberBarnNumber>(cacheKey);
  if (cached) return cached;

  const data = await nbFetch<{ data?: NumberBarnNumber[]; numbers?: NumberBarnNumber[] }>('/availableNumbers', { tn });
  const num = data?.data?.[0] || data?.numbers?.[0] || null;
  if (num) setCache(cacheKey, num);
  return num;
}

/**
 * Server-to-server purchase is NOT possible with NumberBarn's public API.
 *
 * Their documented surface covers search, listings, brokerage, number
 * management, offers and messaging — there is no cart, order or checkout
 * endpoint. An earlier version of this file posted to `/api/purchaseNumber`,
 * which returns HTTP 404; worse, it swallowed the failure and the order was
 * still marked complete, so a buyer could pay for a number they never received.
 *
 * NumberBarn numbers are therefore fulfilled by an admin (see the fulfilment
 * queue at /admin/fulfillment). If a wholesale/white-label ordering agreement
 * is signed later, implement it here and flip
 * `numberBarnAutoPurchaseAvailable()` to true — the pay route will pick it up
 * without any other change.
 */
export function numberBarnAutoPurchaseAvailable(): boolean {
  return false;
}

export async function purchaseNumber(
  tn: string
): Promise<{ success: false; error: string }> {
  console.warn(
    `[NumberBarn] Refusing to auto-purchase ${tn} — NumberBarn's public API has no purchase endpoint. Fulfil this order manually.`
  );
  return {
    success: false,
    error: 'NumberBarn does not expose a purchase API — this number must be fulfilled manually',
  };
}

/** Reads the admin-configured fees through the shared canonical loader. */
async function getDisplayFees(): Promise<{ setupFee: number; monthlyPrice: number }> {
  try {
    const { getFees } = await import('./utils/fees');
    const fees = await getFees();
    const setup = fees.find((f) => f.id === 'setup_fee');
    const monthly = fees.find((f) => f.id === 'first_month' || f.id.includes('month'));
    return {
      setupFee: setup?.amount ?? 0,
      monthlyPrice: monthly?.amount ?? 0,
    };
  } catch {
    return { setupFee: 0, monthlyPrice: 0 };
  }
}

/** Convert a NumberBarn number to our frontend format with markup applied */
export async function toOurFormat(nb: NumberBarnNumber) {
  const [markup, fees] = await Promise.all([getMarkup(), getDisplayFees()]);
  const markedUpPrice = applyMarkup(nb.price, markup);

  return {
    id: `nb_${nb.tn}`,
    number: nb.formattedTn || formatTn(nb.tn),
    rawNumber: nb.tn,
    countryCode: '1',
    areaCode: nb.npa || nb.tn.slice(0, 3),
    numberType: (nb.type === 'tollfree' ? 'toll_free' : 'local') as 'local' | 'toll_free' | 'vanity',
    vanityText: null,
    salePrice: markedUpPrice / 100,
    basePrice: markedUpPrice / 100,
    licensePrice: markedUpPrice / 100,
    monthlyPrice: fees.monthlyPrice,
    setupFee: fees.setupFee,
    source: 'numberbarn' as const,
    status: 'available',
    isVanity: false,
    isPremium: nb.price > 5000, // >$50
    isPortable: true,
    features: ['Call Forwarding', 'Voicemail'],
    description: nb.city || 'Available via NumberBarn',
    listingId: `lst_nb_${nb.tn}`,
    listingType: 'sale',
    allowOffers: false,
    minimumOffer: 0,
    sellerId: null,
    createdAt: new Date().toISOString(),
    reservedUntil: null,
    fulfillmentDays: nb.fulfillmentDays || 3,
    numberbarnTn: nb.tn,
  };
}

function formatTn(tn: string): string {
  const d = tn.startsWith('1') ? tn.slice(1) : tn;
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return tn;
}
