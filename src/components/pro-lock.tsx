'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UpgradeTooltip } from '@/components/upgrade-tooltip';
import { PRO_LOCK, proLockShell, proLockIcon, proLockText, markBarAnchorGlow } from '@/lib/pro-lock';

export { PRO_LOCK, proLockShell, proLockIcon, proLockText, markBarAnchorGlow };

export function LockedSaveButton({
  feature,
  benefit,
  className,
  size = 'sm',
}: {
  feature: string;
  benefit: string;
  className?: string;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-4 w-4';
  return (
    <UpgradeTooltip feature={feature} benefit={benefit} example="Upgrade to Studio Pro to archive your own strains.">
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className={cn(
          dim,
          proLockShell('sm'),
          PRO_LOCK.color,
          'cursor-not-allowed hover:bg-pink-500/20',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Lock className={cn(icon, proLockIcon())} />
      </Button>
    </UpgradeTooltip>
  );
}

export function LockedVaultSlot({
  label,
  sublabel,
  variant = 'album',
  className,
}: {
  label: string;
  sublabel: string;
  variant?: 'album' | 'track';
  className?: string;
}) {
  const inner = (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center text-center p-6 overflow-hidden',
        variant === 'album' ? 'aspect-square' : 'min-h-[88px] rounded-2xl',
        proLockShell('lg'),
        'border-2 border-dashed cursor-not-allowed',
        variant === 'album' && 'rounded-full',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-pink-600/5 via-transparent to-pink-600/5 pointer-events-none" aria-hidden />
      <Lock className={cn('h-9 w-9 mb-3 relative z-10', proLockIcon())} />
      <p className="font-headline font-bold text-white uppercase text-sm tracking-tight relative z-10">{label}</p>
      <p className={cn('text-[8px] uppercase tracking-widest mt-2 relative z-10', proLockText())}>{sublabel}</p>
      <p className={cn('text-[7px] uppercase mt-3 px-2 py-0.5 rounded border border-pink-500/40 bg-pink-600/15 relative z-10', proLockText())}>
        Studio Pro
      </p>
    </div>
  );

  return (
    <UpgradeTooltip feature={label} benefit={sublabel} example="Unlock unlimited albums and tracks with Pro.">
      <div className="pointer-events-auto">{inner}</div>
    </UpgradeTooltip>
  );
}

export function ProCreateAlbumSlot({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square block w-full text-left opacity-50 hover:opacity-100 transition-opacity duration-300"
    >
      <div className="absolute inset-0 rounded-full border-2 border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center gap-3 transition-all group-hover:border-emerald-500/40 group-hover:bg-emerald-500/[0.04] group-hover:shadow-[0_0_24px_rgba(16,185,129,0.12)]">
        <div className="w-14 h-14 rounded-full border border-dashed border-white/20 bg-white/[0.03] flex items-center justify-center group-hover:border-emerald-500/50 group-hover:bg-emerald-500/10 transition-all">
          <span className="text-2xl text-white/40 font-light group-hover:text-emerald-400">+</span>
        </div>
        <div className="text-center px-4">
          <p className="font-headline font-bold text-white/50 uppercase text-sm tracking-tight group-hover:text-white">New Album</p>
          <p className="text-[8px] text-white/30 uppercase tracking-widest mt-1 font-bold group-hover:text-emerald-400/80">Create concept project</p>
        </div>
      </div>
    </button>
  );
}

export function ProCreateTrackSlot({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full py-4 px-6 rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] opacity-50 hover:opacity-100 transition-all flex items-center gap-4 text-left hover:border-sky-500/30 hover:bg-sky-500/[0.04] hover:shadow-[0_0_20px_rgba(56,189,248,0.08)]"
    >
      <div className="p-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] shrink-0 group-hover:border-sky-500/40 group-hover:bg-sky-500/10 transition-all">
        <span className="text-lg text-white/40 font-light block w-5 h-5 text-center leading-5 group-hover:text-sky-400">+</span>
      </div>
      <div>
        <p className="text-xs font-bold uppercase text-white/50 group-hover:text-white">New Loose Track</p>
        <p className="text-[8px] text-white/30 uppercase tracking-widest font-bold group-hover:text-sky-400/80">Capture a single · tap to create</p>
      </div>
    </button>
  );
}

export function OpenAlbumSlot({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square block w-full text-left"
    >
      <div className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-500/50 bg-emerald-500/5 flex flex-col items-center justify-center gap-3 transition-all hover:border-emerald-400 hover:bg-emerald-500/10 hover:shadow-[0_0_24px_rgba(16,185,129,0.25)]">
        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
          <span className="text-2xl text-emerald-400 font-light">+</span>
        </div>
        <div className="text-center px-4">
          <p className="font-headline font-bold text-white uppercase text-sm tracking-tight">Album Slot</p>
          <p className="text-[8px] text-emerald-400/80 uppercase tracking-widest mt-1 font-bold">Open · Tap to create</p>
        </div>
      </div>
    </button>
  );
}

export function OpenTrackSlot({ onClick, filled }: { onClick: () => void; filled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full py-4 px-6 rounded-2xl border-2 border-dashed transition-all flex items-center gap-4 text-left',
        'border-sky-500/50 bg-sky-500/5 hover:border-sky-400 hover:bg-sky-500/10 hover:shadow-[0_0_20px_rgba(56,189,248,0.2)]',
        filled && 'opacity-60'
      )}
    >
      <div className="p-2 bg-sky-500/15 rounded-xl border border-sky-500/30 shrink-0">
        <span className="text-lg text-sky-400 font-light block w-5 h-5 text-center leading-5">+</span>
      </div>
      <div>
        <p className="text-xs font-bold uppercase text-white">Track Slot</p>
        <p className="text-[8px] text-sky-400/80 uppercase tracking-widest font-bold">Open · Tap to capture</p>
      </div>
    </button>
  );
}

export function LockedToolbarButton({
  feature,
  benefit,
  children,
}: {
  feature: string;
  benefit: string;
  children: React.ReactNode;
}) {
  return (
    <UpgradeTooltip feature={feature} benefit={benefit}>
      <div className={cn('inline-flex items-center justify-center rounded-xl p-[2px]', proLockShell('sm'))}>
        {children}
      </div>
    </UpgradeTooltip>
  );
}

export function ProLockBadge({ label = 'System Preset', className }: { label?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[7px] px-2 py-0.5 rounded-md shrink-0', proLockShell('sm'), proLockText(), className)}>
      <Lock className={cn('h-2.5 w-2.5', proLockIcon())} />
      {label}
    </span>
  );
}

/** Full-width callout strip for free-tier vault pages */
export function ProLockBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl px-6 py-4 flex items-center gap-4', proLockShell('lg'))}>
      <Lock className={cn('h-7 w-7 shrink-0', proLockIcon())} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
