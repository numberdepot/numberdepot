/**
 * End-to-end smoke test for the payment flow.
 *
 * Exercises everything except an approved charge: it deliberately sends an
 * invalid Accept.js nonce, so the gateway rejects the transaction and NO money
 * moves. What it proves is the part that is easy to get wrong — that a failed
 * payment rolls the number back, records the attempt, and never marks the order
 * complete; and that a paid number disappears from search.
 *
 * Usage (from the repo root, with the dev server already running):
 *   npm run dev          # in one terminal
 *   node scripts/verify-payment-flow.mjs
 *
 * Optional: BASE_URL=http://localhost:3000 node scripts/verify-payment-flow.mjs
 */

import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

function loadEnv() {
  const file = path.join(ROOT, '.env');
  if (!fs.existsSync(file)) throw new Error('.env not found at repo root');
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
  );
}

let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    console.log(`  FAIL  ${label}${detail ? ` — ${detail}` : ''}`);
    failed++;
  }
}

async function apiCall(method, endpoint, token, body) {
  const res = await fetch(`${BASE_URL}/api${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON body */ }
  return { status: res.status, json };
}

const env = loadEnv();
const client = await MongoClient.connect(env.MONGODB_URI);
const db = client.db('numberdepot');
const numbers = db.collection('numbers');
const orders = db.collection('orders');
const payments = db.collection('payments');
const users = db.collection('users');

let createdOrderId = null;
let testNumberId = null;

try {
  console.log(`\nTarget: ${BASE_URL}\n`);

  // ── 1. The destructive TTL index must be gone ──
  console.log('1. Reservation TTL index');
  const indexes = await numbers.indexes();
  const ttl = indexes.find((ix) => ix.key?.reservationExpiresAt === 1 && ix.expireAfterSeconds !== undefined);
  check(
    'no TTL index on numbers.reservationExpiresAt (it would delete inventory)',
    !ttl,
    ttl ? `still present as "${ttl.name}" — start the dev server once to drop it` : ''
  );

  // ── 2. Pick a buyer and a number ──
  console.log('\n2. Fixtures');
  const user = await users.findOne({ role: { $ne: 'admin' } });
  check('a non-admin user exists to act as the buyer', !!user);
  if (!user) throw new Error('No buyer available — register a user first');

  const number = await numbers.findOne({ status: 'available', price: { $gt: 0 } });
  check('an available number exists with a price', !!number);
  if (!number) throw new Error('No priced, available number in inventory');

  testNumberId = number._id;
  console.log(`        buyer  : ${user.email}`);
  console.log(`        number : ${number.formattedNumber} ($${(number.price / 100).toFixed(2)})`);

  const token = jwt.sign(
    { userId: user._id.toString(), email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // ── 3. Reserve ──
  console.log('\n3. Reserve');
  const reserve = await apiCall('POST', '/cart/reserve', token, { numberId: testNumberId.toString() });
  check('reserve returns 200', reserve.status === 200, `got ${reserve.status}`);

  const afterReserve = await numbers.findOne({ _id: testNumberId });
  check('number status is now "reserved"', afterReserve?.status === 'reserved', `got ${afterReserve?.status}`);

  const searchWhileReserved = await apiCall('GET', `/search?q=${afterReserve.number}&limit=20`, token);
  const inSearch = (searchWhileReserved.json?.data || []).some((n) => n.id === testNumberId.toString());
  check('reserved number is hidden from search', !inSearch);

  // ── 4. Quote — server-side pricing ──
  console.log('\n4. Quote (server-computed totals)');
  const cartItems = [{ phoneNumberId: testNumberId.toString(), source: 'inventory', planType: 'park' }];
  const quote = await apiCall('POST', '/orders/quote', token, { items: cartItems });
  check('quote returns 200', quote.status === 200, JSON.stringify(quote.json));
  const quoted = quote.json?.data;
  check('quoted subtotal matches the number price in the database',
    quoted && Math.round(quoted.subtotal * 100) === number.price,
    `quoted ${quoted?.subtotal}, db ${(number.price / 100).toFixed(2)}`);
  check('quoted total equals subtotal + fees',
    quoted && Math.abs(quoted.totalAmount - (quoted.subtotal + quoted.feesTotal)) < 0.005);

  // ── 5. Price tampering must be ignored ──
  console.log('\n5. Price tampering');
  const tampered = await apiCall('POST', '/orders/quote', token, {
    items: [{ ...cartItems[0], price: 0.01, setupFee: 0, monthlyFee: 0 }],
  });
  check('a client-supplied price does not change the total',
    tampered.status === 200 && Math.round(tampered.json?.data?.totalAmount * 100) === Math.round(quoted.totalAmount * 100),
    `got ${tampered.json?.data?.totalAmount}, expected ${quoted.totalAmount}`);

  // ── 6. Create the order ──
  console.log('\n6. Create order');
  const created = await apiCall('POST', '/orders', token, { items: cartItems });
  check('order creation returns 200', created.status === 200, JSON.stringify(created.json));
  createdOrderId = created.json?.data?.id;
  check('order has an order number', !!created.json?.data?.orderNumber);
  check('order total matches the quote',
    Math.round((created.json?.data?.totalAmount ?? -1) * 100) === Math.round(quoted.totalAmount * 100));

  // ── 7. Pay with an invalid nonce — must fail cleanly ──
  console.log('\n7. Pay with an invalid nonce (no money moves)');
  const pay = await apiCall('POST', `/orders/${createdOrderId}/pay`, token, {
    opaqueData: { dataDescriptor: 'COMMON.ACCEPT.INAPP.PAYMENT', dataValue: 'INVALID_NONCE_FOR_SMOKE_TEST' },
    billTo: { firstName: 'Smoke', lastName: 'Test', address: '1 Main St', city: 'Austin', state: 'TX', zip: '78701', country: 'USA' },
  });
  check('pay is rejected (402 declined / 502 unreachable)',
    pay.status === 402 || pay.status === 502,
    `got ${pay.status}: ${JSON.stringify(pay.json)}`);
  check('the error message is customer-readable, not raw gateway jargon',
    typeof pay.json?.error === 'string' && !/OTS Token/i.test(pay.json.error),
    pay.json?.error);

  const orderAfterFail = await orders.findOne({ _id: new ObjectId(createdOrderId) });
  check('order was NOT marked completed', orderAfterFail?.status !== 'completed', `status=${orderAfterFail?.status}`);
  check('order is back to pending so the buyer can retry', orderAfterFail?.status === 'pending', `status=${orderAfterFail?.status}`);

  const numberAfterFail = await numbers.findOne({ _id: testNumberId });
  check('number was NOT marked sold', numberAfterFail?.status !== 'sold', `status=${numberAfterFail?.status}`);
  check('number reservation was restored, not lost', numberAfterFail?.status === 'reserved', `status=${numberAfterFail?.status}`);
  check('no owner was assigned', !numberAfterFail?.ownerId);

  const failedPayment = await payments.findOne({ orderId: new ObjectId(createdOrderId) });
  check('the failed attempt was recorded for the admin panel', !!failedPayment);
  check('recorded attempt is not "approved"', failedPayment && failedPayment.status !== 'approved', `status=${failedPayment?.status}`);
  check('recorded attempt carries the buyer email', failedPayment?.userEmail === user.email);

  // ── 8. Admin visibility ──
  console.log('\n8. Admin payments API');
  const admin = await users.findOne({ role: 'admin' });
  if (admin) {
    const adminToken = jwt.sign(
      { userId: admin._id.toString(), email: admin.email, role: 'admin' },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const list = await apiCall('GET', '/payments/admin?limit=5', adminToken);
    check('admin payments endpoint returns 200', list.status === 200, JSON.stringify(list.json));
    check('the attempt appears in the admin list',
      (list.json?.data || []).some((p) => p.orderId === createdOrderId));
    check('summary totals are present', !!list.json?.summary);

    const buyerToken = token;
    const forbidden = await apiCall('GET', '/payments/admin', buyerToken);
    check('a non-admin cannot read payments', forbidden.status === 403, `got ${forbidden.status}`);
  } else {
    console.log('  SKIP  no admin user found');
  }

  // ── 9. Sold numbers must vanish ──
  console.log('\n9. Sold number visibility (simulated)');
  await numbers.updateOne(
    { _id: testNumberId },
    { $set: { status: 'sold', ownerId: user._id, soldAt: new Date() }, $unset: { reservedBy: '', reservedAt: '', reservationExpiresAt: '' } }
  );
  const detail = await apiCall('GET', `/numbers/${testNumberId.toString()}`, token);
  check('detail page returns 404 for a sold number', detail.status === 404, `got ${detail.status}`);

  const searchAfterSold = await apiCall('GET', `/search?q=${number.number}&limit=20`, token);
  const stillListed = (searchAfterSold.json?.data || []).some((n) => n.id === testNumberId.toString());
  check('sold number is gone from search', !stillListed);
} catch (err) {
  console.error('\nAborted:', err.message);
  failed++;
} finally {
  // ── Cleanup ──
  console.log('\nCleanup');
  if (testNumberId) {
    await numbers.updateOne(
      { _id: testNumberId },
      { $set: { status: 'available', updatedAt: new Date() }, $unset: { ownerId: '', orderId: '', soldAt: '', reservedBy: '', reservedAt: '', reservationExpiresAt: '' } }
    );
    console.log('  number restored to available');
  }
  if (createdOrderId) {
    await orders.deleteOne({ _id: new ObjectId(createdOrderId) });
    await payments.deleteMany({ orderId: new ObjectId(createdOrderId) });
    console.log('  test order and payment records removed');
  }
  await client.close();

  console.log(`\n${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
}
