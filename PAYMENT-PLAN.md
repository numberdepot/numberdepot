# NumberDepot — Authorize.Net Payment Integration

> Supersedes the Stripe section of `PLAN.md`. Client's gateway is **Authorize.Net**.
> Status: **built and compiling**. Awaiting a live card test by the client.

---

## 1. Credentials — status

| Item | Value | Where it lives |
|---|---|---|
| API Login ID | `4X7xxZy2uUZX` | `AUTHORIZENET_API_LOGIN_ID` (+ the public client-side pair) |
| Transaction Key | `89X2A3cn4Q6Rxz8W` | `AUTHORIZENET_TRANSACTION_KEY` — **server only, secret** |
| Public Client Key | `3w749D6…cu25` | `NEXT_PUBLIC_AUTHORIZENET_CLIENT_KEY` — safe client-side |
| Signature Key | **not provided** | needed only for webhooks (not yet built) |

**Verified against the live gateway:**

```
POST https://api.authorize.net/xml/v1/request.api     → resultCode "Ok"
POST https://apitest.authorize.net/xml/v1/request.api → E00007 invalid auth
```

➡️ **These are PRODUCTION credentials. Every approved transaction is real money.**

Outstanding:
- Delete `140539.jpg` / `140541.jpg` from the repo root — they show the API Login ID and Transaction Key in plaintext. (Untracked, so no git-history rewrite needed.)
- Get **sandbox** credentials (free at `developer.authorize.net`) for staging, or switch the merchant account to Test Mode while testing.

---

## 2. The NumberBarn question — answered

**Q: Will NumberBarn numbers also be paid through our gateway, with NumberBarn's own price automatically going to them?**

**A: No. NumberBarn has no such split-payment feature.**

1. **Their public API has no purchase endpoint.** Documented sections: Building Blocks, API Tokens, Available Telephone Numbers, Brokerage (Listings / Jobs / Transactions / Licenses / Payouts / Negotiations), TN Info, Manage TNs, Offers, Saved Searches, Caller ID Name, SMS, Contacts, Account, Call Logs, Voicemails, Greetings. **No cart, order or checkout.**
2. Our code used to call `POST /api/purchaseNumber`. Probed live → **HTTP 404, "Page not found"**.
3. Their B2B programme runs the other way: **NumberBarn collects from the end customer**, then pays the partner a **commission** — 5% (referral / co-branded), up to 20% (white label, approved partners). One-time per sale, 10-day hold, ACH payout, W-9 required.
4. Listings API doc, on the direction of money: *"NumberBarn will collect the retail price from the buyer, transfer ownership… and send the collected funds (less NumberBarn's fee) to the seller."*

### Three models

| | **A — Referral / Redirect** | **B — Merchant of Record** | **C — White Label B2B** |
|---|---|---|---|
| Who charges the buyer | NumberBarn | NumberDepot (Authorize.Net) | NumberDepot |
| Client's revenue | 5–20% commission | markup (currently 15%) | wholesale spread |
| Fulfilment | NumberBarn, automatic | **manual** — ops buys on numberbarn.com | API, automatic |
| Chargeback risk | NumberBarn's | **client's** | client's |
| Available today | ✅ | ✅ | ❌ needs a signed agreement |

**What is implemented: model B**, with the manual step made explicit and safe (see the fulfilment queue below). Switching to A later means not putting NumberBarn results in the cart at all — the rest of the code is unaffected.

**Ask NumberBarn** (`numberbarn.com/b2b` → Schedule a Call) whether C is available:

> "Wholesale/white-label ordering API — can we place orders programmatically against our partner account at wholesale pricing, billed to our NumberBarn account, while we collect retail from the end customer on our own gateway?"

If yes, implement it in `lib/numberbarn.ts` and flip `numberBarnAutoPurchaseAvailable()` to true.

**The client's own 37K numbers are unaffected** — those always go 100% through Authorize.Net.

---

## 3. How a number disappears after purchase

Three layers, all in place:

