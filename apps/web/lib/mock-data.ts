// ── Mock Data for NumberDepot Frontend ──────────────────────────────────────

// ── Users ───────────────────────────────────────────────────────────────────
export const MOCK_USERS = [
  {
    id: 'usr_buyer_001',
    email: 'buyer@test.com',
    password: 'password123',
    firstName: 'Alex',
    lastName: 'Thompson',
    role: 'buyer' as const,
    status: 'active',
    phone: '(212) 555-0100',
    companyName: '',
    createdAt: '2024-08-15T10:30:00Z',
  },
  {
    id: 'usr_seller_001',
    email: 'seller@test.com',
    password: 'password123',
    firstName: 'Morgan',
    lastName: 'Rivera',
    role: 'seller' as const,
    status: 'active',
    phone: '(310) 555-0200',
    companyName: 'Rivera Telecom LLC',
    createdAt: '2024-03-22T14:00:00Z',
  },
  {
    id: 'usr_admin_001',
    email: 'admin@test.com',
    password: 'password123',
    firstName: 'Jordan',
    lastName: 'Chen',
    role: 'admin' as const,
    status: 'active',
    phone: '(415) 555-0300',
    companyName: 'NumberDepot Inc.',
    createdAt: '2023-11-01T08:00:00Z',
  },
];

// ── Phone Numbers (85+) ────────────────────────────────────────────────────

function n(
  id: string, number: string, areaCode: string, numberType: string,
  salePrice: number, licensePrice: number, monthlyPrice: number,
  opts: { vanityText?: string; isPremium?: boolean; isPortable?: boolean; description?: string; sellerId?: string; source?: string; status?: string; allowOffers?: boolean; minimumOffer?: number; features?: string[] } = {}
) {
  return {
    id,
    number,
    countryCode: '1',
    areaCode,
    numberType,
    vanityText: opts.vanityText || null,
    basePrice: salePrice,
    salePrice,
    licensePrice,
    monthlyPrice,
    listingType: salePrice > 0 ? 'sale' : 'license',
    isVanity: !!opts.vanityText,
    isPremium: opts.isPremium ?? false,
    isPortable: opts.isPortable ?? true,
    status: opts.status || 'available',
    description: opts.description || `Premium ${numberType} number in the ${areaCode} area code.`,
    sellerId: opts.sellerId || null,
    source: opts.source || 'admin',
    listingId: `lst_${id}`,
    allowOffers: opts.allowOffers ?? true,
    minimumOffer: opts.minimumOffer ?? Math.round(salePrice * 0.7),
    features: opts.features || ['Call Forwarding', 'Voicemail', 'Caller ID'],
    createdAt: '2024-06-01T12:00:00Z',
  };
}

