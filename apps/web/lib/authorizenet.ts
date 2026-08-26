// ── Authorize.Net gateway client ────────────────────────────────────────────
// Uses the JSON flavour of the Authorize.Net AIM API together with Accept.js
// payment nonces (opaqueData), so raw card data never reaches our server.

const SANDBOX_ENDPOINT = 'https://apitest.authorize.net/xml/v1/request.api';
const PRODUCTION_ENDPOINT = 'https://api.authorize.net/xml/v1/request.api';

export type AuthorizeNetEnv = 'sandbox' | 'production';

export interface OpaqueData {
  dataDescriptor: string;
  dataValue: string;
}

export interface BillTo {
  firstName?: string;
  lastName?: string;
  company?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phoneNumber?: string;
}

export interface ChargeLineItem {
  itemId: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number; // dollars
}

export interface ChargeParams {
  amount: number; // dollars
  opaqueData: OpaqueData;
  invoiceNumber?: string;
  description?: string;
  email?: string;
  customerId?: string;
  billTo?: BillTo;
  customerIp?: string;
  lineItems?: ChargeLineItem[];
  refId?: string;
}

/** Normalised outcome of a gateway call — never throws for a declined card. */
export interface GatewayResult {
  ok: boolean; // true only for an approved (responseCode "1") transaction
  status: 'approved' | 'declined' | 'error' | 'held';
  transactionId: string | null;
  authCode: string | null;
  avsResultCode: string | null;
  cvvResultCode: string | null;
  cardLast4: string | null;
  cardType: string | null;
  responseCode: string | null;
  reasonCode: string | null;
  message: string;
  raw: unknown;
}

export class AuthorizeNetConfigError extends Error {}

interface Config {
  env: AuthorizeNetEnv;
  endpoint: string;
  name: string;
  transactionKey: string;
}

export function getEnv(): AuthorizeNetEnv {
  // Anything other than an explicit "production" stays on the sandbox endpoint,
  // so a missing or misspelt env var can never move real money.
  return process.env.AUTHORIZENET_ENV === 'production' ? 'production' : 'sandbox';
}

export function isConfigured(): boolean {
  return !!(
    process.env.AUTHORIZENET_API_LOGIN_ID?.trim() &&
    process.env.AUTHORIZENET_TRANSACTION_KEY?.trim()
  );
}

function getConfig(): Config {
  const name = process.env.AUTHORIZENET_API_LOGIN_ID?.trim();
  const transactionKey = process.env.AUTHORIZENET_TRANSACTION_KEY?.trim();

  if (!name || !transactionKey) {
    throw new AuthorizeNetConfigError(
      'Authorize.Net is not configured — set AUTHORIZENET_API_LOGIN_ID and AUTHORIZENET_TRANSACTION_KEY'
    );
  }

  const env = getEnv();
  return {
    env,
    endpoint: env === 'production' ? PRODUCTION_ENDPOINT : SANDBOX_ENDPOINT,
    name,
    transactionKey,
  };
}

// Authorize.Net serves JSON prefixed with a UTF-8 BOM, which makes res.json()
// throw. Read as text, strip the BOM, then parse.
const BOM = '﻿';

async function anetPost<T>(body: Record<string, unknown>): Promise<T> {
  const config = getConfig();

  const res = await fetch(config.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const text = await res.text();
  const cleaned = (text.startsWith(BOM) ? text.slice(1) : text).trim();

  if (!cleaned) {
    throw new Error(`Authorize.Net returned an empty response (HTTP ${res.status})`);
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `Authorize.Net returned a non-JSON response (HTTP ${res.status}): ${cleaned.slice(0, 300)}`
    );
  }
}

function merchantAuthentication() {
  const { name, transactionKey } = getConfig();
  return { name, transactionKey };
}

/** Authorize.Net rejects over-long values outright — trim before sending. */
function clamp(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

/**
 * For identifier fields, truncating is worse than omitting — a clipped Mongo
 * ObjectId looks like a real id but matches nothing. Drop it instead.
 */
function fitOrOmit(value: string | undefined, max: number): string | undefined {
  if (!value) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed || trimmed.length > max) return undefined;
  return trimmed;
}

