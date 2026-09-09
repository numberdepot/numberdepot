'use client';

import { useEffect } from 'react';

/**
 * Last-resort boundary for errors thrown by the root layout itself (theme
 * provider, fonts, the auth/cart providers). It replaces the whole document, so
 * it has to render its own <html> and <body> and cannot rely on anything the
 * layout would normally set up.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[NumberDepot] Root layout error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          background: '#fafbfc',
        }}
      >
        <div style={{ maxWidth: 560, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#002664', margin: '0 0 8px' }}>
            NumberDepot is temporarily unavailable
          </h1>
          <p style={{ color: '#555', lineHeight: 1.6, margin: '0 0 24px' }}>
            We hit an unexpected error while loading the site. Please try again in a moment.
          </p>

          {error.digest && (
            <p style={{ fontSize: 12, color: '#777', margin: '0 0 24px' }}>
              Reference: <code>{error.digest}</code>
            </p>
          )}

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
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