export const MOCK_NUMBERS = [
  // ── Local Numbers (50) ──────────────────────────────────────────────────
  // 212 - New York
  n('num_001', '(212) 555-1000', '212', 'local', 299, 9.99, 9.99, { isPremium: true, description: 'Classic Manhattan number — perfect for NYC businesses.' }),
  n('num_002', '(212) 555-1234', '212', 'local', 499, 14.99, 14.99, { isPremium: true }),
  n('num_003', '(212) 555-7777', '212', 'local', 899, 19.99, 19.99, { isPremium: true, description: 'Repeating digits — highly memorable Manhattan number.' }),
  n('num_004', '(212) 555-2000', '212', 'local', 199, 7.99, 7.99),
  // 310 - Los Angeles
  n('num_005', '(310) 555-1001', '310', 'local', 249, 9.99, 9.99, { description: 'West LA / Beverly Hills area code.' }),
  n('num_006', '(310) 555-5500', '310', 'local', 349, 12.99, 12.99, { isPremium: true }),
  n('num_007', '(310) 555-8888', '310', 'local', 699, 14.99, 14.99, { isPremium: true }),
  n('num_008', '(310) 555-3030', '310', 'local', 179, 7.99, 7.99),
  // 415 - San Francisco
  n('num_009', '(415) 555-1002', '415', 'local', 279, 9.99, 9.99, { description: 'San Francisco tech hub number.' }),
  n('num_010', '(415) 555-4200', '415', 'local', 399, 12.99, 12.99, { isPremium: true }),
  n('num_011', '(415) 555-9999', '415', 'local', 999, 19.99, 19.99, { isPremium: true }),
  // 305 - Miami
  n('num_012', '(305) 555-1003', '305', 'local', 199, 7.99, 7.99, { description: 'Miami / South Florida number.' }),
  n('num_013', '(305) 555-6060', '305', 'local', 349, 12.99, 12.99, { isPremium: true }),
  n('num_014', '(305) 555-2525', '305', 'local', 249, 9.99, 9.99),
  // 702 - Las Vegas
  n('num_015', '(702) 555-1004', '702', 'local', 179, 7.99, 7.99, { description: 'Las Vegas area number.' }),
  n('num_016', '(702) 555-7770', '702', 'local', 599, 14.99, 14.99, { isPremium: true }),
  // 512 - Austin
  n('num_017', '(512) 555-1005', '512', 'local', 199, 7.99, 7.99, { description: 'Austin, TX tech corridor number.' }),
  n('num_018', '(512) 555-3000', '512', 'local', 249, 9.99, 9.99),
  // 617 - Boston
  n('num_019', '(617) 555-1006', '617', 'local', 229, 9.99, 9.99, { description: 'Boston / Cambridge area code.' }),
  n('num_020', '(617) 555-5000', '617', 'local', 399, 12.99, 12.99, { isPremium: true }),
  // 213 - Downtown LA
  n('num_021', '(213) 555-1007', '213', 'local', 199, 7.99, 7.99),
  n('num_022', '(213) 555-4444', '213', 'local', 449, 12.99, 12.99, { isPremium: true }),
  // 646 - NYC
  n('num_023', '(646) 555-1008', '646', 'local', 179, 7.99, 7.99),
  n('num_024', '(646) 555-2222', '646', 'local', 329, 12.99, 12.99, { isPremium: true }),
  // 917 - NYC Mobile
  n('num_025', '(917) 555-1009', '917', 'local', 149, 7.99, 7.99),
  n('num_026', '(917) 555-8000', '917', 'local', 249, 9.99, 9.99),
  // 347 - NYC
  n('num_027', '(347) 555-1010', '347', 'local', 129, 5.99, 5.99),
  n('num_028', '(347) 555-6666', '347', 'local', 299, 9.99, 9.99, { isPremium: true }),
  // 718 - Brooklyn / Queens
  n('num_029', '(718) 555-1011', '718', 'local', 149, 7.99, 7.99),
  n('num_030', '(718) 555-5050', '718', 'local', 229, 9.99, 9.99),
  // 516 - Long Island
  n('num_031', '(516) 555-1012', '516', 'local', 139, 5.99, 5.99),
  n('num_032', '(516) 555-3333', '516', 'local', 249, 9.99, 9.99, { isPremium: true }),
  // 201 - Northern NJ
  n('num_033', '(201) 555-1013', '201', 'local', 129, 5.99, 5.99),
  n('num_034', '(201) 555-9000', '201', 'local', 199, 7.99, 7.99),
  // 973 - Northern NJ
  n('num_035', '(973) 555-1014', '973', 'local', 119, 5.99, 5.99),
  n('num_036', '(973) 555-7500', '973', 'local', 179, 7.99, 7.99),
  // Additional area codes
  n('num_037', '(312) 555-1015', '312', 'local', 249, 9.99, 9.99, { description: 'Chicago downtown number.' }),
  n('num_038', '(404) 555-1016', '404', 'local', 199, 7.99, 7.99, { description: 'Atlanta area code.' }),
  n('num_039', '(469) 555-1017', '469', 'local', 149, 5.99, 5.99, { description: 'Dallas / Fort Worth area.' }),
  n('num_040', '(602) 555-1018', '602', 'local', 139, 5.99, 5.99, { description: 'Phoenix metro area code.' }),
  n('num_041', '(206) 555-1019', '206', 'local', 229, 9.99, 9.99, { description: 'Seattle area code.' }),
  n('num_042', '(303) 555-1020', '303', 'local', 179, 7.99, 7.99, { description: 'Denver / Boulder area.' }),
  n('num_043', '(503) 555-1021', '503', 'local', 169, 7.99, 7.99, { description: 'Portland, OR area code.' }),
  n('num_044', '(704) 555-1022', '704', 'local', 149, 5.99, 5.99, { description: 'Charlotte, NC area code.' }),
  n('num_045', '(615) 555-1023', '615', 'local', 199, 7.99, 7.99, { description: 'Nashville, TN area code.' }),
  n('num_046', '(813) 555-1024', '813', 'local', 139, 5.99, 5.99, { description: 'Tampa, FL area code.' }),
  n('num_047', '(619) 555-1025', '619', 'local', 169, 7.99, 7.99, { description: 'San Diego area code.' }),
  n('num_048', '(720) 555-1026', '720', 'local', 149, 5.99, 5.99, { description: 'Denver metro overlay.' }),
  n('num_049', '(818) 555-1027', '818', 'local', 199, 7.99, 7.99, { description: 'San Fernando Valley, CA.' }),
  n('num_050', '(954) 555-1028', '954', 'local', 149, 5.99, 5.99, { description: 'Fort Lauderdale, FL.' }),

  // ── Toll-Free Numbers (20) ──────────────────────────────────────────────
  n('num_051', '(800) 555-0001', '800', 'toll_free', 599, 19.99, 19.99, { isPremium: true, description: 'Classic 800 toll-free number.' }),
  n('num_052', '(800) 555-0002', '800', 'toll_free', 499, 14.99, 14.99),
  n('num_053', '(800) 555-1100', '800', 'toll_free', 399, 12.99, 12.99),
  n('num_054', '(800) 555-2200', '800', 'toll_free', 349, 12.99, 12.99),
  n('num_055', '(888) 555-0001', '888', 'toll_free', 449, 14.99, 14.99, { isPremium: true }),
  n('num_056', '(888) 555-0002', '888', 'toll_free', 349, 12.99, 12.99),
  n('num_057', '(888) 555-3300', '888', 'toll_free', 299, 9.99, 9.99),
  n('num_058', '(877) 555-0001', '877', 'toll_free', 399, 12.99, 12.99),
  n('num_059', '(877) 555-0002', '877', 'toll_free', 299, 9.99, 9.99),
  n('num_060', '(877) 555-4400', '877', 'toll_free', 249, 9.99, 9.99),
  n('num_061', '(866) 555-0001', '866', 'toll_free', 349, 12.99, 12.99),
  n('num_062', '(866) 555-0002', '866', 'toll_free', 249, 9.99, 9.99),
  n('num_063', '(866) 555-5500', '866', 'toll_free', 199, 7.99, 7.99),
  n('num_064', '(855) 555-0001', '855', 'toll_free', 299, 9.99, 9.99),
  n('num_065', '(855) 555-0002', '855', 'toll_free', 199, 7.99, 7.99),
  n('num_066', '(855) 555-6600', '855', 'toll_free', 179, 7.99, 7.99),
  n('num_067', '(844) 555-0001', '844', 'toll_free', 249, 9.99, 9.99),
  n('num_068', '(844) 555-0002', '844', 'toll_free', 179, 7.99, 7.99),
  n('num_069', '(833) 555-0001', '833', 'toll_free', 199, 7.99, 7.99),
  n('num_070', '(833) 555-0002', '833', 'toll_free', 149, 5.99, 5.99),

  // ── Vanity Numbers (15) ─────────────────────────────────────────────────
  n('num_071', '(800) 356-9377', '800', 'vanity', 4999, 49.99, 49.99, { vanityText: '1-800-FLOWERS', isPremium: true, description: 'Ultra-premium vanity number — instantly recognizable.' }),
  n('num_072', '(888) 639-2277', '888', 'vanity', 2999, 39.99, 39.99, { vanityText: '1-888-NEW-CARS', isPremium: true }),
  n('num_073', '(800) 466-3337', '800', 'vanity', 1999, 29.99, 29.99, { vanityText: '1-800-GOOD-EATS', isPremium: true }),
  n('num_074', '(877) 529-9377', '877', 'vanity', 1499, 24.99, 24.99, { vanityText: '1-877-LAWYERS', isPremium: true }),
  n('num_075', '(888) 468-3533', '888', 'vanity', 1299, 24.99, 24.99, { vanityText: '1-888-HOTELS', isPremium: true }),
  n('num_076', '(800) 738-7669', '800', 'vanity', 1799, 29.99, 29.99, { vanityText: '1-800-PET-SPOO', isPremium: true }),
  n('num_077', '(866) 346-2537', '866', 'vanity', 999, 19.99, 19.99, { vanityText: '1-866-FIN-ACES' }),
  n('num_078', '(855) 766-3464', '855', 'vanity', 899, 19.99, 19.99, { vanityText: '1-855-ROOFING' }),
  n('num_079', '(844) 732-5847', '844', 'vanity', 799, 14.99, 14.99, { vanityText: '1-844-REALTOR' }),
  n('num_080', '(833) 762-5847', '833', 'vanity', 699, 14.99, 14.99, { vanityText: '1-833-SOLAR' }),
  n('num_081', '(800) 288-6669', '800', 'vanity', 2499, 34.99, 34.99, { vanityText: '1-800-AUTO-NOW', isPremium: true }),
  n('num_082', '(888) 227-3669', '888', 'vanity', 1599, 24.99, 24.99, { vanityText: '1-888-CARE-NOW', isPremium: true }),
  n('num_083', '(877) 468-3525', '877', 'vanity', 1199, 19.99, 19.99, { vanityText: '1-877-HOT-DEAL' }),
  n('num_084', '(866) 732-5847', '866', 'vanity', 899, 14.99, 14.99, { vanityText: '1-866-REALTOR' }),
  n('num_085', '(855) 462-6377', '855', 'vanity', 749, 14.99, 14.99, { vanityText: '1-855-HOME-OPS' }),

  // ── Seller-owned numbers (10) ────────────────────────────────────────────
  n('num_s01', '(212) 555-8001', '212', 'local', 349, 12.99, 12.99, { sellerId: 'usr_seller_001', source: 'seller', status: 'available' }),
  n('num_s02', '(310) 555-8002', '310', 'local', 279, 9.99, 9.99, { sellerId: 'usr_seller_001', source: 'seller', status: 'available' }),
  n('num_s03', '(800) 555-8003', '800', 'toll_free', 599, 19.99, 19.99, { sellerId: 'usr_seller_001', source: 'seller', status: 'available', isPremium: true }),
  n('num_s04', '(888) 555-8004', '888', 'toll_free', 449, 14.99, 14.99, { sellerId: 'usr_seller_001', source: 'seller', status: 'available' }),
  n('num_s05', '(415) 555-8005', '415', 'local', 299, 9.99, 9.99, { sellerId: 'usr_seller_001', source: 'seller', status: 'available' }),
  n('num_s06', '(305) 555-8006', '305', 'local', 199, 7.99, 7.99, { sellerId: 'usr_seller_001', source: 'seller', status: 'sold' }),
  n('num_s07', '(617) 555-8007', '617', 'local', 249, 9.99, 9.99, { sellerId: 'usr_seller_001', source: 'seller', status: 'sold' }),
  n('num_s08', '(702) 555-8008', '702', 'local', 179, 7.99, 7.99, { sellerId: 'usr_seller_001', source: 'seller', status: 'available' }),
  n('num_s09', '(512) 555-8009', '512', 'local', 229, 9.99, 9.99, { sellerId: 'usr_seller_001', source: 'seller', status: 'available' }),
  n('num_s10', '(800) 555-8010', '800', 'vanity', 1299, 24.99, 24.99, { sellerId: 'usr_seller_001', source: 'seller', status: 'available', vanityText: '1-800-SELL-NOW', isPremium: true }),
];

