import { getDb } from './db';

let indexesCreated = false;

export async function ensureIndexes(): Promise<void> {
  if (indexesCreated) return;

  const db = await getDb();

  // Use createIndex with background:true — idempotent, silently skips if exists
  const numbersColl = db.collection('numbers');
  const ordersColl = db.collection('orders');
  const paymentsColl = db.collection('payments');
  const userNumbersColl = db.collection('user_numbers');
  const settingsColl = db.collection('settings');
  const offersColl = db.collection('offers');
  const notificationsColl = db.collection('notifications');

  // ── Drop the destructive reservation TTL index ──
  // An earlier version created { reservationExpiresAt: 1 } with
  // expireAfterSeconds: 0. A MongoDB TTL index deletes the whole document, not
  // just the expired fields — so any number that sat in a cart for 15 minutes
  // without being bought was permanently erased from inventory. Releasing a
  // reservation is handled properly by /api/cron/cleanup-reservations and the
  // inline sweep in /api/search. This must run before the createIndex calls
  // below, because the replacement index reuses the same default name.
  try {
    const existing = await numbersColl.indexes();
    const ttlIndex = existing.find(
      (ix) => ix.key?.reservationExpiresAt === 1 && ix.expireAfterSeconds !== undefined
    );
    if (ttlIndex?.name) {
      await numbersColl.dropIndex(ttlIndex.name);
      console.warn(
        `[ensure-indexes] Dropped destructive TTL index "${ttlIndex.name}" on numbers.reservationExpiresAt`
      );
    }
  } catch (err) {
    console.error('[ensure-indexes] Could not inspect/drop the reservation TTL index:', err);
  }

  await Promise.allSettled([
    // ── numbers collection ──
    // Unique number
    numbersColl.createIndex({ number: 1 }, { unique: true }),

    // Primary search: status + areaCode (most common filter combo)
    numbersColl.createIndex({ status: 1, areaCode: 1, price: 1 }),

    // Search by type + status + price
    numbersColl.createIndex({ status: 1, numberType: 1, price: 1 }),

    // Featured/premium numbers
    numbersColl.createIndex({ status: 1, isPremium: -1, price: 1 }),

    // Source filter (admin panel)
    numbersColl.createIndex({ source: 1, status: 1 }),

    // Newest sort
    numbersColl.createIndex({ status: 1, createdAt: -1 }),

    // Text search on number, vanityText, formattedNumber
    numbersColl.createIndex(
      { number: 'text', formattedNumber: 'text', vanityText: 'text' },
      { name: 'numbers_text_search' }
    ),

    // Vanity text for regex searches
    numbersColl.createIndex({ vanityText: 1 }, { sparse: true }),

    // Reservation sweep — plain index, NOT a TTL index (see the drop above)
    numbersColl.createIndex(
      { status: 1, reservationExpiresAt: 1 },
      { name: 'numbers_reservation_sweep' }
    ),

    // Owner lookup for sold numbers
    numbersColl.createIndex({ ownerId: 1 }, { sparse: true }),

    // ── orders collection ──
    ordersColl.createIndex({ orderNumber: 1 }, { unique: true }),
    ordersColl.createIndex({ userId: 1, createdAt: -1 }),
    ordersColl.createIndex({ status: 1 }),
    ordersColl.createIndex({ status: 1, createdAt: -1 }),

    // ── payments collection ──
    paymentsColl.createIndex({ createdAt: -1 }),
    paymentsColl.createIndex({ orderId: 1, createdAt: -1 }),
    paymentsColl.createIndex({ userId: 1, createdAt: -1 }),
    paymentsColl.createIndex({ status: 1, createdAt: -1 }),
    paymentsColl.createIndex({ transactionId: 1 }, { sparse: true }),

    // ── user_numbers collection ──
    userNumbersColl.createIndex({ userId: 1 }),
    userNumbersColl.createIndex({ number: 1 }),

    // ── settings collection ──
    settingsColl.createIndex({ key: 1 }, { unique: true }),

    // ── offers collection ──
    offersColl.createIndex({ buyerId: 1, createdAt: -1 }),
    offersColl.createIndex({ sellerId: 1, status: 1, createdAt: -1 }),
    offersColl.createIndex({ numberId: 1, status: 1 }),
    offersColl.createIndex({ status: 1, expiresAt: 1 }),

    // ── notifications collection ──
    notificationsColl.createIndex({ userId: 1, createdAt: -1 }),
    notificationsColl.createIndex({ userId: 1, read: 1 }),
  ]);

  indexesCreated = true;
}
