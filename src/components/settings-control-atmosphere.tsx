'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { STUDIO_GRAIN_URI } from '@/components/studio-page-background';

/**
 * Ink Store / Settings control room — hex lattice + calibration reticle.
 * Distinct from vault moiré chamber and default mesh gradient pages.
 */
export function SettingsControlAtmosphere({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-0 overflow-hidden settings-control-room',
        className
      )}
      aria-hidden
    >
      <div className="absolute inset-0 settings-control-base" />

      <div className="settings-control-hex absolute inset-[-15%]" />
      <div className="settings-control-grid absolute inset-0" />

      <div className="absolute left-1/2 top-[42%] h-[min(92vmin,640px)] w-[min(92vmin,640px)] -translate-x-1/2 -translate-y-1/2">
        <div className="settings-control-reticle absolute inset-0 rounded-full" />
        <div className="settings-control-reticle-inner absolute inset-[18%] rounded-full" />
      </div>

      <div className="absolute right-[-8%] top-[-12%] h-[min(48vh,420px)] w-[min(55vw,520px)] rounded-full bg-teal-400/[0.09] blur-[100px] sm:blur-[130px]" />
      <div className="absolute bottom-[-10%] left-[-6%] h-[min(42vh,380px)] w-[min(50vw,480px)] rounded-full bg-violet-500/[0.1] blur-[95px] sm:blur-[120px]" />
      <div className="absolute top-[55%] right-[5%] h-[min(28vh,260px)] w-[min(35vw,320px)] rounded-full bg-amber-500/[0.06] blur-[80px]" />

      <div className="settings-control-scan absolute inset-x-0 top-0 h-[18vh]" />

      <div className="absolute inset-0 settings-control-vignette" />

      <div
        className="absolute inset-0 opacity-[0.02] mix-blend-soft-light"
        style={{
          backgroundImage: `url("${STUDIO_GRAIN_URI}")`,
          backgroundSize: '240px 240px',
        }}
      />
    </div>
  );
}
