'use client';

import React from 'react';
import Link from 'next/link';
import {
  Archive,
  ArrowUpRight,
  AudioWaveform,
  BarChart3,
  ChevronRight,
  Compass,
  Disc3,
  Dna,
  HeartHandshake,
  Library,
  Radio,
  Settings2,
  Sparkles,
  Users,
} from 'lucide-react';
import { LiveArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { ReleaseCatalogDialog } from '@/components/vault/release-catalog';
import type { ProfilePost } from '@/lib/profile/social-client';
import type { DiscoverCard, DiscoverDrop } from '@/lib/scene/discover-client';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import { cn } from '@/lib/utils';
import { useSocialAlerts } from '@/hooks/use-social-alerts';

type ScenePortalHubProps = {
  viewer: {
    userId: string;
    displayName: string;
    slug?: string;
  };
  artistHomeHref: string;
  friendCount: number;
  blockPreviews: ProfilePost[];
  discoverPreviews: DiscoverCard[];
  newBlockCount: number;
  newDiscoverCount: number;
  onOpenBlock: () => void;
  onOpenDiscover: () => void;
};

type GuestScenePortalHubProps = {
  publicPulse: {
    profiles: number;
    posts: number;
    pressedSongs: number;
  };
  newestPressed: DiscoverDrop[];
  discoverPreviews: DiscoverCard[];
  onOpenDiscover: () => void;
};

type PortalTone = 'sky' | 'pink' | 'amber' | 'cyan' | 'emerald';

const shortcutTone: Record<PortalTone, string> = {
  sky: 'border-sky-400/35 bg-sky-500/[0.07] text-sky-300 hover:border-sky-300/70',
  pink: 'border-fuchsia-400/35 bg-fuchsia-500/[0.07] text-fuchsia-300 hover:border-fuchsia-300/70',
  amber: 'border-amber-400/35 bg-amber-500/[0.07] text-amber-300 hover:border-amber-300/70',
  cyan: 'border-cyan-400/35 bg-cyan-500/[0.07] text-cyan-300 hover:border-cyan-300/70',
  emerald: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-400 hover:border-emerald-400/55',
};

function PortalStatus({ children, tone }: { children: React.ReactNode; tone: PortalTone }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center rounded-md border px-2 py-0.5 font-code text-[8px] font-bold uppercase tracking-[0.12em] sm:text-[9px]',
        shortcutTone[tone]
      )}
    >
      {children}
    </span>
  );
}

function previewText(text: string | undefined, fallback: string): string {
  const clean = text?.trim();
  return clean || fallback;
}

function PortalPreviewRow({
  name,
  detail,
  userId,
  slug,
  avatarUrl,
  imageUrl,
}: {
  name: string;
  detail: string;
  userId?: string;
  slug?: string;
  avatarUrl?: string;
  imageUrl?: string;
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 sm:gap-2.5">
      <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/15 bg-black/35 sm:h-11 sm:w-11">
        {imageUrl ? (
          <span
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <LiveArtistStarAvatar
              name={name}
              userId={userId}
              slug={slug}
              avatarUrl={avatarUrl}
              size={34}
              link={false}
            />
          </span>
        )}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate font-code text-[9px] font-black text-white sm:text-[11px]">
          {name}
        </span>
        <span className="mt-0.5 block max-h-8 overflow-hidden text-[8px] leading-4 text-white/55 sm:text-[10px]">
          {detail}
        </span>
      </span>
    </span>
  );
}