// ── Area Codes ──────────────────────────────────────────────────────────────
export const MOCK_AREA_CODES = [
  { code: '212', city: 'New York', state: 'NY', count: 4 },
  { code: '310', city: 'Los Angeles', state: 'CA', count: 4 },
  { code: '415', city: 'San Francisco', state: 'CA', count: 3 },
  { code: '305', city: 'Miami', state: 'FL', count: 3 },
  { code: '702', city: 'Las Vegas', state: 'NV', count: 2 },
  { code: '512', city: 'Austin', state: 'TX', count: 2 },
  { code: '617', city: 'Boston', state: 'MA', count: 2 },
  { code: '213', city: 'Los Angeles', state: 'CA', count: 2 },
  { code: '646', city: 'New York', state: 'NY', count: 2 },
  { code: '917', city: 'New York', state: 'NY', count: 2 },
  { code: '347', city: 'New York', state: 'NY', count: 2 },
  { code: '718', city: 'Brooklyn', state: 'NY', count: 2 },
  { code: '516', city: 'Long Island', state: 'NY', count: 2 },
  { code: '201', city: 'Jersey City', state: 'NJ', count: 2 },
  { code: '973', city: 'Newark', state: 'NJ', count: 2 },
  { code: '312', city: 'Chicago', state: 'IL', count: 1 },
  { code: '404', city: 'Atlanta', state: 'GA', count: 1 },
  { code: '469', city: 'Dallas', state: 'TX', count: 1 },
  { code: '602', city: 'Phoenix', state: 'AZ', count: 1 },
  { code: '206', city: 'Seattle', state: 'WA', count: 1 },
  { code: '303', city: 'Denver', state: 'CO', count: 1 },
  { code: '503', city: 'Portland', state: 'OR', count: 1 },
  { code: '704', city: 'Charlotte', state: 'NC', count: 1 },
  { code: '615', city: 'Nashville', state: 'TN', count: 1 },
  { code: '813', city: 'Tampa', state: 'FL', count: 1 },
  { code: '619', city: 'San Diego', state: 'CA', count: 1 },
  { code: '720', city: 'Denver', state: 'CO', count: 1 },
  { code: '818', city: 'San Fernando', state: 'CA', count: 1 },
  { code: '954', city: 'Fort Lauderdale', state: 'FL', count: 1 },
  { code: '800', city: 'Toll-Free', state: '', count: 8 },
  { code: '888', city: 'Toll-Free', state: '', count: 6 },
  { code: '877', city: 'Toll-Free', state: '', count: 4 },
  { code: '866', city: 'Toll-Free', state: '', count: 4 },
  { code: '855', city: 'Toll-Free', state: '', count: 4 },
  { code: '844', city: 'Toll-Free', state: '', count: 3 },
  { code: '833', city: 'Toll-Free', state: '', count: 3 },
];

