'use client';

/**
 * Scene Nav Dock — right rail of the Scene home.
 * Fast lanes into every surface: Vault (primary), keep writing, Artist Home,
 * Edit Public Page, Leaderboard, Your circle, Ink store.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  PenLine,
  Settings2,
  Trophy,
  UserRound,
  Users,
  Droplets,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useGamification } from '@/context/gamification-context';
import { useSocialAlerts } from '@/hooks/use-social-alerts';
import { getLastWorkedTrackPath } from '@/lib/studio-tips-session';
import { VAULT_PATH } from '@/lib/scene-home';

type SceneNavDockProps = {
  /** Horizontal strip on < xl. */
  compact?: boolean;
  className?: string;
};

type DockItem = {
  key: string;
  href: string;
  label: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  iconTone: string;
  primary?: boolean;
  badge?: number;
};

export function SceneNavDock({ compact = false, className }: SceneNavDockProps) {
  const { summary, loading } = useGamification();
  const { total: alertCount } = useSocialAlerts();
  const [lastTrackPath, setLastTrackPath] = useState<string | null>(null);

  useEffect(() => {
    setLastTrackPath(getLastWorkedTrackPath());
  }, []);

  const isLive = Boolean(summary.publicProfile && summary.profileSlug);
  const profileHref = summary.profileSlug ? `/profile/${summary.profileSlug}` : null;

  const items: DockItem[] = [
    {
      key: 'vault',
      href: VAULT_PATH,
      label: 'The Vault',
      sub: 'Albums · tracks · DNA',
      icon: Archive,
      tone: 'border-primary/45 bg-gradient-to-r from-primary/15 via-card/85 to-card/70 hover:border-primary/70',
      iconTone: 'border-primary/50 bg-primary/15 text-primary',
      primary: true,
    },
    {
      key: 'write',
      href: lastTrackPath ?? `${VAULT_PATH}?create=track`,
      label: lastTrackPath ? 'Keep writing' : 'Start a track',
      sub: lastTrackPath ? 'Back to your last sheet' : 'Open a fresh sheet',
      icon: PenLine,
      tone: 'border-border/70 bg-card/55 hover:border-muted-foreground/40',
      iconTone: 'border-muted-foreground/30 bg-muted/40 text-foreground/80',
    },
    ...(isLive && profileHref
      ? [
          {
            key: 'home',
            href: profileHref,
            label: 'My Artist Home',
            sub: 'Live on the web',
            icon: UserRound,
            tone: 'border-sky-500/35 bg-gradient-to-r from-sky-500/10 via-card/85 to-card/70 hover:border-sky-400/55',
            iconTone: 'border-sky-400/50 bg-sky-500/15 text-sky-400',
          } satisfies DockItem,
        ]
      : []),
    {
      key: 'customize',
      href: '/profile/customize',
      label: 'Edit Public Page',
      sub: isLive ? 'Skin · modules · rooms' : 'Set up your page',
      icon: Settings2,
      tone: 'border-border/70 bg-card/55 hover:border-muted-foreground/40',
      iconTone: 'border-muted-foreground/30 bg-muted/40 text-foreground/80',
    },
    {
      key: 'leaderboard',
      href: '/leaderboard',
      label: 'Leaderboard',
      sub: 'Weekly rankings',
      icon: Trophy,
      tone: 'border-amber-500/30 bg-card/55 hover:border-amber-400/50',
      iconTone: 'border-amber-400/45 bg-amber-500/15 text-amber-400',
    },
    {
      key: 'circle',
      href: '/friends',
      label: 'Your circle',
      sub: alertCount > 0 ? `${alertCount > 99 ? '99+' : alertCount} new` : 'Friends & blocks',
      icon: Users,
      tone: 'border-emerald-500/30 bg-card/55 hover:border-emerald-400/50',
      iconTone: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-400',
      badge: alertCount,
    },
    {
      key: 'ink',
      href: '/usage?tab=buy-ink',
      label: 'Ink store',
      sub: 'Top up your Ink',
      icon: Droplets,
      tone: 'border-border/70 bg-card/55 hover:border-muted-foreground/40',
      iconTone: 'border-muted-foreground/30 bg-muted/40 text-foreground/80',
    },
  ];

  if (loading && !compact) return null;

  return (
    <nav
      className={cn(
        compact
          ? 'grid w-full grid-cols-2 gap-2 sm:grid-cols-3'
          : 'flex w-56 flex-col gap-2.5',
        className
      )}
      aria-label="Scene shortcuts"
      data-tour={compact ? 'scene-nav-mobile' : 'scene-nav-desktop'}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-300',
              'shadow-[0_8px_28px_rgba(0,0,0,0.14)] backdrop-blur-md hover:-translate-y-0.5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              item.tone
            )}
          >
            <span
              className={cn(
                'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                item.iconTone
              )}
            >
              <Icon className="h-4 w-4" />
              {Boolean(item.badge && item.badge > 0) && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-black shadow-[0_0_10px_rgba(16,185,129,0.55)]"
                  aria-label={`${item.badge} social alerts`}
                >
                  {item.badge! > 99 ? '99+' : item.badge}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  'block truncate font-headline text-xs font-bold uppercase leading-tight tracking-tight',
                  item.primary ? 'text-primary' : 'text-foreground'
                )}
              >
                {item.label}
              </span>
              <span className="mt-0.5 block truncate font-code text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground/70">
                {item.sub}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
