'use client';

/**
 * Scene Nav Dock — right rail of the Scene home.
 * Fast lanes: Vault, write split (keep / new), Artist Home split (view / edit),
 * Leaderboard, Activity, Your circle, Ink store.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  FilePlus2,
  PenLine,
  Settings2,
  Trophy,
  UserRound,
  Users,
  Droplets,
  Bell,
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

const dockShell =
  'group relative flex h-[3.75rem] items-center gap-2.5 rounded-xl border px-3 text-left transition-all duration-300 shadow-[0_8px_28px_rgba(0,0,0,0.14)] backdrop-blur-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:gap-3 sm:px-3.5';

const writeTone =
  'border-border/70 bg-card/55 hover:border-muted-foreground/40';
const writeIconTone =
  'border-muted-foreground/30 bg-muted/40 text-foreground/80';

function DockLink({ item }: { item: DockItem }) {
  const Icon = item.icon;
  return (
    <Link href={item.href} className={cn(dockShell, item.tone)}>
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
            'block font-sans text-[11px] font-bold uppercase leading-tight tracking-wide sm:text-xs',
            item.primary ? 'text-primary' : 'text-foreground'
          )}
        >
          {item.label}
        </span>
        <span className="mt-0.5 block font-code text-[8px] font-bold uppercase leading-tight tracking-[0.12em] text-muted-foreground/70 sm:text-[9px] sm:tracking-[0.16em]">
          {item.sub}
        </span>
      </span>
    </Link>
  );
}

const splitShell =
  'relative flex h-[3.75rem] overflow-hidden rounded-xl border transition-all duration-300 shadow-[0_8px_28px_rgba(0,0,0,0.14)] backdrop-blur-md hover:-translate-y-0.5';
const splitPrimaryLink =
  'flex min-w-0 flex-1 items-center gap-2 px-2.5 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 sm:gap-2.5 sm:px-3';
const splitSideLink =
  'flex w-[3.15rem] shrink-0 flex-col items-center justify-center gap-0.5 px-0.5 transition-colors hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50 sm:w-[3.35rem]';
const splitSideLabel =
  'text-center font-sans text-[9px] font-semibold uppercase leading-[1.05] tracking-wide text-foreground';
const splitTitle =
  'block font-sans text-[11px] font-bold uppercase leading-tight tracking-wide text-foreground sm:text-xs';
const splitSub =
  'mt-0.5 block font-code text-[8px] font-bold uppercase leading-tight tracking-[0.12em] text-muted-foreground/70 sm:text-[9px] sm:tracking-[0.16em]';

/** One dock control: primary = keep writing, split action = start new track. */
function WriteSplitButton({
  lastTrackPath,
  newTrackHref,
}: {
  lastTrackPath: string;
  newTrackHref: string;
}) {
  return (
    <div className={cn(splitShell, 'border-border/70 bg-card/55 hover:border-muted-foreground/40')}>
      <Link href={lastTrackPath} className={splitPrimaryLink}>
        <span
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
            writeIconTone
          )}
        >
          <PenLine className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={splitTitle}>Keep writing</span>
          <span className={splitSub}>Last sheet</span>
        </span>
      </Link>

      <div className="my-2 w-px shrink-0 self-stretch bg-border/70" aria-hidden />

      <Link
        href={newTrackHref}
        title="Start a track"
        aria-label="Start a track"
        className={splitSideLink}
      >
        <FilePlus2 className="h-3.5 w-3.5 text-foreground/80" />
        <span className={splitSideLabel}>
          Start
          <br />
          track
        </span>
      </Link>
    </div>
  );
}

/** One dock control: view live Artist Home + edit public page. */
function ArtistHomeSplitButton({
  profileHref,
  isLive,
}: {
  profileHref: string;
  isLive: boolean;
}) {
  return (
    <div
      className={cn(
        splitShell,
        'border-sky-500/35 bg-gradient-to-r from-sky-500/10 via-card/85 to-card/70 hover:border-sky-400/55'
      )}
    >
      <Link href={profileHref} className={splitPrimaryLink}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-400/50 bg-sky-500/15 text-sky-400">
          <UserRound className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className={splitTitle}>Artist Home</span>
          <span className={splitSub}>{isLive ? 'Live on web' : 'Preview'}</span>
        </span>
      </Link>

      <div className="my-2 w-px shrink-0 self-stretch bg-border/70" aria-hidden />

      <Link
        href="/profile/customize"
        title="Edit Public Page"
        aria-label="Edit Public Page"
        className={splitSideLink}
      >
        <Settings2 className="h-3.5 w-3.5 text-sky-300/90" />
        <span className={splitSideLabel}>
          Edit
          <br />
          page
        </span>
      </Link>
    </div>
  );
}

export function SceneNavDock({ compact = false, className }: SceneNavDockProps) {
  const { summary, loading } = useGamification();
  const { total: alertCount } = useSocialAlerts();
  const [lastTrackPath, setLastTrackPath] = useState<string | null>(null);

  useEffect(() => {
    setLastTrackPath(getLastWorkedTrackPath());
  }, []);

  const isLive = Boolean(summary.publicProfile && summary.profileSlug);
  const profileHref = summary.profileSlug ? `/profile/${summary.profileSlug}` : null;
  const newTrackHref = `${VAULT_PATH}?create=track`;

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
      key: 'leaderboard',
      href: '/leaderboard',
      label: 'Leaderboard',
      sub: 'Weekly rankings',
      icon: Trophy,
      tone: 'border-amber-500/30 bg-card/55 hover:border-amber-400/50',
      iconTone: 'border-amber-400/45 bg-amber-500/15 text-amber-400',
    },
    {
      key: 'activity',
      href: '/activity',
      label: 'Activity',
      sub: alertCount > 0 ? `${alertCount > 99 ? '99+' : alertCount} new` : 'Loves · replies · requests',
      icon: Bell,
      tone: 'border-emerald-500/30 bg-card/55 hover:border-emerald-400/50',
      iconTone: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-400',
      badge: alertCount,
    },
    {
      key: 'circle',
      href: '/friends',
      label: 'Your circle',
      sub: 'Friends & blocks',
      icon: Users,
      tone: 'border-sky-500/30 bg-card/55 hover:border-sky-400/50',
      iconTone: 'border-sky-400/45 bg-sky-500/15 text-sky-400',
    },
    {
      key: 'ink',
      href: '/usage?tab=buy-ink',
      label: 'Ink store',
      sub: 'Top up your Ink',
      icon: Droplets,
      tone: writeTone,
      iconTone: writeIconTone,
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
      <DockLink item={items[0]!} />

      {lastTrackPath ? (
        <WriteSplitButton lastTrackPath={lastTrackPath} newTrackHref={newTrackHref} />
      ) : (
        <DockLink
          item={{
            key: 'new-track',
            href: newTrackHref,
            label: 'Start a track',
            sub: 'Open a fresh sheet',
            icon: FilePlus2,
            tone: writeTone,
            iconTone: writeIconTone,
          }}
        />
      )}

      {isLive && profileHref ? (
        <ArtistHomeSplitButton profileHref={profileHref} isLive={isLive} />
      ) : (
        <DockLink
          item={{
            key: 'customize',
            href: '/profile/customize',
            label: 'Edit Public Page',
            sub: 'Set up your page',
            icon: Settings2,
            tone: writeTone,
            iconTone: writeIconTone,
          }}
        />
      )}

      {items.slice(1).map((item) => (
        <DockLink key={item.key} item={item} />
      ))}
    </nav>
  );
}