// ── Buyer: Orders ───────────────────────────────────────────────────────────
export const MOCK_ORDERS = [
  {
    id: 'ord_001',
    orderNumber: 'ND-20240901-001',
    userId: 'usr_buyer_001',
    userEmail: 'buyer@test.com',
    userName: 'Alex Thompson',
    status: 'completed',
    totalAmount: 308.99,
    itemCount: 1,
    paymentMethod: 'card',
    createdAt: '2024-09-01T14:22:00Z',
    updatedAt: '2024-09-01T14:25:00Z',
    items: [{ id: 'oi_001', number: '(212) 555-1000', planType: 'license', price: 299, type: 'local' }],
  },
  {
    id: 'ord_002',
    orderNumber: 'ND-20241015-002',
    userId: 'usr_buyer_001',
    userEmail: 'buyer@test.com',
    userName: 'Alex Thompson',
    status: 'completed',
    totalAmount: 518.98,
    itemCount: 2,
    paymentMethod: 'card',
    createdAt: '2024-10-15T09:10:00Z',
    updatedAt: '2024-10-15T09:15:00Z',
    items: [
      { id: 'oi_002', number: '(310) 555-5500', planType: 'purchase', price: 349, type: 'local' },
      { id: 'oi_003', number: '(415) 555-1002', planType: 'license', price: 169.98, type: 'local' },
    ],
  },
  {
    id: 'ord_003',
    orderNumber: 'ND-20241120-003',
    userId: 'usr_buyer_001',
    userEmail: 'buyer@test.com',
    userName: 'Alex Thompson',
    status: 'processing',
    totalAmount: 599,
    itemCount: 1,
    paymentMethod: 'card',
    createdAt: '2024-11-20T16:45:00Z',
    updatedAt: '2024-11-20T16:45:00Z',
    items: [{ id: 'oi_004', number: '(800) 555-0001', planType: 'purchase', price: 599, type: 'toll_free' }],
  },
  {
    id: 'ord_004',
    orderNumber: 'ND-20241201-004',
    userId: 'usr_buyer_001',
    userEmail: 'buyer@test.com',
    userName: 'Alex Thompson',
    status: 'completed',
    totalAmount: 199,
    itemCount: 1,
    paymentMethod: 'card',
    createdAt: '2024-12-01T11:30:00Z',
    updatedAt: '2024-12-01T11:33:00Z',
    items: [{ id: 'oi_005', number: '(305) 555-1003', planType: 'license', price: 199, type: 'local' }],
  },
  {
    id: 'ord_005',
    orderNumber: 'ND-20241215-005',
    userId: 'usr_buyer_001',
    userEmail: 'buyer@test.com',
    userName: 'Alex Thompson',
    status: 'pending',
    totalAmount: 449,
    itemCount: 1,
    paymentMethod: 'card',
    createdAt: '2024-12-15T08:00:00Z',
    updatedAt: '2024-12-15T08:00:00Z',
    items: [{ id: 'oi_006', number: '(888) 555-0001', planType: 'purchase', price: 449, type: 'toll_free' }],
  },
];

// ── Buyer: Subscriptions ────────────────────────────────────────────────────
export const MOCK_SUBSCRIPTIONS = [
  {
    id: 'sub_001',
    phoneNumber: 'num_001',
    planType: 'standard',
    monthlyAmount: 9.99,
    status: 'active',
    nextBillingDate: '2025-02-01T00:00:00Z',
    startDate: '2024-09-01T14:25:00Z',
    number: { number: '(212) 555-1000', numberType: 'local', areaCode: '212' },
  },
  {
    id: 'sub_002',
    phoneNumber: 'num_009',
    planType: 'premium',
    monthlyAmount: 12.99,
    status: 'active',
    nextBillingDate: '2025-02-01T00:00:00Z',
    startDate: '2024-10-15T09:15:00Z',
    number: { number: '(415) 555-1002', numberType: 'local', areaCode: '415' },
  },
  {
    id: 'sub_003',
    phoneNumber: 'num_012',
    planType: 'basic',
    monthlyAmount: 7.99,
    status: 'cancelled',
    nextBillingDate: '2025-01-01T00:00:00Z',
    startDate: '2024-12-01T11:33:00Z',
    number: { number: '(305) 555-1003', numberType: 'local', areaCode: '305' },
  },
];

