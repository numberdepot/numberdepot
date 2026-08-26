import type { Collection } from 'mongodb';
import type { OrderDoc } from '../types/db';

/**
 * Generates the next "ND-YYYYMMDD-NNN" order number.
 *
 * `orderNumber` carries a unique index, and counting today's orders is racy —
 * two concurrent checkouts would compute the same sequence and one insert would
 * blow up with a duplicate-key error. So the insert itself is the retry point:
 * the caller passes a builder, and we retry on 11000 with the next sequence.
 */
export async function insertOrderWithNumber(
  col: Collection<OrderDoc>,
  build: (orderNumber: string) => OrderDoc,
  maxAttempts = 8
): Promise<{ orderNumber: string; insertedId: import('mongodb').ObjectId }> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfNextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  const todayCount = await col.countDocuments({
    createdAt: { $gte: startOfDay, $lt: startOfNextDay },
  });

  let sequence = todayCount + 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const orderNumber = `ND-${dateStr}-${String(sequence).padStart(3, '0')}`;
    try {
      const result = await col.insertOne(build(orderNumber));
      return { orderNumber, insertedId: result.insertedId };
    } catch (err) {
      const code = (err as { code?: number })?.code;
      if (code === 11000) {
        sequence += 1;
        continue;
      }
      throw err;
    }
  }

  throw new Error('Could not allocate a unique order number after several attempts');
}
