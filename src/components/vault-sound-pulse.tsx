'use client';

import React from 'react';
import { cn } from '@/lib/utils';

const RIPPLE_COUNT = 4;

/**
 * Full-page speaker ripples from center — 21s loop:
 * beat @ 0s → +3s → +6s → +9s → +3s (restart)
 */
export function VaultSpeakerRippleBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute inset-0 overflow-hidden vault-speaker-ripple-stage',
        className
      )}
      aria-hidden
    >
      <div className="absolute left-1/2 top-[40%] h-0 w-0 -translate-x-1/2 -translate-y-1/2">
        <div className="vault-speaker-core absolute left-0 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full" />

        {Array.from({ length: RIPPLE_COUNT }, (_, i) => (
          <div
            key={i}
            className="vault-speaker-ripple absolute left-0 top-0 rounded-full"
            style={{ animationDelay: `${i * 0.22}s` }}
          />
        ))}
      </div>
    </div>
  );
}