// ── Buyer: Offers Sent ──────────────────────────────────────────────────────
export const MOCK_OFFERS_SENT = [
  {
    id: 'off_001',
    amount: 250,
    status: 'pending',
    buyerMessage: 'Would love to use this for my NYC startup!',
    counterAmount: null,
    sellerResponse: null,
    createdAt: '2024-12-10T10:00:00Z',
    updatedAt: '2024-12-10T10:00:00Z',
    phoneNumber: { formatted: '(212) 555-8001', numberType: 'local' },
    listing: { salePrice: 349, licensePrice: 12.99 },
    seller: { firstName: 'Morgan', companyName: 'Rivera Telecom LLC' },
  },
  {
    id: 'off_002',
    amount: 400,
    status: 'accepted',
    buyerMessage: 'Great toll-free number for my business.',
    counterAmount: null,
    sellerResponse: 'Accepted — great offer!',
    createdAt: '2024-11-28T15:30:00Z',
    updatedAt: '2024-11-29T09:00:00Z',
    phoneNumber: { formatted: '(800) 555-8003', numberType: 'toll_free' },
    listing: { salePrice: 599, licensePrice: 19.99 },
    seller: { firstName: 'Morgan', companyName: 'Rivera Telecom LLC' },
  },
  {
    id: 'off_003',
    amount: 200,
    status: 'countered',
    buyerMessage: 'Interested in this number.',
    counterAmount: 260,
    sellerResponse: 'Can do $260.',
    createdAt: '2024-12-05T12:00:00Z',
    updatedAt: '2024-12-06T08:00:00Z',
    phoneNumber: { formatted: '(310) 555-8002', numberType: 'local' },
    listing: { salePrice: 279, licensePrice: 9.99 },
    seller: { firstName: 'Morgan', companyName: 'Rivera Telecom LLC' },
  },
  {
    id: 'off_004',
    amount: 150,
    status: 'declined',
    buyerMessage: 'Budget option?',
    counterAmount: null,
    sellerResponse: 'Too low, sorry.',
    createdAt: '2024-11-15T11:00:00Z',
    updatedAt: '2024-11-16T14:00:00Z',
    phoneNumber: { formatted: '(415) 555-8005', numberType: 'local' },
    listing: { salePrice: 299, licensePrice: 9.99 },
    seller: { firstName: 'Morgan', companyName: 'Rivera Telecom LLC' },
  },
  {
    id: 'off_005',
    amount: 180,
    status: 'cancelled',
    buyerMessage: 'Changed my mind.',
    counterAmount: null,
    sellerResponse: null,
    createdAt: '2024-11-01T09:00:00Z',
    updatedAt: '2024-11-02T10:00:00Z',
    phoneNumber: { formatted: '(702) 555-8008', numberType: 'local' },
    listing: { salePrice: 179, licensePrice: 7.99 },
    seller: { firstName: 'Morgan', companyName: 'Rivera Telecom LLC' },
  },
  {
    id: 'off_006',
    amount: 1000,
    status: 'pending',
    buyerMessage: 'Love this vanity number!',
    counterAmount: null,
    sellerResponse: null,
    createdAt: '2024-12-14T16:00:00Z',
    updatedAt: '2024-12-14T16:00:00Z',
    phoneNumber: { formatted: '(800) 555-8010', numberType: 'vanity' },
    listing: { salePrice: 1299, licensePrice: 24.99 },
    seller: { firstName: 'Morgan', companyName: 'Rivera Telecom LLC' },
  },
];

// ── Buyer: Notifications ────────────────────────────────────────────────────
export const MOCK_NOTIFICATIONS = [
  { id: 'notif_001', title: 'Order Confirmed', message: 'Your order ND-20241215-005 has been received and is being processed.', type: 'order', read: false, createdAt: '2024-12-15T08:01:00Z' },
  { id: 'notif_002', title: 'Offer Received', message: 'Your offer of $250 on (212) 555-8001 is under review by the seller.', type: 'offer', read: false, createdAt: '2024-12-10T10:01:00Z' },
  { id: 'notif_003', title: 'Counter Offer', message: 'The seller has countered your offer on (310) 555-8002 with $260.', type: 'offer', read: false, createdAt: '2024-12-06T08:01:00Z' },
  { id: 'notif_004', title: 'Order Completed', message: 'Your order ND-20241201-004 for (305) 555-1003 is now complete.', type: 'order', read: true, createdAt: '2024-12-01T11:35:00Z' },
  { id: 'notif_005', title: 'Offer Accepted', message: 'Your offer on (800) 555-8003 was accepted! Complete your purchase.', type: 'offer', read: true, createdAt: '2024-11-29T09:01:00Z' },
  { id: 'notif_006', title: 'Welcome to NumberDepot', message: 'Thanks for joining! Browse thousands of phone numbers at great prices.', type: 'system', read: true, createdAt: '2024-08-15T10:31:00Z' },
  { id: 'notif_007', title: 'Subscription Reminder', message: 'Your subscription for (212) 555-1000 will renew on Feb 1, 2025.', type: 'billing', read: false, createdAt: '2024-12-20T09:00:00Z' },
  { id: 'notif_008', title: 'New Numbers Available', message: 'We added 15 new 212 area code numbers. Check them out!', type: 'system', read: true, createdAt: '2024-12-12T07:00:00Z' },
];

// ── Seller: Dashboard ───────────────────────────────────────────────────────
export const MOCK_SELLER_DASHBOARD = {
  totalSales: 47,
  totalRevenue: 14850.00,
  pendingBalance: 1250.00,
  availableBalance: 8720.00,
  affiliateCode: 'RIVERA2024',
  recentSales: [
    { id: 'sale_r1', number: '(212) 555-8001', buyerName: 'Jamie L.', amount: 349, commission: 34.90, date: '2024-12-14T10:00:00Z', status: 'completed' },
    { id: 'sale_r2', number: '(800) 555-8003', buyerName: 'Alex T.', amount: 400, commission: 40.00, date: '2024-11-29T09:00:00Z', status: 'completed' },
    { id: 'sale_r3', number: '(305) 555-8006', buyerName: 'Chris M.', amount: 199, commission: 19.90, date: '2024-11-20T15:00:00Z', status: 'completed' },
    { id: 'sale_r4', number: '(617) 555-8007', buyerName: 'Pat D.', amount: 249, commission: 24.90, date: '2024-11-10T11:00:00Z', status: 'completed' },
    { id: 'sale_r5', number: '(310) 555-8002', buyerName: 'Sam K.', amount: 279, commission: 27.90, date: '2024-10-22T14:00:00Z', status: 'completed' },
  ],
};