| Layer | Mechanism | Where |
|---|---|---|
| **1. Reserved** | Adding to cart atomically sets `status: 'reserved'` for 15 min. Both listing endpoints filter `status: 'available'`, so it leaves search immediately. | `api/cart/reserve`, `api/numbers`, `api/search` |
| **2. Sold** | On an approved charge the number is atomically flipped to `sold` with `ownerId`, `orderId`, `soldAt`. | `api/orders/[id]/pay` |
| **3. Detail page** | A `sold` or `inactive` number now returns **404** instead of rendering a buyable product page to anyone with a direct link or a stale Google result. | `api/numbers/[id]` |

The claim in layer 2 happens **before** the card is charged, guarded by
`{ status: 'reserved', reservedBy: <user>, reservationExpiresAt: { $gt: now } }`.
If the guard does not match, the charge never happens. If the charge fails, the
claim is rolled back to exactly its previous state. So a number can never be
sold twice, and a buyer is never charged for a number someone else got first.

---

## 4. Bugs found and fixed

| # | File | Problem | Status |
|---|---|---|---|
| 1 | `api/orders/[id]/pay` | Charged nothing — marked orders complete outright. The site was giving numbers away free. | fixed |
| 2 | `api/orders` | NumberBarn items took `price` / `setupFee` / `monthlyFee` straight from the request body — a buyer could POST `price: 0.01`. | fixed: all prices recomputed server-side |
| 3 | cart vs. `api/orders` | Cart showed `subtotal + admin fees`; the server charged `subtotal + number.setupFee + number.monthlyPrice` and silently ignored the fees the client sent. Displayed ≠ charged. | fixed: one `priceOrder()` used by quote, order and charge |
| 4 | `lib/ensure-indexes.ts` | **A TTL index on `numbers.reservationExpiresAt` was deleting inventory.** A MongoDB TTL index removes the whole document — any number left in a cart for 15 minutes was permanently erased. | fixed: index dropped on startup |
| 5 | `lib/numberbarn.ts` | `purchaseNumber()` called a 404 endpoint, and `getToken()` was missing an `await` (sent `Bearer [object Promise]`). | fixed: made honest, routed to manual fulfilment |
| 6 | `api/orders/[id]/pay` | Swallowed the NumberBarn failure, still marked the order complete **and** inserted a `user_numbers` row as `active`. Buyer paid, got nothing, dashboard said it was live. | fixed |
| 7 | `api/orders/[id]/pay` | No idempotency — a double-clicked Pay button meant two orders and two charges. | fixed: atomic `pending → processing` lock |
| 8 | `api/orders/[id]/pay` | Reservation expiry was never rechecked at payment time. | fixed |
| 9 | `lib/api.ts` | On a 5xx the client fell back to the **mock layer**, which answers unknown routes with `ok(null)` — a 500 from the pay route would have shown "Payment successful" with no charge. | fixed: `/orders`, `/payments`, `/cart` never fall back |
| 10 | `lib/authorizenet.ts` | Authorize.Net enforces XSD element **order**; `transactionSettings` and `customer.id` were misplaced, so every charge would have failed with E00003. | fixed, verified against the live gateway |
| 11 | `lib/authorizenet.ts` | `customer.id` caps at 20 chars but a Mongo ObjectId is 24 — truncating produced a corrupt identifier. | fixed: omitted rather than truncated |
| 12 | `api/orders/admin/all` | Sent only `userId` while the admin table rendered `userEmail` — every row showed "N/A". | fixed with a `$lookup` |

---

## 5. What was built

**Gateway**
- `lib/authorizenet.ts` — `chargeCard`, `voidTransaction`, `refundTransaction`, `testConnection`. BOM-safe response parsing, typed response codes (1 approved / 2 declined / 3 error / 4 held), schema-correct element ordering, length clamping.
- `lib/accept-js.ts` — loads Accept.js from the right host per environment and turns card details into a single-use nonce in the browser. **Card data never reaches our server** (PCI SAQ A-EP).

**Pricing (one source of truth)**
- `lib/utils/fees.ts` — canonical fee loader, handles both stored formats.
- `lib/utils/order-pricing.ts` — `priceOrder()`. Inventory priced from Mongo, NumberBarn re-fetched live and re-marked-up. Rejects duplicates, >25 items, zero totals.
- `lib/utils/order-number.ts` — race-safe `ND-YYYYMMDD-NNN` allocation (retries on duplicate key).

