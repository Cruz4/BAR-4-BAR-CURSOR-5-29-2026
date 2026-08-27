'use client';

/**
 * Scene Nav Dock — right rail of the Scene home.
 * Fast lanes: Vault, write split (keep / new), Artist Home split (view / edit),
 * Activity|Circle split, Ink store.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Archive,
  FilePlus2,
  Library,
  Lock,
  PenLine,
  Settings2,
  UserRound,
  Users,
  Droplets,
  Bell,
  Banknote,
  Disc3,
  BarChart3,
  HeartHandshake,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { profileHref } from '@/lib/profile/profile-slug';
import { useGamification } from '@/context/gamification-context';
import { useSocialAlerts } from '@/hooks/use-social-alerts';
import { useLockFeature } from '@/hooks/use-lock-feature';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { getLastWorkedTrackPath } from '@/lib/studio-tips-session';
import { VAULT_PATH } from '@/lib/scene-home';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';

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
  'group relative flex h-[3.75rem] w-full items-center gap-2.5 rounded-xl border px-3 text-left transition-all duration-300 shadow-[0_8px_28px_rgba(0,0,0,0.14)] backdrop-blur-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:gap-3 sm:px-3.5';

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
  'relative flex h-[3.75rem] w-full overflow-hidden rounded-xl border transition-all duration-300 shadow-[0_8px_28px_rgba(0,0,0,0.14)] backdrop-blur-md hover:-translate-y-0.5';
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

function ActivityCircleSplitButton({
  alertCount,
  className,
}: {
  alertCount: number;
  className?: string;
}) {
  const activitySub =
    alertCount > 0 ? `${alertCount > 99 ? '99+' : alertCount} new` : 'Alerts';

  return (
    <div
      className={cn(
        'relative flex min-h-[3.75rem] w-full overflow-hidden rounded-xl border transition-all duration-300 shadow-[0_8px_28px_rgba(0,0,0,0.14)] backdrop-blur-md hover:-translate-y-0.5',
        'border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-card/85 to-sky-500/10 hover:border-emerald-400/45',
        className
      )}
    >
      <Link
        href="/activity"
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1.5 py-2 text-center transition-colors hover:bg-emerald-500/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400/50"
        aria-label={alertCount > 0 ? `Activity, ${alertCount} new` : 'Activity'}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-400/45 bg-emerald-500/15 text-emerald-400">
          <Bell className="h-3.5 w-3.5" />
          {alertCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[9px] font-bold text-black shadow-[0_0_10px_rgba(16,185,129,0.55)]"
              aria-hidden
            >
              {alertCount > 99 ? '99+' : alertCount}
            </span>
          )}
        </span>
        <span className="min-w-0 w-full px-0.5">
          <span className="block truncate font-sans text-[10px] font-bold uppercase leading-none tracking-wide text-foreground sm:text-[11px]">
            Activity
          </span>
          <span className="mt-0.5 block truncate font-code text-[8px] font-bold uppercase leading-none tracking-[0.12em] text-muted-foreground/70">
            {activitySub}
          </span>
        </span>
      </Link>

      <div className="my-2.5 w-px shrink-0 self-stretch bg-border/70" aria-hidden />

      <Link
        href="/friends"
        className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1.5 py-2 text-center transition-colors hover:bg-sky-500/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400/50"
        aria-label="Your circle"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sky-400/45 bg-sky-500/15 text-sky-400">
          <Users className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 w-full px-0.5">
          <span className="block truncate font-sans text-[10px] font-bold uppercase leading-none tracking-wide text-foreground sm:text-[11px]">
            Your circle
          </span>
          <span className="mt-0.5 block truncate font-code text-[8px] font-bold uppercase leading-none tracking-[0.12em] text-muted-foreground/70">
            Friends
          </span>
        </span>
      </Link>
    </div>
  );
}

function PressSongButton() {
  return (
    <button
      type="button"
      data-tour="scene-press-song"
      onClick={() => openFirstDropLathe()}
      className={cn(
        dockShell,
        'border-sky-300/55 bg-gradient-to-r from-sky-300/22 via-card/85 to-card/70 hover:border-sky-200/80'
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-300/55 bg-sky-300/20 text-sky-200">
        <Disc3 className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block font-sans text-[11px] font-bold uppercase leading-tight tracking-wide text-sky-100 sm:text-xs">
          New release
        </span>
        <span className="mt-0.5 block font-code text-[8px] font-bold uppercase leading-tight tracking-[0.12em] text-sky-200/80 sm:text-[9px] sm:tracking-[0.16em]">
          Music · Releases
        </span>
      </span>
    </button>
  );
}

function leftoverFillClass(countInGroup: number): string | undefined {
  if (countInGroup <= 0) return undefined;
  const rem2 = countInGroup % 2;
  const rem3 = countInGroup % 3;
  return cn(
    rem2 === 1 && (rem3 === 0 ? 'col-span-2 sm:col-span-1' : 'col-span-2'),
    rem3 === 1 && 'sm:col-span-3',
    rem3 === 2 && 'sm:col-span-2'
  );
}

export function SceneNavDock({ compact = false, className }: SceneNavDockProps) {
  const { summary, loading } = useGamification();
  const { total: alertCount, libraryReleases } = useSocialAlerts();
  const { enabled: lockOn } = useLockFeature();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const [lastTrackPath, setLastTrackPath] = useState<string | null>(null);

  useEffect(() => {
    setLastTrackPath(getLastWorkedTrackPath());
  }, []);

  const isLive = Boolean(summary.publicProfile && summary.profileSlug);
  const homeHref = summary.profileSlug ? profileHref(summary.profileSlug) : null;
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
      key: 'library',
      href: '/library',
      label: 'Library',
      sub: 'Unlocked releases',
      icon: Library,
      tone: 'border-amber-400/45 bg-amber-500/10 hover:border-amber-300/60',
      iconTone: 'border-amber-400/40 bg-amber-500/20 text-amber-200',
      badge: libraryReleases,
    },
    {
      key: 'insights',
      href: '/insights',
      label: 'Listener Insights',
      sub: 'Real fans, not vanity plays',
      icon: BarChart3,
      tone: 'border-sky-500/30 bg-card/55 hover:border-sky-400/50',
      iconTone: 'border-sky-400/45 bg-sky-500/15 text-sky-300',
    },
    {
      key: 'supporters',
      href: '/supporters',
      label: 'Support Circle',
      sub: 'Followers · Inner Circle',
      icon: HeartHandshake,
      tone: 'border-fuchsia-500/30 bg-card/55 hover:border-fuchsia-400/50',
      iconTone: 'border-fuchsia-400/45 bg-fuchsia-500/15 text-fuchsia-300',
    },
    {
      key: 'earnings',
      href: '/earnings',
      label: 'Earnings',
      sub: 'Release earnings',
      icon: Banknote,
      tone: 'border-emerald-500/30 bg-card/55 hover:border-emerald-400/50',
      iconTone: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-400',
    },
    {
      key: 'ink',
      href: '/usage?tab=buy-ink',
      label: 'Ink store',
      sub: 'Top up your Ink',
      icon: Droplets,
      tone: 'border-fuchsia-500/45 bg-gradient-to-r from-fuchsia-500/18 via-card/85 to-card/70 hover:border-fuchsia-400/70',
      iconTone: 'border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-300',
    },
    {
      key: 'charts',
      href: '/charts',
      label: 'Music Charts',
      sub: 'Proof-based · 7 days',
      icon: TrendingUp,
      tone: 'border-cyan-500/35 bg-cyan-500/10 hover:border-cyan-400/55',
      iconTone: 'border-cyan-400/45 bg-cyan-500/15 text-cyan-300',
    },
  ];

  if (loading && !compact) {
    return (
      <nav
        className={cn('flex w-56 flex-col gap-2.5 min-h-[12rem]', className)}
        aria-label="Scene shortcuts"
        aria-busy
        data-tour="scene-nav-desktop"
      />
    );
  }

  const writeTile = lastTrackPath ? (
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
  );

  const homeTile =
    isLive && homeHref ? (
      <ArtistHomeSplitButton profileHref={homeHref} isLive={isLive} />
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
    );

  const lockTile = lockOn ? (
    <DockLink
      item={{
        key: 'finish-bar',
        href: '/lock/desk',
        label: 'Finish this bar',
        sub: 'Yours · replies',
        icon: Lock,
        tone: 'border-emerald-500/35 bg-card/55 hover:border-emerald-400/55',
        iconTone: 'border-emerald-400/45 bg-emerald-500/15 text-emerald-400',
      }}
    />
  ) : null;

  const afterActivity = [
    firstDropsOn ? <DockLink key="library" item={items[1]!} /> : null,
    <DockLink key="charts" item={items[6]!} />,
    firstDropsOn ? <DockLink key="earnings" item={items[2]!} /> : null,
    <DockLink key="ink" item={items[3]!} />,
  ].filter(Boolean) as React.ReactElement[];

  const beforeActivity = [
    <DockLink key="vault" item={items[0]!} />,
    <React.Fragment key="write">{writeTile}</React.Fragment>,
    firstDropsOn ? <PressSongButton key="press" /> : null,
    <React.Fragment key="home">{homeTile}</React.Fragment>,
    lockTile ? <React.Fragment key="lock">{lockTile}</React.Fragment> : null,
  ].filter(Boolean) as React.ReactElement[];

  const fillBefore = compact ? leftoverFillClass(beforeActivity.length) : undefined;
  const fillAfter = compact ? leftoverFillClass(afterActivity.length) : undefined;

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
      {beforeActivity.map((tile, i) => (
        <div
          key={tile.key ?? i}
          className={cn(
            compact && 'min-w-0 w-full',
            compact && i === beforeActivity.length - 1 && fillBefore
          )}
        >
          {tile}
        </div>
      ))}

      <ActivityCircleSplitButton
        alertCount={alertCount}
        className={compact ? 'col-span-2 sm:col-span-3' : undefined}
      />

      {afterActivity.map((tile, i) => (
        <div
          key={tile.key ?? i}
          className={cn(
            compact && 'min-w-0 w-full',
            compact && i === afterActivity.length - 1 && fillAfter
          )}
        >
          {tile}
        </div>
      ))}
    </nav>
  );
}