// ── Seller: Sales History ───────────────────────────────────────────────────
export const MOCK_SELLER_SALES = [
  { id: 'sale_001', orderId: 'ord_s01', number: '(212) 555-8001', buyerName: 'Jamie Liu', buyerEmail: 'jamie@example.com', amount: 349, commission: 34.90, netAmount: 314.10, type: 'purchase', status: 'completed', createdAt: '2024-12-14T10:00:00Z' },
  { id: 'sale_002', orderId: 'ord_s02', number: '(800) 555-8003', buyerName: 'Alex Thompson', buyerEmail: 'buyer@test.com', amount: 400, commission: 40.00, netAmount: 360.00, type: 'purchase', status: 'completed', createdAt: '2024-11-29T09:00:00Z' },
  { id: 'sale_003', orderId: 'ord_s03', number: '(305) 555-8006', buyerName: 'Chris Martinez', buyerEmail: 'chris@example.com', amount: 199, commission: 19.90, netAmount: 179.10, type: 'purchase', status: 'completed', createdAt: '2024-11-20T15:00:00Z' },
  { id: 'sale_004', orderId: 'ord_s04', number: '(617) 555-8007', buyerName: 'Pat Davis', buyerEmail: 'pat@example.com', amount: 249, commission: 24.90, netAmount: 224.10, type: 'purchase', status: 'completed', createdAt: '2024-11-10T11:00:00Z' },
  { id: 'sale_005', orderId: 'ord_s05', number: '(310) 555-8002', buyerName: 'Sam Kim', buyerEmail: 'sam@example.com', amount: 279, commission: 27.90, netAmount: 251.10, type: 'purchase', status: 'completed', createdAt: '2024-10-22T14:00:00Z' },
  { id: 'sale_006', orderId: 'ord_s06', number: '(415) 555-8005', buyerName: 'Robin Lee', buyerEmail: 'robin@example.com', amount: 299, commission: 29.90, netAmount: 269.10, type: 'purchase', status: 'completed', createdAt: '2024-10-05T09:00:00Z' },
  { id: 'sale_007', orderId: 'ord_s07', number: '(888) 555-8004', buyerName: 'Dana Nguyen', buyerEmail: 'dana@example.com', amount: 449, commission: 44.90, netAmount: 404.10, type: 'purchase', status: 'pending', createdAt: '2024-12-18T16:00:00Z' },
  { id: 'sale_008', orderId: 'ord_s08', number: '(702) 555-8008', buyerName: 'Taylor Jones', buyerEmail: 'taylor@example.com', amount: 179, commission: 17.90, netAmount: 161.10, type: 'license', status: 'completed', createdAt: '2024-09-28T13:00:00Z' },
];

// ── Seller: Offers Received ─────────────────────────────────────────────────
export const MOCK_OFFERS_RECEIVED = [
  { id: 'off_001', number: '(212) 555-8001', buyerName: 'Alex Thompson', buyerEmail: 'buyer@test.com', amount: 250, listingPrice: 349, counterAmount: null, status: 'pending', sellerResponse: null, createdAt: '2024-12-10T10:00:00Z', updatedAt: '2024-12-10T10:00:00Z' },
  { id: 'off_r02', number: '(800) 555-8010', buyerName: 'Alex Thompson', buyerEmail: 'buyer@test.com', amount: 1000, listingPrice: 1299, counterAmount: null, status: 'pending', sellerResponse: null, createdAt: '2024-12-14T16:00:00Z', updatedAt: '2024-12-14T16:00:00Z' },
  { id: 'off_r03', number: '(512) 555-8009', buyerName: 'Casey Brown', buyerEmail: 'casey@example.com', amount: 180, listingPrice: 229, counterAmount: null, status: 'pending', sellerResponse: null, createdAt: '2024-12-13T11:00:00Z', updatedAt: '2024-12-13T11:00:00Z' },
  { id: 'off_002', number: '(800) 555-8003', buyerName: 'Alex Thompson', buyerEmail: 'buyer@test.com', amount: 400, listingPrice: 599, counterAmount: null, status: 'accepted', sellerResponse: 'Accepted — great offer!', createdAt: '2024-11-28T15:30:00Z', updatedAt: '2024-11-29T09:00:00Z' },
  { id: 'off_003', number: '(310) 555-8002', buyerName: 'Alex Thompson', buyerEmail: 'buyer@test.com', amount: 200, listingPrice: 279, counterAmount: 260, status: 'countered', sellerResponse: 'Can do $260.', createdAt: '2024-12-05T12:00:00Z', updatedAt: '2024-12-06T08:00:00Z' },
  { id: 'off_004', number: '(415) 555-8005', buyerName: 'Alex Thompson', buyerEmail: 'buyer@test.com', amount: 150, listingPrice: 299, counterAmount: null, status: 'declined', sellerResponse: 'Too low, sorry.', createdAt: '2024-11-15T11:00:00Z', updatedAt: '2024-11-16T14:00:00Z' },
];

// ── Seller: Earnings / Commissions ──────────────────────────────────────────
export const MOCK_COMMISSIONS_SUMMARY = {
  totalEarned: 2403.00,
  pendingCommissions: 449.00,
  paidCommissions: 1954.00,
  commissionRate: 10,
};

export const MOCK_COMMISSIONS = [
  { id: 'com_001', orderId: 'ord_s01', number: '(212) 555-8001', buyerName: 'Jamie Liu', amount: 349, commissionRate: 10, commissionAmount: 34.90, status: 'paid', paidAt: '2024-12-20T00:00:00Z', createdAt: '2024-12-14T10:00:00Z' },
  { id: 'com_002', orderId: 'ord_s02', number: '(800) 555-8003', buyerName: 'Alex Thompson', amount: 400, commissionRate: 10, commissionAmount: 40.00, status: 'paid', paidAt: '2024-12-15T00:00:00Z', createdAt: '2024-11-29T09:00:00Z' },
  { id: 'com_003', orderId: 'ord_s03', number: '(305) 555-8006', buyerName: 'Chris Martinez', amount: 199, commissionRate: 10, commissionAmount: 19.90, status: 'paid', paidAt: '2024-12-01T00:00:00Z', createdAt: '2024-11-20T15:00:00Z' },
  { id: 'com_004', orderId: 'ord_s04', number: '(617) 555-8007', buyerName: 'Pat Davis', amount: 249, commissionRate: 10, commissionAmount: 24.90, status: 'paid', paidAt: '2024-11-25T00:00:00Z', createdAt: '2024-11-10T11:00:00Z' },
  { id: 'com_005', orderId: 'ord_s05', number: '(310) 555-8002', buyerName: 'Sam Kim', amount: 279, commissionRate: 10, commissionAmount: 27.90, status: 'paid', paidAt: '2024-11-05T00:00:00Z', createdAt: '2024-10-22T14:00:00Z' },
  { id: 'com_006', orderId: 'ord_s07', number: '(888) 555-8004', buyerName: 'Dana Nguyen', amount: 449, commissionRate: 10, commissionAmount: 44.90, status: 'pending', paidAt: null, createdAt: '2024-12-18T16:00:00Z' },
];

