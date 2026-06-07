'use client';

import React from 'react';
import Image from 'next/image';
import { VaultChamberAtmosphere } from '@/components/vault-chamber-atmosphere';

/** One continuous studio sky + vault chamber — no section cuts, ripples unmasked. */
export function LoginStudioAtmosphere() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <Image
        src="/Bar 4 Bar background.png"
        alt=""
        fill
        priority
        className="object-cover object-top opacity-[0.38] blur-[1.5px] scale-105"
        sizes="100vw"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, hsl(216 50% 8% / 0.15) 35%, hsl(216 50% 8% / 0.55) 70%, hsl(216 50% 7% / 0.85) 100%)',
        }}
      />
      <VaultChamberAtmosphere unmasked className="opacity-100" />
      <div className="studio-page-vignette absolute inset-0 smooth-gradient-layer" />
    </div>
  );
}
