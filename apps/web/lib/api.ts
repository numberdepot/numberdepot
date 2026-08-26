// ── Mock API Layer ──────────────────────────────────────────────────────────
// Intercepts all endpoints and returns dummy data. No backend needed.

import {
  MOCK_USERS,
  MOCK_NUMBERS,
  MOCK_AREA_CODES,
  MOCK_ORDERS,
  MOCK_SUBSCRIPTIONS,
  MOCK_OFFERS_SENT,
  MOCK_NOTIFICATIONS,
  MOCK_SELLER_DASHBOARD,
  MOCK_SELLER_SALES,
  MOCK_OFFERS_RECEIVED,
  MOCK_COMMISSIONS_SUMMARY,
  MOCK_COMMISSIONS,
  MOCK_PAYOUTS,
  MOCK_BROKER_PROFILE,
  MOCK_OWNED_NUMBERS,
  MOCK_ADMIN_DASHBOARD,
  MOCK_ALL_USERS,
  MOCK_BROKER_APPLICATIONS,
  MOCK_ADMIN_COMMISSIONS_SUMMARY,
  MOCK_ADMIN_COMMISSIONS,
  MOCK_ADMIN_SETTINGS,
} from './mock-data';

// ── Types ───────────────────────────────────────────────────────────────────

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

function ok<T>(data: T, pagination?: ApiResponse['pagination']): ApiResponse<T> {
  return { success: true, data, ...(pagination ? { pagination } : {}) };
}

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    pagination: { page, limit, total, totalPages },
  };
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function currentUser() {
  const token = getToken();
  if (!token) return null;
  return MOCK_USERS.find((u) => u.id === token) || null;
}

// ── Cart (localStorage) ─────────────────────────────────────────────────────

interface CartItem {
  id: string;
  phoneNumberId: string;
  listingId: string;
  number: string;
  numberType: string;
  price: number;
  planType: string;
  setupFee: number;
  monthlyFee: number;
  sellerId: string | null;
  isAdminNumber: boolean;
}

function getCart(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem('mock_cart') || '[]');
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  localStorage.setItem('mock_cart', JSON.stringify(items));
}

