'use client';

/**
 * Vault Profile Dock — lives in the empty right rail of The Vault.
 * Artist Home visibility + The Block (feed) with social alert badge.
 */

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { Bell, Disc3, Settings2, UserRound } from 'lucide-react';
import { useGamification } from '@/context/gamification-context';
import { useAuth } from '@/hooks/use-auth';
import { useSocialAlerts } from '@/hooks/use-social-alerts';
import { cn } from '@/lib/utils';
import { ReleaseCatalogDialog } from '@/components/vault/release-catalog';
import { useReleaseCatalogReopenListener } from '@/lib/release-catalog-navigation';
import { ArtistHomeVisibilityDialog } from '@/components/profile/artist-home-visibility-dialog';

type VaultProfileDockProps = {
  /** Horizontal strip under vault progress on < xl. */
  compact?: boolean;
  className?: string;
};

function AlertBadge({ count, compact }: { count: number; compact?: boolean }) {
  if (count <= 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span
      className={cn(
        'absolute flex items-center justify-center rounded-full bg-emerald-500 font-bold text-black shadow-[0_0_10px_rgba(16,185,129,0.55)]',
        compact
          ? '-right-1 -top-1 h-4 min-w-4 px-1 text-[9px]'
          : '-right-0.5 -top-0.5 h-[1.05rem] min-w-[1.05rem] px-1 text-[9px]'
      )}
      aria-label={`${count} social alerts`}
    >
      {label}
    </span>
  );
}

