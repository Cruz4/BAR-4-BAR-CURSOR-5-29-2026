'use client';

import React from 'react';

/**
 * MASTER LOCKDOWN (5/14/2026) - Album Level Hardware Recovery.
 * Logic: Hardened fallback for album projects using primitive styles to ensure rendering.
 */
export default function AlbumError({
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
          border: '2px solid rgba(255,255,255,0.05)',
          backgroundColor: '#0c121d',
          borderRadius: '12px',
          padding: '40px'
        }}>
            <div>
                <div style={{
                  margin: '0 auto 16px auto',
                  width: '64px',
                  height: '64px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                    <span style={{ fontSize: '32px' }}>⚠️</span>
                </div>
                <h2 style={{
                  marginTop: '16px',
                  fontFamily: 'serif',
                  fontSize: '28px',
                  color: 'white',
                  textTransform: 'uppercase',
                  letterSpacing: '-0.02em',
                  fontWeight: 'bold'
                }}>
                    Vault Error
                </h2>
                <p style={{
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.2em',
                  color: '#94a3b8',
                  marginTop: '4px'
                }}>
                    Failed to access project blueprints.
                </p>
            </div>
            <div style={{ marginTop: '24px' }}>
                <div style={{
                  padding: '16px',
                  backgroundColor: 'rgba(0,0,0,0.4)',
                  borderRadius: '6px',
                  textAlign: 'left',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  color: '#f87171',
                  overflow: 'auto',
                  maxHeight: '128px',
                  border: '1px solid rgba(239, 68, 68, 0.1)'
                }}>
                    <p>LOG: {error.message || 'Blueprints missing from manifest.'}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '24px' }}>
                    <button 
                      onClick={() => reset()} 
                      style={{
                        width: '100%',
                        height: '48px',
                        fontWeight: 'bold',
                        backgroundColor: '#2563eb',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        fontSize: '12px'
                      }}
                    >
                        Retry Blueprint Load
                    </button>
                    <button 
                      onClick={() => window.location.href = '/vault'} 
                      style={{
                        width: '100%',
                        backgroundColor: 'transparent',
                        color: '#94a3b8',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '10px',
                        fontWeight: 'bold',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                      }}
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
}