// ── Seller: Payouts ─────────────────────────────────────────────────────────
export const MOCK_PAYOUTS = [
  { id: 'pay_001', amount: 800.00, method: 'bank_transfer', status: 'completed', reference: 'PAY-2024-001', requestedAt: '2024-12-01T10:00:00Z', processedAt: '2024-12-02T09:00:00Z', completedAt: '2024-12-03T12:00:00Z' },
  { id: 'pay_002', amount: 654.00, method: 'paypal', status: 'completed', reference: 'PAY-2024-002', requestedAt: '2024-11-01T10:00:00Z', processedAt: '2024-11-01T15:00:00Z', completedAt: '2024-11-02T10:00:00Z' },
  { id: 'pay_003', amount: 500.00, method: 'bank_transfer', status: 'processing', reference: 'PAY-2024-003', requestedAt: '2024-12-20T10:00:00Z', processedAt: '2024-12-21T09:00:00Z', completedAt: null },
];

// ── Seller: Broker Profile ──────────────────────────────────────────────────
export const MOCK_BROKER_PROFILE = {
  businessName: 'Rivera Telecom LLC',
  businessType: 'llc',
  ein: '12-3456789',
  bankName: 'Chase Bank',
  bankAccountType: 'checking',
  bankRoutingNumber: '021000021',
  bankAccountNumber: '****4567',
  paypalEmail: 'morgan@riveratelecom.com',
  preferredPayoutMethod: 'bank_transfer',
};

// ── Buyer: Owned Numbers (for My Numbers page) ─────────────────────────────
export const MOCK_OWNED_NUMBERS = [
  {
    id: 'own_001',
    phoneNumberId: 'num_001',
    number: '(212) 555-1000',
    numberType: 'local',
    areaCode: '212',
    planType: 'standard',
    monthlyAmount: 9.99,
    status: 'active',
    acquiredDate: '2024-09-01T14:25:00Z',
    forwarding: { enabled: true, destination: '(917) 555-4321', schedule: 'always' },
    voicemail: { enabled: true, greeting: 'default', transcription: true },
    callLogs: [
      { id: 'cl_001', from: '(646) 555-9876', to: '(212) 555-1000', duration: 124, date: '2024-12-20T14:30:00Z', type: 'incoming', status: 'answered' },
      { id: 'cl_002', from: '(347) 555-1111', to: '(212) 555-1000', duration: 0, date: '2024-12-20T11:15:00Z', type: 'incoming', status: 'missed' },
      { id: 'cl_003', from: '(718) 555-2222', to: '(212) 555-1000', duration: 67, date: '2024-12-19T16:45:00Z', type: 'incoming', status: 'voicemail' },
      { id: 'cl_004', from: '(201) 555-3333', to: '(212) 555-1000', duration: 245, date: '2024-12-19T10:00:00Z', type: 'incoming', status: 'answered' },
      { id: 'cl_005', from: '(973) 555-4444', to: '(212) 555-1000', duration: 89, date: '2024-12-18T09:30:00Z', type: 'incoming', status: 'answered' },
    ],
  },
  {
    id: 'own_002',
    phoneNumberId: 'num_009',
    number: '(415) 555-1002',
    numberType: 'local',
    areaCode: '415',
    planType: 'premium',
    monthlyAmount: 12.99,
    status: 'active',
    acquiredDate: '2024-10-15T09:15:00Z',
    forwarding: { enabled: false, destination: '', schedule: 'always' },
    voicemail: { enabled: true, greeting: 'custom', transcription: true },
    callLogs: [
      { id: 'cl_006', from: '(510) 555-7777', to: '(415) 555-1002', duration: 180, date: '2024-12-20T13:00:00Z', type: 'incoming', status: 'answered' },
      { id: 'cl_007', from: '(650) 555-8888', to: '(415) 555-1002', duration: 0, date: '2024-12-19T15:30:00Z', type: 'incoming', status: 'missed' },
    ],
  },
  {
    id: 'own_003',
    phoneNumberId: 'num_012',
    number: '(305) 555-1003',
    numberType: 'local',
    areaCode: '305',
    planType: 'basic',
    monthlyAmount: 7.99,
    status: 'cancelled',
    acquiredDate: '2024-12-01T11:33:00Z',
    forwarding: { enabled: false, destination: '', schedule: 'always' },
    voicemail: { enabled: false, greeting: 'default', transcription: false },
    callLogs: [],
  },
];

// ── Admin: Dashboard ────────────────────────────────────────────────────────
export const MOCK_ADMIN_DASHBOARD = {
  totalUsers: 1247,
  totalNumbers: 3856,
  totalOrders: 892,
  totalRevenue: 187430.00,
  newUsersThisMonth: 89,
  pendingBrokers: 3,
};

// ── Admin: All Users ────────────────────────────────────────────────────────
export const MOCK_ALL_USERS = [
  ...MOCK_USERS.map(({ password: _p, ...u }) => u),
  { id: 'usr_004', email: 'jane.doe@example.com', firstName: 'Jane', lastName: 'Doe', role: 'buyer', status: 'active', phone: '(312) 555-0400', companyName: '', createdAt: '2024-09-10T10:00:00Z' },
  { id: 'usr_005', email: 'bob.smith@example.com', firstName: 'Bob', lastName: 'Smith', role: 'buyer', status: 'active', phone: '(404) 555-0500', companyName: '', createdAt: '2024-10-01T10:00:00Z' },
  { id: 'usr_006', email: 'lisa.wang@example.com', firstName: 'Lisa', lastName: 'Wang', role: 'seller', status: 'active', phone: '(206) 555-0600', companyName: 'Wang Communications', createdAt: '2024-07-15T10:00:00Z' },
  { id: 'usr_007', email: 'mike.brown@example.com', firstName: 'Mike', lastName: 'Brown', role: 'buyer', status: 'suspended', phone: '(602) 555-0700', companyName: '', createdAt: '2024-06-01T10:00:00Z' },
  { id: 'usr_008', email: 'sara.jones@example.com', firstName: 'Sara', lastName: 'Jones', role: 'buyer', status: 'active', phone: '(503) 555-0800', companyName: '', createdAt: '2024-11-15T10:00:00Z' },
  { id: 'usr_009', email: 'david.kim@example.com', firstName: 'David', lastName: 'Kim', role: 'seller', status: 'pending', phone: '(619) 555-0900', companyName: 'Kim Digits LLC', createdAt: '2024-12-01T10:00:00Z' },
  { id: 'usr_010', email: 'emily.chen@example.com', firstName: 'Emily', lastName: 'Chen', role: 'buyer', status: 'active', phone: '(704) 555-1000', companyName: '', createdAt: '2024-12-10T10:00:00Z' },
];