function BlockPreviewList({ posts }: { posts: ProfilePost[] }) {
  if (!posts.length) {
    return (
      <p className="max-w-[9rem] text-left text-[9px] leading-relaxed text-white/45 sm:max-w-[13rem] sm:text-[11px]">
        Your circle is warming up. Open Your Block to see what friends share next.
      </p>
    );
  }
  return (
    <span className="flex flex-col gap-3 sm:gap-4">
      {posts.slice(0, 3).map((post) => (
        <PortalPreviewRow
          key={post.id}
          name={post.ownerName}
          detail={previewText(
            post.text,
            post.imageUrl
              ? 'Shared a new image'
              : post.voice
                ? 'Shared a voice note'
                : post.isReverb
                  ? 'Reverbed a signal'
                  : 'Shared something new'
          )}
          userId={post.ownerId}
          slug={post.ownerSlug}
          imageUrl={post.imageUrl}
        />
      ))}
    </span>
  );
}

function discoverPreviewMeta(card?: DiscoverCard): {
  name: string;
  detail: string;
  userId?: string;
  slug?: string;
  avatarUrl?: string;
} | null {
  if (!card) return null;
  if (card.kind === 'post') {
    return {
      name: card.post.ownerName,
      detail: previewText(card.post.text, 'Posted something new'),
      userId: card.post.ownerId,
      slug: card.post.ownerSlug,
    };
  }
  if (card.kind === 'artist') {
    return {
      name: card.artist.displayName,
      detail: card.match?.reasons?.join(' · ') || 'Artist Home is live',
      userId: card.artist.userId,
      slug: card.artist.slug,
      avatarUrl: card.artist.avatarUrl,
    };
  }
  if (card.kind === 'drop') {
    return {
      name: card.drop.ownerName,
      detail: `${card.drop.title} · ${card.drop.hasDropAudio ? 'Music release' : 'DNA Drop'}`,
      userId: card.drop.ownerId,
      slug: card.drop.ownerSlug,
      avatarUrl: card.drop.avatarUrl,
    };
  }
  if (card.kind === 'lock') {
    return {
      name: card.lock.ownerName,
      detail: `“${card.lock.seedBar}”`,
      userId: card.lock.ownerId,
      slug: card.lock.ownerSlug,
    };
  }
  const first = card.risers[0];
  return first
    ? {
        name: first.displayName,
        detail: `Rising this week · ${first.barsWritten7d} bars`,
        userId: first.userId,
        slug: first.profileSlug,
        avatarUrl: first.avatarUrl,
      }
    : null;
}

function DiscoverPreviewList({ cards }: { cards: DiscoverCard[] }) {
  const previews = cards
    .slice(0, 3)
    .map((card) => ({ key: card.key, preview: discoverPreviewMeta(card) }))
    .filter(
      (entry): entry is {
        key: string;
        preview: NonNullable<ReturnType<typeof discoverPreviewMeta>>;
      } => Boolean(entry.preview)
    );
  if (!previews.length) {
    return (
      <p className="max-w-[9rem] text-left text-[9px] leading-relaxed text-white/45 sm:max-w-[13rem] sm:text-[11px]">
        Fresh artists, posts, drops, and taste matches will appear here.
      </p>
    );
  }
  return (
    <span className="flex flex-col gap-3 sm:gap-4">
      {previews.map(({ key, preview }) => (
        <PortalPreviewRow key={key} {...preview} />
      ))}
    </span>
  );
}

