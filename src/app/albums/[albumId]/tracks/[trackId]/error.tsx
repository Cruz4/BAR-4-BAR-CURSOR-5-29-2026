'use client';

import React from 'react';

/**
 * MASTER LOCKDOWN (5/14/2026) - Track Level Hardware Recovery.
 * Logic: Simplified primitive styles to prevent hydration refresh loops.
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
      minHeight: 'calc(100vh - 4rem)',
      backgroundColor: '#050a1e',
      padding: '16px'
    }}>
        <div style={{
          width: '100%',
          maxWidth: '500px',
          textAlign: 'center',
          backgroundColor: '#0c121d',
          border: '2px solid rgba(255,255,255,0.05)',
          borderRadius: '12px',
          padding: '40px'
        }}>
            <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '48px' }}>⚠️</span>
                <h2 style={{
                  marginTop: '16px',
                  fontFamily: 'serif',
                  fontSize: '28px',
                  color: 'white',
                  fontWeight: 'bold'
                }}>
                    Track Hardware Error
                </h2>
                <p style={{ fontSize: '14px', color: '#94a3b8', marginTop: '8px' }}>
                    This is often caused by high demand on the neural engine.
                </p>
            </div>
            <div style={{ spaceY: '16px' }}>
                <div style={{
                  padding: '16px',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  borderRadius: '6px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  color: '#f87171',
                  overflow: 'auto',
                  maxHeight: '192px',
                  border: '1px solid rgba(239, 68, 68, 0.2)'
                }}>
                    <p>{error.message || 'CRITICAL_NEURAL_INTERRUPT'}</p>
                </div>
                <button
                    onClick={() => reset()}
                    style={{
                      marginTop: '24px',
                      width: '100%',
                      height: '48px',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      textTransform: 'uppercase'
                    }}
                >
                    Initialize Repair
                </button>
                <button 
                  onClick={() => window.location.href = '/vault'} 
                  style={{
                    marginTop: '16px',
                    width: '100%',
                    backgroundColor: 'transparent',
                    color: '#94a3b8',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}
                >
                    Return to Vault
                </button>
            </div>
        </div>
    </div>
  );
}
