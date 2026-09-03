'use client';

import React from 'react';

/**
 * MASTER LOCKDOWN (5/14/2026) - Root Hardware Recovery.
 * Logic: Next.js 15 requires html/body tags. Uses zero-dependency styles to prevent loop.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>AKAsheet: Hardware Reset</title>
      </head>
      <body style={{ 
        margin: 0, 
        padding: 0, 
        backgroundColor: '#050a1e', 
        color: 'white', 
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center'
      }}>
        <div style={{ padding: '40px', maxWidth: '500px' }}>
          <div style={{ 
            fontSize: '64px', 
            marginBottom: '24px', 
            display: 'block' 
          }}>🔌</div>
          <h2 style={{ 
            fontSize: '32px', 
            fontWeight: 'bold', 
            marginBottom: '10px', 
            textTransform: 'uppercase',
            letterSpacing: '-0.05em' 
          }}>Hardware Failure</h2>
          <p style={{ 
            color: '#94a3b8', 
            fontSize: '11px', 
            marginBottom: '40px',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            lineHeight: '1.6'
          }}>
            SYSTEM_ERROR: {error.message || 'CRITICAL_INITIALIZATION_IDLE'}
            {error.digest && <span style={{ display: 'block', marginTop: '10px', opacity: 0.5 }}>DIGEST: {error.digest}</span>}
          </p>
          <button 
            onClick={() => reset()}
            style={{
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              padding: '16px 40px',
              borderRadius: '12px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 10px 30px rgba(37, 99, 235, 0.3)',
              textTransform: 'uppercase',
              letterSpacing: '0.1em'
            }}
          >
            Initialize Hard Reset
          </button>
          <p style={{ marginTop: '24px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
            AKAsheet &copy; 2026
          </p>
        </div>
      </body>
    </html>
  );
}
