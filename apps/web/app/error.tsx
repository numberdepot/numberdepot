'use client';

import { useEffect } from 'react';

/**
 * Route-level error boundary.
 *
 * Without this file Next.js falls back to its own bare screen — "Application
 * error: a client-side exception has occurred" — which says nothing about what
 * actually broke. React strips error messages from production builds, but the
 * `digest` is logged server-side and lets you match a report to the real stack.
 *
 * Deliberately plain DOM and inline styles: an error boundary that depends on
 * the theme provider can fail for the same reason the page did.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[NumberDepot] Unhandled render error:', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
      }}
    >
      <div style={{ maxWidth: 560, textAlign: 'center' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#002664', margin: '0 0 8px' }}>
          Something went wrong
        </h1>
        <p style={{ color: '#555', lineHeight: 1.6, margin: '0 0 24px' }}>
          This page could not be displayed. Please try again — if it keeps happening, contact
          support and include the reference below.
        </p>

        {(error.digest || error.message) && (
          <pre
            style={{
              textAlign: 'left',
              background: '#f5f6f8',
              border: '1px solid #e3e5ea',
              borderRadius: 8,
              padding: '12px 14px',
              fontSize: 12,
              color: '#444',
              overflowX: 'auto',
              margin: '0 0 24px',
            }}
          >
            {error.digest ? `Reference: ${error.digest}\n` : ''}
            {error.message || ''}
          </pre>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reset}
            style={{
              background: '#002664',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          <a
            href="/"
            style={{
              background: '#fff',
              color: '#002664',
              border: '1px solid #002664',
              borderRadius: 8,
              padding: '12px 24px',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