function WorldShortcut({
  href,
  onClick,
  title,
  detail,
  icon: Icon,
  tone,
  status,
  avatar,
  badge,
}: {
  href?: string;
  onClick?: () => void;
  title: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: PortalTone;
  status: React.ReactNode;
  avatar?: React.ReactNode;
  badge?: number;
}) {
  const className = cn(
    'group relative flex min-h-[7rem] w-full min-w-0 items-center gap-2 overflow-hidden rounded-2xl border px-2.5 py-3 text-left shadow-[inset_0_0_28px_rgba(255,255,255,0.015),0_14px_35px_rgba(0,0,0,0.25)] transition duration-200 hover:-translate-y-0.5 hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 sm:min-h-[7rem] sm:gap-3 sm:px-4',
    shortcutTone[tone]
  );
  const content = (
    <>
      <span className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.12)_0.7px,transparent_0.8px)] [background-size:7px_7px]" />
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-current/35 bg-current/[0.08] shadow-[0_0_24px_currentColor] sm:h-14 sm:w-14">
        {avatar || <Icon className="h-7 w-7 sm:h-8 sm:w-8" />}
        {Boolean(badge && badge > 0) ? (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-300 px-1 text-[9px] font-black text-black shadow-[0_0_14px_rgba(252,211,77,0.6)]"
            aria-label={`${badge} new in Library`}
          >
            {badge! > 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className="block font-headline text-[clamp(0.92rem,4vw,1.25rem)] font-bold uppercase leading-none tracking-wide text-white">
          {title}
        </span>
        <span className="mt-1 block whitespace-normal text-[10px] leading-snug text-white/60 sm:text-xs">{detail}</span>
        <span className="mt-2 block">{status}</span>
      </span>
      <ChevronRight className="relative h-5 w-5 shrink-0 text-white/75 transition-transform group-hover:translate-x-1" />
    </>
  );
  if (onClick) {
    return <button type="button" className={className} onClick={onClick}>{content}</button>;
  }
  return <Link href={href || '/'} className={className}>{content}</Link>;
}

function QuickAction({ href, title, detail, icon: Icon, tone }: {
  href?: string;
  title: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  const className = cn(
    'group flex min-h-[4.5rem] min-w-0 items-center gap-3 rounded-xl border bg-black/30 px-3 py-2.5 text-left transition hover:-translate-y-0.5 hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    tone
  );
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/30 bg-current/10">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-bold uppercase leading-tight tracking-wide text-white">{title}</span>
        <span className="mt-0.5 block font-code text-[8px] uppercase leading-tight tracking-[0.14em] text-white/45">{detail}</span>
      </span>
      <ArrowUpRight className="h-3.5 w-3.5 text-white/35 group-hover:text-white/80" />
    </>
  );
  return href ? <Link href={href} className={className}>{content}</Link> : <button type="button" className={className} onClick={() => openFirstDropLathe()}>{content}</button>;
}

export function ScenePortalHub({
  viewer,
  artistHomeHref,
  friendCount,
  blockPreviews,
  discoverPreviews,
  newBlockCount,
  newDiscoverCount,
  onOpenBlock,
  onOpenDiscover,
}: ScenePortalHubProps) {
  const [releaseCatalogOpen, setReleaseCatalogOpen] = React.useState(false);
  const { libraryReleases } = useSocialAlerts();

  return (
    <section className="space-y-3" data-tour="scene-feed" aria-label="Scene Portal">
      <div
        data-tour="scene-nav-mobile"
        className="relative overflow-hidden rounded-[1.7rem] border border-sky-400/20 bg-[radial-gradient(circle_at_8%_4%,rgba(14,165,233,0.1),transparent_30%),radial-gradient(circle_at_94%_25%,rgba(217,70,239,0.1),transparent_30%),linear-gradient(155deg,rgba(3,10,24,0.98),rgba(2,7,18,0.99))] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.5)] sm:p-5"
      >
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_center,rgba(56,189,248,0.18)_0.65px,transparent_0.8px)] [background-size:8px_8px]" />

        <header className="relative mb-4 flex items-center gap-3 px-1 sm:mb-5 sm:gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-400/30 bg-sky-500/10 text-sky-300 shadow-[0_0_24px_rgba(14,165,233,0.18)] sm:h-12 sm:w-12">
            <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
          </span>
          <span className="min-w-0">
            <span className="block font-headline text-3xl font-black uppercase leading-none tracking-wide text-white sm:text-4xl">Scene Portal</span>
            <span className="mt-1 block text-xs text-white/55 sm:text-sm">Create · discover · connect.</span>
          </span>
        </header>

        <Link
          href="/vault"
          className="group relative flex min-h-[9.5rem] items-center gap-3 overflow-hidden rounded-[1.5rem] border border-sky-300/70 bg-[radial-gradient(circle_at_10%_50%,rgba(14,165,233,0.18),transparent_33%),radial-gradient(circle_at_88%_20%,rgba(217,70,239,0.16),transparent_32%),rgba(5,10,28,0.9)] px-3 py-4 shadow-[inset_0_0_45px_rgba(56,189,248,0.06),0_0_0_1px_rgba(217,70,239,0.24),0_18px_50px_rgba(0,0,0,0.32)] transition hover:border-white/80 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:min-h-[11rem] sm:gap-5 sm:px-6"
        >
          <span className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_center,rgba(56,189,248,0.22)_0.7px,transparent_0.8px)] [background-size:7px_7px]" />
          <span className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-2xl border-2 border-sky-300/80 bg-sky-500/10 text-sky-300 shadow-[inset_0_0_24px_rgba(59,130,246,0.28),0_0_24px_rgba(56,189,248,0.22)] sm:h-24 sm:w-24">
            <Archive className="h-10 w-10 sm:h-14 sm:w-14" />
            <span className="absolute -bottom-1.5 left-2 h-2 w-3 border-x-2 border-b-2 border-sky-300/70" />
            <span className="absolute -bottom-1.5 right-2 h-2 w-3 border-x-2 border-b-2 border-sky-300/70" />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block font-headline text-[clamp(1.45rem,7vw,2.45rem)] font-black uppercase leading-none tracking-wide text-white">The Vault</span>
            <span className="mt-1 block text-[11px] text-white/55 sm:text-sm">Continue creating</span>
            <span className="mt-2 block font-code text-[9px] text-sky-300 sm:text-xs">Albums · tracks · DNA</span>
            <AudioWaveform className="mt-3 h-5 w-28 text-fuchsia-300/75 sm:w-44" />
          </span>
          <span className="relative hidden h-24 w-20 shrink-0 rotate-2 border border-white/10 bg-black/40 p-2 font-code text-[7px] leading-relaxed text-white/55 min-[390px]:block sm:h-28 sm:w-24 sm:text-[8px]">
            <span className="block border-b border-white/10 pb-1 text-white/75">Current sheet</span>
            <span className="mt-2 block">Bars, ideas, DNA and unfinished sparks stay ready.</span>
          </span>
          <span className="relative flex shrink-0 items-center gap-1 font-headline text-sm font-bold uppercase tracking-wide text-white sm:text-lg">
            <span className="hidden min-[440px]:inline">Open</span>
            <ChevronRight className="h-7 w-7 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>

        <div data-scene-portal-map className="relative mt-3 min-h-[27rem] sm:mt-4 sm:min-h-[31rem]">
          <div className="absolute inset-0 grid grid-cols-2 overflow-hidden rounded-[1.5rem] bg-black/45 shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
            <button
              type="button"
              onClick={onOpenBlock}
              className="group relative flex min-w-0 flex-col overflow-hidden rounded-l-[1.5rem] border-y border-l border-cyan-300/70 bg-[radial-gradient(circle_at_38%_15%,rgba(6,182,212,0.2),transparent_35%),linear-gradient(165deg,rgba(4,23,42,0.96),rgba(3,11,27,0.98))] px-3 pb-5 pt-6 text-left transition hover:brightness-115 focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200 sm:px-5 sm:pb-7 sm:pt-8"
            >
              <span className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_center,rgba(34,211,238,0.18)_0.65px,transparent_0.8px)] [background-size:7px_7px]" />
              <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/65 bg-cyan-500/10 text-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.2)] sm:h-20 sm:w-20">
                <Radio className="h-9 w-9 sm:h-11 sm:w-11" />
              </span>
              <span className="relative mt-5 font-headline text-[clamp(1.1rem,5.5vw,1.9rem)] font-black uppercase leading-none tracking-wide text-white sm:mt-6">Your Block</span>
              <span className="relative mt-1 text-[10px] text-white/55 sm:text-xs">Friends &amp; Following</span>
              <span className="relative mt-2">
                <PortalStatus tone="cyan">
                  {newBlockCount > 0 ? `${Math.min(newBlockCount, 99)} new` : `${friendCount} friend${friendCount === 1 ? '' : 's'}`}
                </PortalStatus>
              </span>
              <span className="relative mt-5 min-w-0 flex-1 sm:mt-6">
                <BlockPreviewList posts={blockPreviews} />
              </span>
              <ChevronRight className="relative mt-3 h-7 w-7 self-end text-cyan-300 transition-transform group-hover:translate-x-1" />
              <span className="pointer-events-none absolute bottom-10 left-3 flex flex-col items-center gap-1 text-cyan-300/70 sm:left-4">
                <span className="text-xs">↑</span>
                <span className="h-16 w-1 rounded-full bg-gradient-to-b from-cyan-200 via-cyan-400/70 to-cyan-300/20" />
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenDiscover}
              className="group relative flex min-w-0 flex-col overflow-hidden rounded-r-[1.5rem] border-y border-r border-fuchsia-300/70 bg-[radial-gradient(circle_at_62%_15%,rgba(217,70,239,0.2),transparent_35%),linear-gradient(195deg,rgba(38,7,42,0.94),rgba(12,5,26,0.98))] px-3 pb-5 pt-6 text-left transition hover:brightness-115 focus-visible:z-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fuchsia-200 sm:px-5 sm:pb-7 sm:pt-8"
            >
              <span className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_center,rgba(232,121,249,0.2)_0.65px,transparent_0.8px)] [background-size:7px_7px]" />
              <span className="relative ml-auto flex h-16 w-16 items-center justify-center rounded-full border border-fuchsia-300/65 bg-fuchsia-500/10 text-fuchsia-300 shadow-[0_0_30px_rgba(217,70,239,0.2)] sm:h-20 sm:w-20">
                <Compass className="h-9 w-9 sm:h-11 sm:w-11" />
              </span>
              <span className="relative mt-5 font-headline text-[clamp(1.25rem,6vw,2rem)] font-black uppercase leading-none tracking-wide text-white sm:mt-6">Discover</span>
              <span className="relative mt-1 text-[10px] text-white/55 sm:text-xs">Explore everyone</span>
              <span className="relative mt-2">
                <PortalStatus tone="pink">{newDiscoverCount > 0 ? `${Math.min(newDiscoverCount, 99)} new` : 'Fresh picks'}</PortalStatus>
              </span>
              <span className="relative mt-5 min-w-0 flex-1 sm:mt-6">
                <DiscoverPreviewList cards={discoverPreviews} />
              </span>
              <ChevronRight className="relative mt-3 h-7 w-7 self-end text-fuchsia-300 transition-transform group-hover:translate-x-1" />
              <span className="pointer-events-none absolute bottom-10 right-3 flex flex-col items-center gap-1 text-fuchsia-300/70 sm:right-4">
                <span className="text-xs">↑</span>
                <span className="h-16 w-1 rounded-full bg-gradient-to-b from-fuchsia-200 via-fuchsia-400/70 to-fuchsia-300/20" />
                <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-300" />
              </span>
            </button>
          </div>

          <svg className="pointer-events-none absolute left-1/2 top-0 z-20 h-full w-[4.5rem] -translate-x-1/2 overflow-visible" viewBox="0 0 72 500" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="scene-portal-seam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#67e8f9" />
                <stop offset="0.5" stopColor="#a78bfa" />
                <stop offset="1" stopColor="#f0abfc" />
              </linearGradient>
            </defs>
            <path d="M36 0 C 9 88, 65 166, 26 250 C -4 326, 61 412, 36 500" fill="rgba(2,7,18,0.72)" stroke="url(#scene-portal-seam)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        <div className="relative mt-3 grid grid-cols-2 gap-2 sm:mt-4 sm:gap-3">
          <WorldShortcut
            href={artistHomeHref}
            title="Artist Home"
            detail="Your public page"
            icon={Radio}
            tone="sky"
            status={<PortalStatus tone="sky">{viewer.slug ? 'Live' : 'Set up'}</PortalStatus>}
            avatar={<LiveArtistStarAvatar name={viewer.displayName} userId={viewer.userId} slug={viewer.slug} size={44} link={false} toneClass="bg-sky-500/15 text-sky-300" />}
          />
          <WorldShortcut
            onClick={() => setReleaseCatalogOpen(true)}
            title="Releases + DNA"
            detail="Music · lyrics"
            icon={Dna}
            tone="emerald"
            status={<PortalStatus tone="emerald">Release Catalog</PortalStatus>}
          />
          <WorldShortcut
            href="/library"
            title="Library"
            detail="Music you unlocked"
            icon={Library}
            tone="amber"
            badge={libraryReleases}
            status={
              <PortalStatus tone="amber">
                {libraryReleases > 0 ? `${libraryReleases > 99 ? '99+' : libraryReleases} new` : 'Saved music'}
              </PortalStatus>
            }
          />
          <WorldShortcut href="/friends" title="Your Circle" detail="Friends & messages" icon={Users} tone="cyan" status={<PortalStatus tone="cyan">{friendCount} friend{friendCount === 1 ? '' : 's'}</PortalStatus>} />
        </div>

        <Link
          href="/profile/customize"
          className="group relative mt-3 flex min-h-16 items-center justify-center gap-3 overflow-hidden rounded-2xl border border-white/15 bg-white/[0.025] px-4 text-white/60 transition hover:border-sky-300/45 hover:bg-sky-500/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 sm:mt-4"
        >
          <Settings2 className="h-6 w-6 text-sky-300" />
          <span className="text-sm sm:text-base">Customize your Artist Home</span>
          <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Scene creator shortcuts">
        <QuickAction href="/insights" title="Music Listener Insights" detail="Real listeners · proof" icon={BarChart3} tone="border-cyan-400/30 text-cyan-300" />
        <QuickAction href="/supporters" title="Support Circle" detail="Followers · Inner Circle" icon={HeartHandshake} tone="border-fuchsia-400/30 text-fuchsia-300" />
        <QuickAction title="New Release" detail="Publish a song or album" icon={Disc3} tone="border-sky-300/40 text-sky-200" />
      </div>
      <ReleaseCatalogDialog open={releaseCatalogOpen} onOpenChange={setReleaseCatalogOpen} />
    </section>
  );
}