**API**
- `POST /api/orders/quote` — server-computed totals for checkout, no DB write.
- `POST /api/orders` — creates a pending order, re-pricing everything.
- `POST /api/orders/[id]/pay` — the charge, with the claim/rollback logic above.
- `GET /api/payments/admin` — every attempt + revenue summary.
- `POST /api/payments/admin/[id]/refund` — refund or void; relists the numbers and removes them from the buyer.
- `GET|PUT /api/admin/fulfillment` — the NumberBarn manual queue.

**UI**
- `/checkout` — billing + card form, totals rendered from the server quote, sandbox banner, decline/held handling, retry without orphaning orders.
- `/admin/payments` — who paid, how much, for which numbers, card, AVS/CVV, transaction id, refund/void buttons, revenue stat cards, search and filters.
- `/admin/fulfillment` — NumberBarn queue with a deep link to the number on numberbarn.com and Delivered / Failed actions.
- Number detail page respects `isPurchasable` and no longer shows a total that differs from checkout.

---

## 6. Verification done

- `tsc --noEmit` — clean.
- `next build` — compiles, all new routes present.
- **Live gateway request-shape test** — the exact payload `chargeCard()` builds was sent to `api.authorize.net` with a deliberately invalid nonce. It now returns **E00114 "Invalid OTS Token"**, meaning schema validation, merchant authentication and payment processing were all reached and only the fake nonce was rejected. **No money moved.** This caught bugs #10 and #11.
- Void and refund shapes validated the same way (rejected on a fake transaction id / card, not on schema).

**Not yet verified:** the approved-charge path, and the database-backed flow — the MongoDB Atlas cluster is not reachable from the build environment. Run the script below on a machine that can reach it.

```bash
npm run dev                  # terminal 1
npm run verify:payments      # terminal 2
```

`scripts/verify-payment-flow.mjs` reserves a number, quotes it, creates an
order, attempts payment with an invalid nonce, then asserts that the order did
**not** complete, the number rolled back to reserved, the failed attempt was
recorded, the admin endpoint shows it and rejects non-admins, and a sold number
vanishes from search and 404s on its detail page. It cleans up after itself and
never moves money.

---

## 7. Client test checklist (real card)

1. In the Authorize.Net merchant portal, turn **Test Mode ON** (Account → Settings → Test Mode) so nothing settles, or supply sandbox credentials and set `AUTHORIZENET_ENV=sandbox`.
2. Set the env vars from `.env.example` on the deployment.
3. Buy one number end to end. Expect: success message → redirect to `/account/orders`.
4. **Admin → Payments**: the row shows buyer name and email, amount, the number, card brand + last 4, transaction id, status `approved`.
5. Search for that number on the public site — it must be gone. Open its old URL directly — it must 404.
6. Try a deliberately bad card (e.g. `4222222222222`). Expect a readable decline, the number still in your cart, and a `declined` row in Admin → Payments.
7. Double-click Pay. Expect exactly one charge.
8. From Admin → Payments, Void the test transaction. The number returns to the site and leaves the buyer's account.
9. Turn **Test Mode OFF** before going live.

---

## 8. Still open

1. **NumberBarn model** — confirm A, B or C with the client (§2).
2. **Signature Key** — needed for webhooks (settled/refund/chargeback sync). Not built yet.
3. **Recurring billing** — the monthly plans (park $2.99 / forward $6.99 / unlimited $19.99 / business $9.99) are collected as *information* but nothing charges them monthly. Recommended: CIM customer profiles created from the same Accept.js nonce, plus a monthly cron — not ARB, because plans are per-number and changeable.
4. **`NUMBERBARN_API_TOKEN`** is still unset, so the NumberBarn search fallback is inert.
5. **Refund policy** for numbers — needed before the refund path is exposed to buyers rather than admins.
6. `lib/resend.ts` still sends from `noreply@devsoumyajit.in`. Set `RESEND_FROM_EMAIL=NumberDepot <noreply@numberdepot.net>` once the domain is verified in Resend.