export function VaultProfileDock({ compact = false, className }: VaultProfileDockProps) {
  const { summary, loading } = useGamification();
  const { user } = useAuth();
  const { total: alertCount } = useSocialAlerts();
  const [open, setOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  useReleaseCatalogReopenListener(useCallback(() => setCatalogOpen(true), []));

  if (!user || loading) return null;

  const isLive = Boolean(summary.publicProfile && summary.profileSlug);

  const shellClass = compact
    ? cn('flex w-full flex-col gap-2', className)
    : cn('flex flex-col items-stretch gap-2.5', className);

  const homeBtnClass = cn(
    'group relative text-left transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
    compact
      ? cn(
          'flex w-full items-center gap-3 rounded-xl border px-3.5 py-3',
          isLive
            ? 'border-sky-500/35 bg-gradient-to-r from-sky-500/10 via-card/80 to-card/60 hover:border-sky-400/55'
            : 'border-border/70 bg-card/50 hover:border-border'
        )
      : cn(
          'flex w-[4.75rem] flex-col items-center gap-3 rounded-2xl border px-2.5 py-4',
          'shadow-[0_8px_28px_rgba(0,0,0,0.18)] backdrop-blur-md',
          'hover:-translate-y-0.5',
          isLive
            ? 'border-sky-500/40 bg-gradient-to-b from-sky-500/15 via-card/85 to-card/70 hover:border-sky-400/60 hover:shadow-[0_10px_32px_rgba(14,165,233,0.22)]'
            : 'border-border/60 bg-card/55 hover:border-muted-foreground/35'
        )
  );

  const blockBtnClass = cn(
    'group relative text-left transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40',
    compact
      ? 'flex w-full items-center gap-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card/80 to-card/60 px-3.5 py-3 hover:border-emerald-400/50'
      : cn(
          'flex w-[4.75rem] flex-col items-center gap-3 rounded-2xl border px-2.5 py-4',
          'border-emerald-500/35 bg-gradient-to-b from-emerald-500/12 via-card/85 to-card/70',
          'shadow-[0_8px_28px_rgba(0,0,0,0.18)] backdrop-blur-md',
          'hover:-translate-y-0.5 hover:border-emerald-400/55 hover:shadow-[0_10px_32px_rgba(16,185,129,0.2)]'
        )
  );

  const catalogBtnClass = cn(
    'group relative text-left transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45',
    compact
      ? 'flex w-full items-center gap-3 rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500/10 via-card/80 to-card/60 px-3.5 py-3 hover:border-cyan-300/55'
      : cn(
          'flex w-[4.75rem] flex-col items-center gap-3 rounded-2xl border px-2.5 py-4',
          'border-cyan-400/35 bg-gradient-to-b from-cyan-500/12 via-card/85 to-card/70',
          'shadow-[0_8px_28px_rgba(0,0,0,0.18)] backdrop-blur-md',
          'hover:-translate-y-0.5 hover:border-cyan-300/60 hover:shadow-[0_10px_32px_rgba(34,211,238,0.2)]'
        )
  );

  return (
    <>
      <div
        className={shellClass}
        data-tour={compact ? 'vault-social-dock-mobile' : 'vault-social-dock-desktop'}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={
            isLive
              ? 'Artist Home is public. Open visibility settings.'
              : 'Artist Home is private. Open visibility settings.'
          }
          className={homeBtnClass}
        >
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full border',
              compact ? 'h-9 w-9' : 'h-10 w-10',
              isLive
                ? 'border-sky-400/50 bg-sky-500/15 text-sky-400 shadow-[0_0_18px_rgba(14,165,233,0.25)]'
                : 'border-muted-foreground/25 bg-muted/40 text-muted-foreground/70'
            )}
          >
            <UserRound className="h-4 w-4" />
          </span>

          <span className={cn('min-w-0', compact ? 'flex-1' : 'w-full text-center')}>
            <span
              className={cn(
                'block font-headline font-bold uppercase leading-tight tracking-tight',
                compact ? 'text-xs' : 'text-[10px]',
                isLive ? 'text-foreground' : 'text-muted-foreground/80'
              )}
            >
              {compact ? (
                'Artist Home'
              ) : (
                <>
                  Artist
                  <br />
                  Home
                </>
              )}
            </span>
            <span
              className={cn(
                'mt-1 block font-code font-bold uppercase tracking-[0.18em]',
                compact ? 'text-[9px]' : 'text-[8px]',
                isLive ? 'text-sky-400' : 'text-muted-foreground/55'
              )}
            >
              {isLive ? 'Live' : 'Public off'}
            </span>
          </span>

          {!compact && (
            <span
              className={cn(
                'mt-1 h-1 w-1 rounded-full',
                isLive ? 'bg-sky-400 shadow-[0_0_8px_rgba(14,165,233,0.8)]' : 'bg-muted-foreground/35'
              )}
            />
          )}

          {compact && (
            <Settings2
              className={cn(
                'h-3.5 w-3.5 shrink-0 transition-colors',
                isLive ? 'text-sky-400/80 group-hover:text-sky-300' : 'text-muted-foreground/50'
              )}
            />
          )}
        </button>

        <Link
          href="/activity"
          aria-label={
            alertCount > 0
              ? `Activity — ${alertCount} unread`
              : 'Activity — loves, replies, requests'
          }
          className={blockBtnClass}
        >
          <span
            className={cn(
              'relative flex shrink-0 items-center justify-center rounded-full border border-emerald-400/45 bg-emerald-500/15 text-emerald-400',
              compact ? 'h-9 w-9' : 'h-10 w-10',
              alertCount > 0 && 'shadow-[0_0_18px_rgba(16,185,129,0.3)]'
            )}
          >
            <Bell className="h-4 w-4" />
            <AlertBadge count={alertCount} compact={compact} />
          </span>

          <span className={cn('min-w-0', compact ? 'flex-1' : 'w-full text-center')}>
            <span
              className={cn(
                'block font-headline font-bold uppercase leading-tight tracking-tight text-foreground',
                compact ? 'text-xs' : 'text-[10px]'
              )}
            >
              Activity
            </span>
            <span
              className={cn(
                'mt-1 block font-code font-bold uppercase tracking-[0.18em] text-emerald-400/90',
                compact ? 'text-[9px]' : 'text-[8px]'
              )}
            >
              {alertCount > 0 ? `${alertCount > 99 ? '99+' : alertCount} new` : 'Inbox'}
            </span>
          </span>

          {!compact && (
            <span
              className={cn(
                'mt-1 h-1 w-1 rounded-full',
                alertCount > 0
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.85)]'
                  : 'bg-emerald-500/40'
              )}
            />
          )}
        </Link>

        <button
          type="button"
          onClick={() => setCatalogOpen(true)}
          aria-label="Open Release Catalog"
          className={catalogBtnClass}
        >
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full border border-cyan-300/45 bg-cyan-400/15 text-cyan-200',
              compact ? 'h-9 w-9' : 'h-10 w-10'
            )}
          >
            <Disc3 className="h-4 w-4" />
          </span>
          <span className={cn('min-w-0', compact ? 'flex-1' : 'w-full text-center')}>
            <span
              className={cn(
                'block whitespace-normal font-headline font-bold uppercase leading-tight tracking-tight text-foreground',
                compact ? 'text-sm' : 'text-xs'
              )}
            >
              {compact ? (
                'Release Catalog'
              ) : (
                <>
                  Release
                  <br />
                  Catalog
                </>
              )}
            </span>
            <span
              className={cn(
                'mt-1 block font-code font-bold uppercase tracking-[0.18em] text-cyan-300/90',
                compact ? 'text-[10px]' : 'text-[9px]'
              )}
            >
              Manage
            </span>
          </span>
          {!compact ? (
            <span className="mt-1 h-1 w-1 rounded-full bg-cyan-300/55 shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
          ) : (
            <Settings2 className="h-3.5 w-3.5 shrink-0 text-cyan-300/70 transition-colors group-hover:text-cyan-200" />
          )}
        </button>
      </div>

      <ReleaseCatalogDialog open={catalogOpen} onOpenChange={setCatalogOpen} />

      <ArtistHomeVisibilityDialog open={open} onOpenChange={setOpen} variant="settings" />
    </>
  );
}