export function GuestScenePortalHub({
  publicPulse,
  newestPressed,
  discoverPreviews,
  onOpenDiscover,
}: GuestScenePortalHubProps) {
  const pressedSongs = newestPressed
    .filter((drop) => drop.type === 'track' && drop.hasDropAudio)
    .slice(0, 4);

  return (
    <section className="space-y-3" aria-label="Public Scene Portal">
      <div className="relative overflow-hidden rounded-[1.7rem] border border-sky-400/20 bg-[radial-gradient(circle_at_8%_4%,rgba(14,165,233,0.1),transparent_30%),radial-gradient(circle_at_94%_25%,rgba(217,70,239,0.1),transparent_30%),linear-gradient(155deg,rgba(3,10,24,0.98),rgba(2,7,18,0.99))] p-3 shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_center,rgba(56,189,248,0.18)_0.65px,transparent_0.8px)] [background-size:8px_8px]" />

        <header className="relative mb-4 flex items-center gap-3 px-1">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-sky-400/30 bg-sky-500/10 text-sky-300 shadow-[0_0_24px_rgba(14,165,233,0.18)]">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block font-headline text-3xl font-black uppercase leading-none tracking-wide text-white">
              Scene Portal
            </span>
            <span className="mt-1 block text-xs text-white/55">Discover · listen · connect.</span>
          </span>
        </header>

        <button
          type="button"
          onClick={onOpenDiscover}
          className="group relative flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-[1.5rem] border border-cyan-300/70 bg-[radial-gradient(circle_at_10%_50%,rgba(6,182,212,0.2),transparent_34%),radial-gradient(circle_at_88%_20%,rgba(217,70,239,0.15),transparent_34%),rgba(5,10,28,0.92)] px-3 py-4 text-left shadow-[inset_0_0_45px_rgba(56,189,248,0.06),0_0_0_1px_rgba(217,70,239,0.2),0_18px_50px_rgba(0,0,0,0.32)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <span className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_center,rgba(56,189,248,0.22)_0.7px,transparent_0.8px)] [background-size:7px_7px]" />
          <span className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center rounded-full border-2 border-cyan-300/75 bg-cyan-500/10 text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.24)]">
            <Compass className="h-10 w-10" />
          </span>
          <span className="relative min-w-0 flex-1">
            <span className="block font-headline text-[clamp(1.45rem,7vw,2.25rem)] font-black uppercase leading-none tracking-wide text-white">
              Discover Bar4Bar
            </span>
            <span className="mt-1 block text-[11px] leading-snug text-white/60">
              Preview public music, artists, and Music Fans.
            </span>
            <span className="mt-2 block">
              <PortalStatus tone="cyan">Open public feed</PortalStatus>
            </span>
          </span>
          <ChevronRight className="relative h-7 w-7 shrink-0 text-cyan-200 transition-transform group-hover:translate-x-1" />
        </button>

        <div className="relative mt-3 grid min-h-[25rem] grid-cols-2 overflow-hidden rounded-[1.5rem] bg-black/45 shadow-[0_18px_50px_rgba(0,0,0,0.34)]">
          <section className="relative min-w-0 overflow-hidden rounded-l-[1.5rem] border-y border-l border-cyan-300/60 bg-[radial-gradient(circle_at_35%_12%,rgba(6,182,212,0.2),transparent_36%),linear-gradient(165deg,rgba(4,23,42,0.96),rgba(3,11,27,0.98))] px-3 pb-5 pt-5">
            <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_center,rgba(34,211,238,0.18)_0.65px,transparent_0.8px)] [background-size:7px_7px]" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-cyan-300/60 bg-cyan-500/10 text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.2)]">
              <Radio className="h-8 w-8" />
            </div>
            <h2 className="relative mt-4 font-headline text-[clamp(1.05rem,5.7vw,1.65rem)] font-black uppercase leading-none tracking-wide text-white">
              Scene Pulse
            </h2>
            <p className="relative mt-1 text-[9px] leading-snug text-white/50">What is happening now</p>
            <div className="relative mt-4 space-y-2.5">
              {[
                ['Live profiles', publicPulse.profiles],
                ['Recent posts', publicPulse.posts],
                ['Music releases', publicPulse.pressedSongs],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2">
                  <span className="block font-headline text-xl font-black text-cyan-100">
                    {Number(value).toLocaleString()}
                  </span>
                  <span className="block text-[8px] font-bold uppercase leading-tight tracking-[0.12em] text-white/50">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="relative min-w-0 overflow-hidden rounded-r-[1.5rem] border-y border-r border-fuchsia-300/60 bg-[radial-gradient(circle_at_65%_12%,rgba(217,70,239,0.2),transparent_36%),linear-gradient(195deg,rgba(38,7,42,0.94),rgba(12,5,26,0.98))] px-3 pb-5 pt-5">
            <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_center,rgba(232,121,249,0.2)_0.65px,transparent_0.8px)] [background-size:7px_7px]" />
            <div className="relative ml-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-fuchsia-300/60 bg-fuchsia-500/10 text-fuchsia-300 shadow-[0_0_28px_rgba(217,70,239,0.2)]">
              <Disc3 className="h-8 w-8" />
            </div>
            <h2 className="relative mt-4 font-headline text-[clamp(1rem,5.4vw,1.55rem)] font-black uppercase leading-none tracking-wide text-white">
              Newest Releases
            </h2>
            <p className="relative mt-1 text-[9px] leading-snug text-white/50">Latest songs for preview</p>
            <div className="relative mt-4 space-y-2.5">
              {pressedSongs.length ? pressedSongs.map((drop) => (
                <Link
                  key={drop.shareId}
                  href={`/song/${drop.shareId}`}
                  className="block min-w-0 rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 transition hover:border-fuchsia-300/55 hover:bg-black/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-300"
                >
                  <span className="block truncate text-[10px] font-black text-white">{drop.title}</span>
                  <span className="mt-0.5 block truncate font-code text-[8px] uppercase tracking-wide text-white/45">{drop.ownerName}</span>
                </Link>
              )) : (
                <p className="rounded-lg border border-dashed border-white/15 bg-black/25 px-2.5 py-4 text-[9px] leading-relaxed text-white/45">
                  Newly released songs will appear here.
                </p>
              )}
            </div>
          </section>

          <svg className="pointer-events-none absolute left-1/2 top-0 z-20 h-full w-[4rem] -translate-x-1/2 overflow-visible" viewBox="0 0 64 400" preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="guest-scene-portal-seam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#67e8f9" />
                <stop offset="0.5" stopColor="#a78bfa" />
                <stop offset="1" stopColor="#f0abfc" />
              </linearGradient>
            </defs>
            <path d="M32 0 C 7 72, 57 135, 23 200 C -2 262, 54 330, 32 400" fill="rgba(2,7,18,0.74)" stroke="url(#guest-scene-portal-seam)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>

        <div className="relative mt-3 rounded-2xl border border-white/12 bg-black/35 p-3">
          <div className="flex items-center justify-between gap-3">
            <span>
              <span className="block font-headline text-lg font-black uppercase text-white">Fresh from the Scene</span>
              <span className="block text-[9px] text-white/45">A quick look before opening the full feed</span>
            </span>
            <PortalStatus tone="sky">Public</PortalStatus>
          </div>
          <div className="mt-3">
            <DiscoverPreviewList cards={discoverPreviews} />
          </div>
        </div>

        <div className="relative mt-3 grid grid-cols-2 gap-2">
          <Link
            href="/try"
            className="flex min-h-20 min-w-0 items-center gap-2 rounded-xl border border-sky-400/35 bg-sky-500/[0.07] px-3 py-3 text-sky-200 transition hover:border-sky-300/70 hover:bg-sky-500/[0.12]"
          >
            <AudioWaveform className="h-6 w-6 shrink-0" />
            <span className="min-w-0">
              <span className="block font-headline text-sm font-black uppercase leading-tight text-white">Try writing free</span>
              <span className="mt-0.5 block text-[8px] leading-tight text-white/45">Open the songwriting demo</span>
            </span>
          </Link>
          <Link
            href="/login?mode=signup&next=%2Fdiscover"
            className="flex min-h-20 min-w-0 items-center gap-2 rounded-xl border border-fuchsia-400/35 bg-fuchsia-500/[0.07] px-3 py-3 text-fuchsia-200 transition hover:border-fuchsia-300/70 hover:bg-fuchsia-500/[0.12]"
          >
            <Users className="h-6 w-6 shrink-0" />
            <span className="min-w-0">
              <span className="block font-headline text-sm font-black uppercase leading-tight text-white">Claim free profile</span>
              <span className="mt-0.5 block text-[8px] leading-tight text-white/45">Join artists and Music Fans</span>
            </span>
          </Link>
        </div>

        <button
          type="button"
          onClick={onOpenDiscover}
          className="relative mt-3 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-500/10 px-4 font-headline text-base font-black uppercase tracking-wide text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
        >
          Browse the public feed <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