// ── Admin: Broker Applications ──────────────────────────────────────────────
export const MOCK_BROKER_APPLICATIONS = [
  { id: 'ba_001', userId: 'usr_009', userName: 'David Kim', userEmail: 'david.kim@example.com', companyName: 'Kim Digits LLC', status: 'pending', reason: 'Want to sell toll-free numbers from my inventory.', businessLicense: 'BL-2024-CA-98765', experience: '5 years in telecom', notes: '', createdAt: '2024-12-01T10:00:00Z', updatedAt: '2024-12-01T10:00:00Z' },
  { id: 'ba_002', userId: 'usr_011', userName: 'Rachel Green', userEmail: 'rachel@example.com', companyName: 'Green Telecom', status: 'pending', reason: 'Expanding my number brokerage business online.', businessLicense: 'BL-2024-NY-54321', experience: '3 years', notes: '', createdAt: '2024-12-05T10:00:00Z', updatedAt: '2024-12-05T10:00:00Z' },
  { id: 'ba_003', userId: 'usr_012', userName: 'Tom Wilson', userEmail: 'tom@example.com', companyName: 'Wilson Numbers', status: 'pending', reason: 'Have 200+ numbers to list.', businessLicense: 'BL-2024-TX-11111', experience: '10 years', notes: '', createdAt: '2024-12-08T10:00:00Z', updatedAt: '2024-12-08T10:00:00Z' },
  { id: 'ba_004', userId: 'usr_006', userName: 'Lisa Wang', userEmail: 'lisa.wang@example.com', companyName: 'Wang Communications', status: 'approved', reason: 'Existing telecom business looking to expand.', businessLicense: 'BL-2024-WA-22222', experience: '8 years', notes: 'Verified business license.', createdAt: '2024-07-10T10:00:00Z', updatedAt: '2024-07-15T10:00:00Z' },
  { id: 'ba_005', userId: 'usr_seller_001', userName: 'Morgan Rivera', userEmail: 'seller@test.com', companyName: 'Rivera Telecom LLC', status: 'approved', reason: 'Professional number broker.', businessLicense: 'BL-2024-CA-33333', experience: '12 years', notes: 'Top seller.', createdAt: '2024-03-20T10:00:00Z', updatedAt: '2024-03-22T10:00:00Z' },
];

// ── Admin: Commissions ──────────────────────────────────────────────────────
export const MOCK_ADMIN_COMMISSIONS_SUMMARY = {
  totalCommissions: 48750.00,
  pendingCommissions: 3200.00,
  paidCommissions: 45550.00,
  averageRate: 10,
};

export const MOCK_ADMIN_COMMISSIONS = [
  { id: 'acom_001', orderId: 'ord_s01', sellerId: 'usr_seller_001', sellerName: 'Morgan Rivera', sellerEmail: 'seller@test.com', amount: 34.90, rate: 10, status: 'paid', createdAt: '2024-12-14T10:00:00Z', paidAt: '2024-12-20T00:00:00Z' },
  { id: 'acom_002', orderId: 'ord_s02', sellerId: 'usr_seller_001', sellerName: 'Morgan Rivera', sellerEmail: 'seller@test.com', amount: 40.00, rate: 10, status: 'paid', createdAt: '2024-11-29T09:00:00Z', paidAt: '2024-12-15T00:00:00Z' },
  { id: 'acom_003', orderId: 'ord_s03', sellerId: 'usr_seller_001', sellerName: 'Morgan Rivera', sellerEmail: 'seller@test.com', amount: 19.90, rate: 10, status: 'paid', createdAt: '2024-11-20T15:00:00Z', paidAt: '2024-12-01T00:00:00Z' },
  { id: 'acom_004', orderId: 'ord_a01', sellerId: 'usr_006', sellerName: 'Lisa Wang', sellerEmail: 'lisa.wang@example.com', amount: 55.00, rate: 10, status: 'paid', createdAt: '2024-12-10T12:00:00Z', paidAt: '2024-12-18T00:00:00Z' },
  { id: 'acom_005', orderId: 'ord_s07', sellerId: 'usr_seller_001', sellerName: 'Morgan Rivera', sellerEmail: 'seller@test.com', amount: 44.90, rate: 10, status: 'pending', createdAt: '2024-12-18T16:00:00Z', paidAt: null },
  { id: 'acom_006', orderId: 'ord_a02', sellerId: 'usr_006', sellerName: 'Lisa Wang', sellerEmail: 'lisa.wang@example.com', amount: 32.00, rate: 10, status: 'pending', createdAt: '2024-12-19T10:00:00Z', paidAt: null },
];

// ── Admin: Settings ─────────────────────────────────────────────────────────
export const MOCK_ADMIN_SETTINGS: Record<string, string> = {
  siteName: 'NumberDepot',
  supportEmail: 'support@numberdepot.net',
  supportPhone: '(800) 555-6867',
  defaultCommissionRate: '10',
  minOfferPercentage: '50',
  maxListingsPerSeller: '100',
  autoApproveListings: 'false',
  maintenanceMode: 'false',
  analyticsEnabled: 'true',
  stripePublicKey: 'pk_test_xxxxxxxxxxxx',
  stripeSecretKey: 'sk_test_xxxxxxxxxxxx',
};
