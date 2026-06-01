'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { VaultSpeakerRippleBackground } from '@/components/vault-sound-pulse';

/**
 * Vault chamber atmosphere — moiré drift + floor lift + center speaker ripples (21s cycle).
 */
export function VaultChamberAtmosphere({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-[1] overflow-hidden vault-chamber',
        className
      )}
      aria-hidden
    >
      <VaultSpeakerRippleBackground />

      <div className="vault-chamber-moire-a absolute inset-[-12%]" />
      <div className="vault-chamber-moire-b absolute inset-[-12%]" />
      <div className="vault-chamber-floor absolute inset-x-0 bottom-0 h-[38vh]" />
      <div className="vault-chamber-lift absolute inset-0" />
      <div className="vault-chamber-sill absolute inset-x-0 top-[78%] h-px" />
    </div>
  );
}