// ── Route Handler ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRoute(method: string, endpoint: string, body?: any): Promise<ApiResponse<any>> {
  await delay(150 + Math.random() * 100);

  // Parse endpoint and query params
  const [path, queryString] = endpoint.split('?');
  const params = new URLSearchParams(queryString || '');
  const segments = path.split('/').filter(Boolean);

  // ── AUTH ─────────────────────────────────────────────────────────────────
  if (path === '/auth/login' && method === 'POST') {
    const user = MOCK_USERS.find((u) => u.email === body?.email && u.password === body?.password);
    if (!user) throw new ApiError('Invalid email or password', 401);
    const { password: _p, ...userData } = user;
    return ok({ user: userData, token: user.id, refreshToken: `refresh_${user.id}` });
  }

  if (path === '/auth/register' && method === 'POST') {
    const newUser = {
      id: `usr_new_${Date.now()}`,
      email: body?.email || '',
      firstName: body?.firstName || '',
      lastName: body?.lastName || '',
      role: 'buyer' as const,
      status: 'active',
      phone: '',
      companyName: '',
      createdAt: new Date().toISOString(),
    };
    return ok({ user: newUser, token: newUser.id, refreshToken: `refresh_${newUser.id}` });
  }

  if (path === '/auth/logout' && method === 'POST') {
    return ok(null, undefined);
  }

  if (path === '/auth/forgot-password' && method === 'POST') {
    return ok(null, undefined);
  }

  if (path === '/auth/admin-setup' && method === 'POST') {
    const admin = MOCK_USERS.find((u) => u.role === 'admin')!;
    const { password: _p, ...userData } = admin;
    return ok({ user: userData, token: admin.id, refreshToken: `refresh_${admin.id}` });
  }

  // ── USERS ───────────────────────────────────────────────────────────────
  if (path === '/users/me' && method === 'GET') {
    const user = currentUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const { password: _p, ...userData } = user;
    return ok(userData);
  }

  if (path === '/users/me' && method === 'PUT') {
    const user = currentUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const { password: _p, ...userData } = user;
    return ok({ ...userData, ...body });
  }

  if (path === '/users/me/password' && method === 'PUT') {
    return ok({ message: 'Password updated successfully' });
  }

  if (path === '/users' && method === 'GET') {
    let users = [...MOCK_ALL_USERS];
    const role = params.get('role');
    const status = params.get('status');
    const search = params.get('search');
    if (role) users = users.filter((u) => u.role === role);
    if (status) users = users.filter((u) => u.status === status);
    if (search) {
      const s = search.toLowerCase();
      users = users.filter((u) => u.email.toLowerCase().includes(s) || u.firstName.toLowerCase().includes(s) || u.lastName.toLowerCase().includes(s));
    }
    const pg = paginate(users, Number(params.get('page') || 1), Number(params.get('limit') || 10));
    return ok(pg.items, pg.pagination);
  }

  // /users/:id/status
  if (segments[0] === 'users' && segments[2] === 'status' && method === 'PUT') {
    return ok({ message: 'User status updated' });
  }

  // ── SEARCH ──────────────────────────────────────────────────────────────
  if (path === '/search' && method === 'GET') {
    let results = MOCK_NUMBERS.filter((n) => n.status === 'available');
    const q = params.get('q');
    const areaCode = params.get('area_code');
    const numberType = params.get('number_type');
    const priceMin = params.get('price_min');
    const priceMax = params.get('price_max');
    const sort = params.get('sort') || 'price_asc';

    if (q) {
      const ql = q.toLowerCase();
      results = results.filter((n) =>
        n.number.includes(ql) || (n.vanityText && n.vanityText.toLowerCase().includes(ql)) || n.areaCode.includes(ql)
      );
    }
    if (areaCode) results = results.filter((n) => n.areaCode === areaCode);
    if (numberType) results = results.filter((n) => n.numberType === numberType);
    if (priceMin) results = results.filter((n) => n.salePrice >= Number(priceMin));
    if (priceMax) results = results.filter((n) => n.salePrice <= Number(priceMax));

    switch (sort) {
      case 'price_asc': results.sort((a, b) => a.salePrice - b.salePrice); break;
      case 'price_desc': results.sort((a, b) => b.salePrice - a.salePrice); break;
      case 'featured': results.sort((a, b) => (b.isPremium ? 1 : 0) - (a.isPremium ? 1 : 0)); break;
      case 'newest': results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
    }

    const pg = paginate(results, Number(params.get('page') || 1), Number(params.get('limit') || 20));
    return ok(pg.items, pg.pagination);
  }

  // ── NUMBERS ─────────────────────────────────────────────────────────────
  if (path === '/numbers/area-codes' && method === 'GET') {
    return ok(MOCK_AREA_CODES);
  }

  // /numbers?limit=X&sort=featured (featured numbers for home page)
  if (path === '/numbers' && method === 'GET') {
    const limit = Number(params.get('limit') || 8);
    const sort = params.get('sort');
    let nums = MOCK_NUMBERS.filter((n) => n.status === 'available');
    if (sort === 'featured') nums = nums.filter((n) => n.isPremium);
    return ok(nums.slice(0, limit));
  }

  // /numbers/my (seller inventory)
  if (path === '/numbers/my' && method === 'GET') {
    const user = currentUser();
    if (!user) throw new ApiError('Unauthorized', 401);
    const nums = MOCK_NUMBERS.filter((n) => n.sellerId === user.id);
    return ok(nums);
  }

  // /numbers/seller (POST — add listing)
  if (path === '/numbers/seller' && method === 'POST') {
    return ok({ id: `num_new_${Date.now()}`, ...body, status: 'pending', createdAt: new Date().toISOString() });
  }

  // /numbers/seller/:id (PUT — update listing)
  if (segments[0] === 'numbers' && segments[1] === 'seller' && segments.length === 3 && method === 'PUT') {
    return ok({ message: 'Number updated' });
  }

  // /numbers/seller/:id (DELETE — delist)
  if (segments[0] === 'numbers' && segments[1] === 'seller' && segments.length === 3 && method === 'DELETE') {
    return ok({ message: 'Number delisted' });
  }

  // /numbers/admin/all (admin list)
  if (path === '/numbers/admin/all' && method === 'GET') {
    let nums = [...MOCK_NUMBERS];
    const source = params.get('source');
    const status = params.get('status');
    if (source) nums = nums.filter((n) => n.source === source);
    if (status) nums = nums.filter((n) => n.status === status);
    const pg = paginate(nums, Number(params.get('page') || 1), Number(params.get('limit') || 20));
    return ok(pg.items, pg.pagination);
  }

  // /numbers/admin (POST — admin add)
  if (path === '/numbers/admin' && method === 'POST') {
    return ok({ id: `num_adm_${Date.now()}`, ...body, source: 'admin', status: 'available', createdAt: new Date().toISOString() });
  }

  // /numbers/admin/:id (PUT)
  if (segments[0] === 'numbers' && segments[1] === 'admin' && segments.length === 3 && method === 'PUT') {
    return ok({ message: 'Number updated' });
  }

  // /numbers/admin/:id (DELETE)
  if (segments[0] === 'numbers' && segments[1] === 'admin' && segments.length === 3 && method === 'DELETE') {
    return ok({ message: 'Number deleted' });
  }

  // /numbers/:id (single number detail)
  if (segments[0] === 'numbers' && segments.length === 2 && method === 'GET') {
    const num = MOCK_NUMBERS.find((n) => n.id === segments[1]);
    if (!num) throw new ApiError('Number not found', 404);
    return ok({
      ...num,
      seller: num.sellerId
        ? { firstName: 'Morgan', lastName: 'Rivera', companyName: 'Rivera Telecom LLC' }
        : null,
    });
  }

  // ── CART ────────────────────────────────────────────────────────────────
  if (path === '/orders/cart' && method === 'GET') {
    return ok(getCart());
  }

  if (path === '/orders/cart/items' && method === 'POST') {
    const cart = getCart();
    const num = MOCK_NUMBERS.find((n) => n.id === body?.phoneNumberId);
    if (!num) throw new ApiError('Number not found', 404);
    const item: CartItem = {
      id: `ci_${Date.now()}`,
      phoneNumberId: num.id,
      listingId: num.listingId,
      number: num.number,
      numberType: num.numberType,
      price: body?.planType === 'license' ? num.licensePrice : num.salePrice,
      planType: body?.planType || 'purchase',
      setupFee: 9.99,
      monthlyFee: num.monthlyPrice,
      sellerId: num.sellerId,
      isAdminNumber: num.source === 'admin',
    };
    cart.push(item);
    saveCart(cart);
    return ok(item);
  }

  // /orders/cart/items/:id (DELETE)
  if (segments[0] === 'orders' && segments[1] === 'cart' && segments[2] === 'items' && segments.length === 4 && method === 'DELETE') {
    const cart = getCart().filter((i) => i.id !== segments[3]);
    saveCart(cart);
    return ok({ message: 'Item removed' });
  }

  if (path === '/orders/cart' && method === 'DELETE') {
    saveCart([]);
    return ok({ message: 'Cart cleared' });
  }

  // ── ORDERS ──────────────────────────────────────────────────────────────
  if (path === '/orders' && method === 'POST') {
    const cart = getCart();
    const order = {
      id: `ord_${Date.now()}`,
      orderNumber: `ND-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(Math.random() * 999).toString().padStart(3, '0')}`,
      status: 'pending',
      totalAmount: cart.reduce((s, i) => s + i.price + i.setupFee, 0),
      items: cart,
    };
    saveCart([]);
    return ok(order);
  }

  // /orders/:id/pay
  if (segments[0] === 'orders' && segments[2] === 'pay' && method === 'POST') {
    return ok({ message: 'Payment processed', status: 'completed' });
  }

  if (path === '/orders' && method === 'GET') {
    const pg = paginate(MOCK_ORDERS, Number(params.get('page') || 1), Number(params.get('limit') || 10));
    return ok(pg.items, pg.pagination);
  }

  // /orders/admin/all
  if (path === '/orders/admin/all' && method === 'GET') {
    let orders = [...MOCK_ORDERS];
    const status = params.get('status');
    if (status) orders = orders.filter((o) => o.status === status);
    const pg = paginate(orders, Number(params.get('page') || 1), Number(params.get('limit') || 20));
    return ok(pg.items, pg.pagination);
  }

  // ── OFFERS ──────────────────────────────────────────────────────────────
  if (path === '/offers' && method === 'POST') {
    return ok({
      id: `off_${Date.now()}`,
      ...body,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
  }

  if (path === '/offers/sent' && method === 'GET') {
    return ok(MOCK_OFFERS_SENT);
  }

  if (path === '/offers/received' && method === 'GET') {
    return ok(MOCK_OFFERS_RECEIVED);
  }

  // /offers/:id/cancel
  if (segments[0] === 'offers' && segments[2] === 'cancel' && method === 'PUT') {
    return ok({ message: 'Offer cancelled' });
  }

  // /offers/:id/accept
  if (segments[0] === 'offers' && segments[2] === 'accept' && method === 'PUT') {
    return ok({ message: 'Offer accepted' });
  }

  // /offers/:id/decline
  if (segments[0] === 'offers' && segments[2] === 'decline' && method === 'PUT') {
    return ok({ message: 'Offer declined' });
  }

  // /offers/:id/counter
  if (segments[0] === 'offers' && segments[2] === 'counter' && method === 'PUT') {
    return ok({ message: 'Counter offer sent' });
  }

  // ── NOTIFICATIONS ───────────────────────────────────────────────────────
  if (path === '/notifications' && method === 'GET') {
    return ok(MOCK_NOTIFICATIONS);
  }

  if (path === '/notifications/read-all' && method === 'PUT') {
    return ok({ message: 'All notifications marked as read' });
  }

  // ── SUBSCRIPTIONS / BILLING ─────────────────────────────────────────────
  if (path === '/billing/subscriptions' && method === 'GET') {
    return ok(MOCK_SUBSCRIPTIONS);
  }

  // /billing/subscriptions/:id/plan
  if (segments[0] === 'billing' && segments[1] === 'subscriptions' && segments[3] === 'plan' && method === 'PUT') {
    return ok({ message: 'Plan updated' });
  }

  // /billing/subscriptions/:id/cancel
  if (segments[0] === 'billing' && segments[1] === 'subscriptions' && segments[3] === 'cancel' && method === 'PUT') {
    return ok({ message: 'Subscription cancelled' });
  }

  // ── BROKER / SELLER ─────────────────────────────────────────────────────
  if (path === '/broker/apply' && method === 'POST') {
    return ok({ message: 'Application submitted successfully' });
  }

  if (path === '/broker/dashboard' && method === 'GET') {
    return ok(MOCK_SELLER_DASHBOARD);
  }

  if (path === '/broker/profile' && method === 'GET') {
    return ok(MOCK_BROKER_PROFILE);
  }

  if (path === '/broker/profile' && method === 'PUT') {
    return ok({ ...MOCK_BROKER_PROFILE, ...body });
  }

  if (path === '/broker/sales' && method === 'GET') {
    return ok(MOCK_SELLER_SALES);
  }

  if (path === '/broker/payouts' && method === 'GET') {
    return ok(MOCK_PAYOUTS);
  }

  if (path === '/broker/payout' && method === 'POST') {
    return ok({
      id: `pay_${Date.now()}`,
      amount: body?.amount || 0,
      method: body?.method || 'bank_transfer',
      status: 'processing',
      reference: `PAY-${Date.now()}`,
      requestedAt: new Date().toISOString(),
      processedAt: null,
      completedAt: null,
    });
  }

  // ── COMMISSIONS ─────────────────────────────────────────────────────────
  if (path === '/commissions/summary' && method === 'GET') {
    return ok(MOCK_COMMISSIONS_SUMMARY);
  }

  if (path === '/commissions' && method === 'GET') {
    let comms = [...MOCK_COMMISSIONS];
    const status = params.get('status');
    if (status) comms = comms.filter((c) => c.status === status);
    const pg = paginate(comms, Number(params.get('page') || 1), Number(params.get('limit') || 10));
    return ok(pg.items, pg.pagination);
  }

  if (path === '/commissions/admin/summary' && method === 'GET') {
    return ok(MOCK_ADMIN_COMMISSIONS_SUMMARY);
  }

  if (path === '/commissions/admin' && method === 'GET') {
    let comms = [...MOCK_ADMIN_COMMISSIONS];
    const status = params.get('status');
    if (status) comms = comms.filter((c) => c.status === status);
    const pg = paginate(comms, Number(params.get('page') || 1), Number(params.get('limit') || 20));
    return ok(pg.items, pg.pagination);
  }

  // ── ADMIN ───────────────────────────────────────────────────────────────
  if (path === '/admin/dashboard' && method === 'GET') {
    return ok(MOCK_ADMIN_DASHBOARD);
  }

  if (path === '/admin/settings' && method === 'GET') {
    return ok(MOCK_ADMIN_SETTINGS);
  }

  if (path === '/admin/settings' && method === 'PUT') {
    Object.assign(MOCK_ADMIN_SETTINGS, body);
    return ok(MOCK_ADMIN_SETTINGS);
  }

  if (path === '/admin/broker-applications' && method === 'GET') {
    let apps = [...MOCK_BROKER_APPLICATIONS];
    const status = params.get('status');
    if (status) apps = apps.filter((a) => a.status === status);
    return ok(apps);
  }

  // /admin/broker-applications/:id
  if (segments[0] === 'admin' && segments[1] === 'broker-applications' && segments.length === 3 && method === 'PUT') {
    return ok({ message: 'Application updated' });
  }

  // ── ACCOUNT NUMBERS (owned numbers for My Numbers pages) ────────────────
  if (path === '/account/numbers' && method === 'GET') {
    return ok(MOCK_OWNED_NUMBERS);
  }

  // /account/numbers/:id
  if (segments[0] === 'account' && segments[1] === 'numbers' && segments.length === 3 && method === 'GET') {
    const owned = MOCK_OWNED_NUMBERS.find((n) => n.id === segments[2]);
    if (!owned) throw new ApiError('Number not found', 404);
    return ok(owned);
  }

  // /account/numbers/:id (PUT — update forwarding, voicemail, etc.)
  if (segments[0] === 'account' && segments[1] === 'numbers' && segments.length === 3 && method === 'PUT') {
    return ok({ message: 'Number settings updated' });
  }

  // ── FALLBACK ────────────────────────────────────────────────────────────
  console.warn(`[MockAPI] Unhandled: ${method} ${endpoint}`);
  return ok(null);
}

// ── Real API call (for auth endpoints) ──────────────────────────────────────

async function realApiCall<T>(method: string, endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`/api${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.error || 'Request failed', res.status, data);
  }

  // Normalize response shape for auth endpoints
  if (endpoint === '/auth/login' && data.token) {
    return { success: true, data: { user: data.user, token: data.token, refreshToken: `refresh_${data.token}` } as T };
  }
  if (endpoint === '/users/me' && data.user) {
    return { success: true, data: data.user as T };
  }

  // Normalize standard API response shape
  if (data.success !== undefined) {
    return data as ApiResponse<T>;
  }
  return { success: true, data: data as T };
}

// ── Public API (same interface as original) ─────────────────────────────────

interface ApiOptions extends RequestInit {
  token?: string;
}

/**
 * Endpoints that must NEVER fall through to the mock layer.
 *
 * The mock handler answers unknown routes with `ok(null)` — a *successful*
 * response. For anything that moves money or inventory that is catastrophic: a
 * 500 from the pay route would surface to the user as "Payment successful"
 * while no charge ever happened. These endpoints fail loudly instead.
 */
const NO_MOCK_FALLBACK = ['/orders', '/payments', '/cart'];

function allowsMockFallback(endpoint: string): boolean {
  const path = endpoint.split('?')[0];
  return !NO_MOCK_FALLBACK.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

async function request<T>(endpoint: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
  const method = options.method || 'GET';
  let body: unknown = undefined;
  if (options.body && typeof options.body === 'string') {
    try { body = JSON.parse(options.body); } catch { body = options.body; }
  }

  // Always try real API first, fall back to mock on server errors
  try {
    return await realApiCall<T>(method, endpoint, body);
  } catch (err) {
    // If it's a clear client error (4xx), don't fall back to mock
    if (err instanceof ApiError && err.status < 500) {
      throw err;
    }
    if (!allowsMockFallback(endpoint)) {
      throw err;
    }
    // Server error or network error — fall back to mock
    console.warn('[API] Real API failed, falling back to mock:', (err as Error).message);
  }

  return handleRoute(method, endpoint, body) as Promise<ApiResponse<T>>;
}

export const api = {
  get: <T>(endpoint: string, opts?: ApiOptions) => request<T>(endpoint, { ...opts, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, opts?: ApiOptions) =>
    request<T>(endpoint, { ...opts, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: unknown, opts?: ApiOptions) =>
    request<T>(endpoint, { ...opts, method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(endpoint: string, opts?: ApiOptions) => request<T>(endpoint, { ...opts, method: 'DELETE' }),
};

export { ApiError };
export type { ApiResponse };
