'use client';

import React from 'react';

/**
 * MASTER LOCKDOWN (5/14/2026) - Root Error Recovery Hardware.
 * Logic: Stripped to pure primitive HTML to ensure recovery even if all components fail.
 * FIX (5/23): Eliminated all external component imports to resolve the refresh loop.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#050a1e',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        maxWidth: '440px',
        width: '100%',
        backgroundColor: '#0c121d',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 15px 40px rgba(0,0,0,0.4)'
      }}>
        <div style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px auto'
        }}>
          <span style={{ fontSize: '28px' }}>🛠️</span>
        </div>
        <h2 style={{
          fontSize: '22px',
          fontWeight: 'bold',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '-0.02em'
        }}>
          Studio Sync Error
        </h2>
        <p style={{
          fontSize: '11px',
          color: '#94a3b8',
          marginBottom: '24px',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontFamily: 'monospace',
          lineHeight: '1.5'
        }}>
          {error.message || 'Workstation state interrupted.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={() => reset()}
              style={{
                width: '100%',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontSize: '12px'
              }}
            >
              Initialize Repair
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                color: 'rgba(255,255,255,0.4)',
                border: 'none',
                padding: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                textTransform: 'uppercase',
                fontSize: '10px',
                letterSpacing: '0.1em'
              }}
            >
              Return to Dashboard
            </button>
        </div>
      </div>
    </div>
  );
}
