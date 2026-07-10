'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { UpgradeTooltip } from '@/components/upgrade-tooltip';
import { PRO_LOCK, proLockShell, proLockIcon, proLockText, markBarAnchorGlow } from '@/lib/pro-lock';

export { PRO_LOCK, proLockShell, proLockIcon, proLockText, markBarAnchorGlow };

/** Gray icon + centered lock — tier-limit vault cards (not action buttons). */
export function IconWithLockOverlay({
  icon: Icon,
  iconClassName,
  size = 'md',
}: {
  icon: LucideIcon;
  iconClassName?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const dim = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  const lockDim = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5';
  return (
    <span className="relative inline-flex h-full w-full items-center justify-center shrink-0">
      <Icon className={cn(dim, 'text-muted-foreground/45', iconClassName)} aria-hidden />
      <Lock
        className={cn(
          'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none',
          lockDim,
          proLockIcon()
        )}
        aria-hidden
      />
    </span>
  );
}

/** Subtle dashed border — locked affordance without stacking icons. */
const lockedActionShell = 'border border-dashed border-pink-500/35';

export function LockedProFeatureButton({
  feature,
  benefit,
  example,
  ctaLabel,
  ctaHref,
  icon: Icon,
  label,
  className,
  iconClassName,
  variant = 'secondary',
  size = 'sm',
}: {
  feature: string;
  benefit: string;
  example?: string;
  ctaLabel?: string;
  ctaHref?: string;
  icon: LucideIcon;
  label: React.ReactNode;
  className?: string;
  iconClassName?: string;
  variant?: 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'icon';
}) {
  return (
    <UpgradeTooltip feature={feature} benefit={benefit} example={example} ctaLabel={ctaLabel} ctaHref={ctaHref}>
      <Button
        variant={variant}
        size={size}
        type="button"
        className={cn(
          'relative min-w-0 cursor-not-allowed',
          size !== 'icon' && 'justify-start leading-none gap-0',
          lockedActionShell,
          className
        )}
        onClick={(e) => e.preventDefault()}
      >
        <Icon className={cn('h-4 w-4 shrink-0 mr-2', iconClassName)} aria-hidden />
        {size !== 'icon' && (
          <>
            <span className="truncate min-w-0 flex-1 text-left">{label}</span>
            <Lock className={cn('h-3 w-3 shrink-0 ml-1.5', proLockIcon())} aria-hidden />
          </>
        )}
      </Button>
    </UpgradeTooltip>
  );
}

/** Gold styling for Pro “create new” album / track slots — bright at rest, richer on hover. */
export const GOLD_CREATE_SLOT = {
  shell:
    'border-amber-400/40 bg-amber-500/[0.07] group-hover:border-amber-300/55 group-hover:bg-amber-400/[0.12] group-hover:shadow-[0_0_28px_rgba(251,191,36,0.28)]',
  inner:
    'border-amber-400/45 bg-amber-500/[0.1] group-hover:border-amber-300/60 group-hover:bg-amber-400/20',
  plus: 'text-amber-700 dark:text-amber-200/80 group-hover:text-amber-900 dark:group-hover:text-amber-50',
  title: 'text-amber-900/90 dark:text-amber-100/85 group-hover:text-amber-950 dark:group-hover:text-amber-50',
  sub: 'text-amber-800/75 dark:text-amber-300/65 group-hover:text-amber-900 dark:group-hover:text-amber-100/90',
} as const;

export function LockedSaveButton({
  feature,
  benefit,
  example,
  className,
  size = 'sm',
  icon: Icon = Lock,
  iconClassName,
}: {
  feature: string;
  benefit: string;
  example?: string;
  className?: string;
  size?: 'sm' | 'md';
  icon?: LucideIcon;
  iconClassName?: string;
}) {
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const iconDim = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <UpgradeTooltip
      feature={feature}
      benefit={benefit}
      example={example ?? `Example: save "${feature}" on this track and reuse it on every song in the album.`}
    >
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className={cn(
          dim,
          lockedActionShell,
          'flex items-center justify-center p-0 cursor-not-allowed',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Icon className={cn(iconDim, iconClassName)} aria-hidden />
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
        variant === 'album' ? 'aspect-square' : 'min-h-[96px] rounded-2xl',
        proLockShell('lg'),
        'border-2 border-dashed cursor-not-allowed',
        variant === 'album' && 'rounded-full',
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-pink-600/5 via-transparent to-pink-600/5 pointer-events-none" aria-hidden />
      <Lock className={cn('h-9 w-9 mb-3 relative z-10', proLockIcon())} />
      <p className="font-headline font-bold text-foreground uppercase text-base tracking-tight relative z-10">{label}</p>
      <p className={cn('text-xs uppercase tracking-widest mt-2 relative z-10', proLockText())}>{sublabel}</p>
      <p className={cn('text-[10px] uppercase mt-3 px-2.5 py-1 rounded border border-pink-500/40 bg-pink-600/15 relative z-10', proLockText())}>
        Studio Pro
      </p>
    </div>
  );

  return (
    <UpgradeTooltip
      feature={label}
      benefit={sublabel}
      example="Example: your second album slot unlocks with Pro — keep separate concepts without deleting work."
    >
      <div className="pointer-events-auto">{inner}</div>
    </UpgradeTooltip>
  );
}

export function ProCreateAlbumSlot({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative aspect-square block w-full text-left opacity-80 hover:opacity-100 dark:opacity-50 dark:hover:opacity-100 transition-opacity duration-300"
    >
      <div
        className={cn(
          'absolute inset-0 rounded-full border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all',
          GOLD_CREATE_SLOT.shell
        )}
      >
        <div
          className={cn(
            'w-14 h-14 rounded-full border border-dashed flex items-center justify-center transition-all',
            GOLD_CREATE_SLOT.inner
          )}
        >
          <span className={cn('text-2xl font-light', GOLD_CREATE_SLOT.plus)}>+</span>
        </div>
        <div className="text-center px-4">
          <p className={cn('font-headline font-bold uppercase text-sm tracking-tight', GOLD_CREATE_SLOT.title)}>
            New Album
          </p>
          <p className={cn('text-[8px] uppercase tracking-widest mt-1 font-bold', GOLD_CREATE_SLOT.sub)}>
            Create concept project
          </p>
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
      className={cn(
        'group w-full py-4 px-6 rounded-2xl border-2 border-dashed opacity-80 hover:opacity-100 dark:opacity-50 dark:hover:opacity-100 transition-all flex items-center gap-4 text-left',
        GOLD_CREATE_SLOT.shell
      )}
    >
      <div
        className={cn(
          'p-2 rounded-xl border border-dashed shrink-0 transition-all',
          GOLD_CREATE_SLOT.inner
        )}
      >
        <span className={cn('text-lg font-light block w-5 h-5 text-center leading-5', GOLD_CREATE_SLOT.plus)}>+</span>
      </div>
      <div>
        <p className={cn('text-base font-bold uppercase', GOLD_CREATE_SLOT.title)}>New Loose Track</p>
        <p className={cn('text-[10px] uppercase tracking-widest font-bold', GOLD_CREATE_SLOT.sub)}>
          Capture a single · tap to create
        </p>
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
          <p className="font-headline font-bold text-foreground uppercase text-sm tracking-tight">Album Slot</p>
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
        <p className="text-base font-bold uppercase text-foreground">Track Slot</p>
        <p className="text-xs text-sky-400/80 uppercase tracking-widest font-bold">Open · Tap to capture</p>
      </div>
    </button>
  );
}

export function LockedToolbarButton({
  feature,
  benefit,
  example,
  icon: Icon,
  buttonClassName,
}: {
  feature: string;
  benefit: string;
  example?: string;
  icon: LucideIcon;
  buttonClassName?: string;
}) {
  return (
    <UpgradeTooltip
      feature={feature}
      benefit={benefit}
      example={example ?? 'Upgrade to Studio Pro to unlock this vault action.'}
    >
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className={cn(
          'h-10 w-10 border border-border bg-muted/80 dark:border-white/5 dark:bg-black/40 rounded-xl flex items-center justify-center p-0 cursor-not-allowed',
          lockedActionShell,
          buttonClassName
        )}
        onClick={(e) => e.preventDefault()}
      >
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
      </Button>
    </UpgradeTooltip>
  );
}

export function ProLockBadge({ label = 'System Preset', className }: { label?: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-[7px] px-1.5 py-0.5 rounded-md shrink-0 max-w-full leading-none', proLockShell('sm'), proLockText(), className)}>
      <Lock className={cn('h-2.5 w-2.5 shrink-0', proLockIcon())} />
      <span className="truncate">{label}</span>
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