function money(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

interface AnetTransactionResponse {
  responseCode?: string;
  authCode?: string;
  avsResultCode?: string;
  cvvResultCode?: string;
  transId?: string;
  accountNumber?: string;
  accountType?: string;
  messages?: { code?: string; description?: string }[];
  errors?: { errorCode?: string; errorText?: string }[];
}

interface AnetEnvelope {
  transactionResponse?: AnetTransactionResponse;
  messages?: {
    resultCode?: string;
    message?: { code?: string; text?: string }[];
  };
}

function interpret(envelope: AnetEnvelope): GatewayResult {
  const tx = envelope.transactionResponse;
  const responseCode = tx?.responseCode ?? null;

  const approvalMessage = tx?.messages?.[0];
  const transactionError = tx?.errors?.[0];
  const envelopeMessage = envelope.messages?.message?.[0];

  let status: GatewayResult['status'];
  switch (responseCode) {
    case '1': status = 'approved'; break;
    case '2': status = 'declined'; break;
    case '4': status = 'held'; break;
    default: status = 'error';
  }

  // A transaction-level error wins; otherwise fall back to the envelope message,
  // which is where malformed-request and authentication failures surface.
  const message =
    transactionError?.errorText ||
    approvalMessage?.description ||
    envelopeMessage?.text ||
    'Unknown gateway response';

  const accountNumber = tx?.accountNumber ?? null; // e.g. "XXXX1111"

  return {
    ok: status === 'approved',
    status,
    transactionId: tx?.transId && tx.transId !== '0' ? tx.transId : null,
    authCode: tx?.authCode || null,
    avsResultCode: tx?.avsResultCode || null,
    cvvResultCode: tx?.cvvResultCode || null,
    cardLast4: accountNumber ? accountNumber.replace(/\D/g, '').slice(-4) || null : null,
    cardType: tx?.accountType || null,
    responseCode,
    reasonCode: transactionError?.errorCode || approvalMessage?.code || envelopeMessage?.code || null,
    message,
    raw: envelope,
  };
}

/** Auth + capture in one step, paid with an Accept.js nonce. */
export async function chargeCard(params: ChargeParams): Promise<GatewayResult> {
  const {
    amount, opaqueData, invoiceNumber, description, email,
    customerId, billTo, customerIp, lineItems, refId,
  } = params;

  if (!(amount > 0)) {
    throw new Error(`Refusing to charge a non-positive amount: ${amount}`);
  }
  if (!opaqueData?.dataDescriptor || !opaqueData?.dataValue) {
    throw new Error('Missing Accept.js payment nonce');
  }

  // The Authorize.Net XSD declares transactionRequest as an xs:sequence, so the
  // JSON keys must appear in schema order or the gateway rejects the whole call
  // with E00003 ("invalid child element"). The order below follows
  // transactionRequestType: transactionType, amount, payment, order, lineItems,
  // customer, billTo, customerIP, transactionSettings.

  const order: Record<string, string> = {};
  const clampedInvoice = clamp(invoiceNumber, 20);
  const clampedDescription = clamp(description, 255);
  if (clampedInvoice) order.invoiceNumber = clampedInvoice;
  if (clampedDescription) order.description = clampedDescription;

  // Authorize.Net accepts at most 30 line items.
  const lineItemPayload =
    lineItems && lineItems.length > 0
      ? {
          lineItem: lineItems.slice(0, 30).map((li) => {
            const desc = clamp(li.description, 255);
            return {
              itemId: clamp(li.itemId, 31) || 'item',
              name: clamp(li.name, 31) || 'Item',
              ...(desc ? { description: desc } : {}),
              quantity: String(li.quantity),
              unitPrice: money(li.unitPrice),
            };
          }),
        }
      : null;

  // customerDataType is also a sequence: id must precede email. `id` caps at 20
  // characters, which a 24-char ObjectId exceeds — in that case it is dropped
  // rather than truncated. The order number in `invoiceNumber` is the field to
  // reconcile against in the Authorize.Net dashboard anyway.
  const customer: Record<string, string> = {};
  const fittedCustomerId = fitOrOmit(customerId, 20);
  const clampedEmail = clamp(email, 255);
  if (fittedCustomerId) customer.id = fittedCustomerId;
  if (clampedEmail) customer.email = clampedEmail;

  const billToPayload: Record<string, string> = {};
  if (billTo) {
    const fields: [keyof BillTo, number][] = [
      ['firstName', 50], ['lastName', 50], ['company', 50], ['address', 60],
      ['city', 40], ['state', 40], ['zip', 20], ['country', 60], ['phoneNumber', 25],
    ];
    for (const [key, max] of fields) {
      const v = clamp(billTo[key], max);
      if (v) billToPayload[key] = v;
    }
  }

  const clampedIp = clamp(customerIp, 45);

  const transactionRequest: Record<string, unknown> = {
    transactionType: 'authCaptureTransaction',
    amount: money(amount),
    payment: {
      opaqueData: {
        dataDescriptor: opaqueData.dataDescriptor,
        dataValue: opaqueData.dataValue,
      },
    },
    ...(Object.keys(order).length > 0 ? { order } : {}),
    ...(lineItemPayload ? { lineItems: lineItemPayload } : {}),
    ...(Object.keys(customer).length > 0 ? { customer } : {}),
    ...(Object.keys(billToPayload).length > 0 ? { billTo: billToPayload } : {}),
    ...(clampedIp ? { customerIP: clampedIp } : {}),
    // duplicateWindow 0 disables the default 2-minute duplicate rejection. Our
    // own idempotency guard in the pay route is what prevents double charges,
    // and this keeps a legitimate retry after a decline from being swallowed.
    transactionSettings: {
      setting: [{ settingName: 'duplicateWindow', settingValue: '0' }],
    },
  };

  const clampedRefId = clamp(refId, 20);

  const envelope = await anetPost<AnetEnvelope>({
    createTransactionRequest: {
      merchantAuthentication: merchantAuthentication(),
      ...(clampedRefId ? { refId: clampedRefId } : {}),
      transactionRequest,
    },
  });

  return interpret(envelope);
}

/**
 * Void an unsettled transaction. Valid until the daily batch settles; after
 * that the transaction must be refunded instead.
 */
export async function voidTransaction(transactionId: string, refId?: string): Promise<GatewayResult> {
  const clampedRefId = clamp(refId, 20);
  const envelope = await anetPost<AnetEnvelope>({
    createTransactionRequest: {
      merchantAuthentication: merchantAuthentication(),
      ...(clampedRefId ? { refId: clampedRefId } : {}),
      transactionRequest: {
        transactionType: 'voidTransaction',
        refTransId: transactionId,
      },
    },
  });
  return interpret(envelope);
}

/**
 * Refund a settled transaction. Authorize.Net requires the last four digits of
 * the card, which we persist on the payment record at charge time.
 */
export async function refundTransaction(
  transactionId: string,
  amount: number,
  cardLast4: string,
  refId?: string
): Promise<GatewayResult> {
  if (!/^\d{4}$/.test(cardLast4)) {
    throw new Error('refundTransaction requires the last 4 digits of the card');
  }

  const clampedRefId = clamp(refId, 20);
  const envelope = await anetPost<AnetEnvelope>({
    createTransactionRequest: {
      merchantAuthentication: merchantAuthentication(),
      ...(clampedRefId ? { refId: clampedRefId } : {}),
      transactionRequest: {
        transactionType: 'refundTransaction',
        amount: money(amount),
        payment: {
          creditCard: { cardNumber: cardLast4, expirationDate: 'XXXX' },
        },
        refTransId: transactionId,
      },
    },
  });
  return interpret(envelope);
}

/** Credential smoke test — surfaced on the admin settings page. */
export async function testConnection(): Promise<{ ok: boolean; env: AuthorizeNetEnv; message: string }> {
  const env = getEnv();
  try {
    const envelope = await anetPost<AnetEnvelope>({
      authenticateTestRequest: { merchantAuthentication: merchantAuthentication() },
    });
    const resultCode = envelope.messages?.resultCode;
    const message = envelope.messages?.message?.[0]?.text || 'No message';
    return { ok: resultCode === 'Ok', env, message };
  } catch (err) {
    return { ok: false, env, message: err instanceof Error ? err.message : 'Connection failed' };
  }
}
