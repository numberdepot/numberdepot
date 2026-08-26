'use client';

// ── Accept.js loader ────────────────────────────────────────────────────────
// Accept.js exchanges raw card details for a single-use payment nonce entirely
// in the browser, so card numbers never touch our server or our database.

const PRODUCTION_SRC = 'https://js.authorize.net/v1/Accept.js';
const SANDBOX_SRC = 'https://jstest.authorize.net/v1/Accept.js';

export interface AcceptOpaqueData {
  dataDescriptor: string;
  dataValue: string;
}

interface AcceptResponse {
  opaqueData?: AcceptOpaqueData;
  messages: {
    resultCode: 'Ok' | 'Error';
    message: { code: string; text: string }[];
  };
}

interface AcceptCardData {
  cardNumber: string;
  month: string;
  year: string;
  cardCode: string;
  zip?: string;
  fullName?: string;
}

declare global {
  interface Window {
    Accept?: {
      dispatchData: (
        data: {
          authData: { clientKey: string; apiLoginID: string };
          cardData: AcceptCardData;
        },
        handler: (response: AcceptResponse) => void
      ) => void;
    };
  }
}

export function isSandbox(): boolean {
  return process.env.NEXT_PUBLIC_AUTHORIZENET_ENV !== 'production';
}

export function getAcceptScriptSrc(): string {
  return isSandbox() ? SANDBOX_SRC : PRODUCTION_SRC;
}

export function getClientKey(): string {
  return process.env.NEXT_PUBLIC_AUTHORIZENET_CLIENT_KEY || '';
}

export function getApiLoginId(): string {
  return process.env.NEXT_PUBLIC_AUTHORIZENET_API_LOGIN_ID || '';
}

export function isAcceptConfigured(): boolean {
  return !!(getClientKey() && getApiLoginId());
}

let loadPromise: Promise<void> | null = null;

/** Loads Accept.js once and resolves when window.Accept is usable. */
export function loadAcceptJs(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Accept.js can only load in the browser'));
  }
  if (window.Accept) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const src = getAcceptScriptSrc();

  loadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);

    const settle = () => {
      // The script tag can fire load a tick before window.Accept is assigned.
      if (window.Accept) {
        resolve();
        return;
      }
      let tries = 0;
      const poll = setInterval(() => {
        if (window.Accept) {
          clearInterval(poll);
          resolve();
        } else if (++tries > 40) {
          clearInterval(poll);
          loadPromise = null;
          reject(new Error('Accept.js loaded but did not initialise'));
        }
      }, 50);
    };

    const fail = () => {
      loadPromise = null;
      reject(new Error('Could not load the payment library. Check your connection and try again.'));
    };

    if (existing) {
      existing.addEventListener('load', settle);
      existing.addEventListener('error', fail);
      // Already finished loading before we attached listeners.
      if (window.Accept) resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', settle);
    script.addEventListener('error', fail);
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Exchange card details for a payment nonce.
 *
 * The nonce is single-use and expires after about 15 minutes, so a retry after
 * a decline must call this again rather than reusing the previous value.
 */
export function tokenizeCard(cardData: AcceptCardData): Promise<AcceptOpaqueData> {
  return new Promise((resolve, reject) => {
    if (!window.Accept) {
      reject(new Error('Payment library is not ready yet. Please wait a moment and try again.'));
      return;
    }
    const clientKey = getClientKey();
    const apiLoginID = getApiLoginId();
    if (!clientKey || !apiLoginID) {
      reject(new Error('Payments are not configured. Please contact support.'));
      return;
    }

    window.Accept.dispatchData(
      { authData: { clientKey, apiLoginID }, cardData },
      (response) => {
        if (response.messages.resultCode === 'Error') {
          const text =
            response.messages.message.map((m) => m.text).join(' ') ||
            'We could not validate your card details.';
          reject(new Error(text));
          return;
        }
        if (!response.opaqueData?.dataValue) {
          reject(new Error('The payment library returned no token. Please try again.'));
          return;
        }
        resolve(response.opaqueData);
      }
    );
  });
}
