'use client';

import React from 'react';
import Image from 'next/image';
import { VaultChamberAtmosphere } from '@/components/vault-chamber-atmosphere';
import { LOGIN_STUDIO_BACKGROUND_PATH } from '@/lib/brand';

/** One continuous studio sky + vault chamber — same layers in light & dark (colors via CSS). */
export function LoginStudioAtmosphere() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
      <Image
        src={LOGIN_STUDIO_BACKGROUND_PATH}
        alt=""
        fill
        priority
        className="object-cover object-top opacity-[0.32] dark:opacity-[0.38] blur-[1.5px] scale-105"
        sizes="100vw"
      />
      <div className="absolute inset-0 studio-sky-wash dark:hidden" />
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, hsl(216 28% 12% / 0.15) 35%, hsl(216 28% 11% / 0.55) 70%, hsl(216 28% 10% / 0.85) 100%)',
        }}
      />
      <VaultChamberAtmosphere unmasked />
      <div className="studio-page-vignette absolute inset-0 smooth-gradient-layer opacity-90 dark:opacity-100" />
    </div>
  );
}
