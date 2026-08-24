'use client';

import React from 'react';
import Link from 'next/link';
import {
  Archive,
  ArrowUpRight,
  BarChart3,
  Compass,
  Disc3,
  HeartHandshake,
  Library,
  Radio,
  Users,
} from 'lucide-react';
import { LiveArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import type { ProfilePost } from '@/lib/profile/social-client';
import type { DiscoverCard } from '@/lib/scene/discover-client';
import { openFirstDropLathe } from '@/lib/first-drop-lathe';
import { cn } from '@/lib/utils';

type ScenePortalHubProps = {
  viewer: {
    userId: string;
    displayName: string;
    slug?: string;
  };
  artistHomeHref: string;
  friendCount: number;
  blockPreview?: ProfilePost;
  discoverPreview?: DiscoverCard;
  newBlockCount: number;
  newDiscoverCount: number;
  onOpenBlock: () => void;
  onOpenDiscover: () => void;
};

type PortalRegionProps = {
  title: string;
  eyebrow: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'violet' | 'cyan' | 'fuchsia' | 'amber' | 'sky' | 'emerald';
  href?: string;
  onClick?: () => void;
  badge?: number;
  badgeClassName?: string;
  className?: string;
  children?: React.ReactNode;
  titleClassName?: string;
};

const regionTone: Record<PortalRegionProps['tone'], string> = {
  violet: 'text-violet-200 hover:bg-violet-500/10',
  cyan: 'text-cyan-200 hover:bg-cyan-500/10',
  fuchsia: 'text-fuchsia-200 hover:bg-fuchsia-500/10',
  amber: 'text-amber-200 hover:bg-amber-500/10',
  sky: 'text-sky-200 hover:bg-sky-500/10',
  emerald: 'text-emerald-200 hover:bg-emerald-500/10',
};

const regionGlow: Record<PortalRegionProps['tone'], string> = {
  violet: 'bg-violet-400 shadow-[0_0_16px_rgba(167,139,250,0.55)]',
  cyan: 'bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.55)]',
  fuchsia: 'bg-fuchsia-400 shadow-[0_0_16px_rgba(232,121,249,0.55)]',
  amber: 'bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.55)]',
  sky: 'bg-sky-300 shadow-[0_0_16px_rgba(125,211,252,0.55)]',
  emerald: 'bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.55)]',
};

function CountBubble({ count, label, className }: { count?: number; label: string; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={cn('absolute right-2.5 top-2.5 z-20 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1.5 font-code text-[9px] font-black text-black shadow-[0_0_18px_rgba(52,211,153,0.6)]', className)}
      aria-label={`${count} new in ${label}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function PortalRegion({
  title,
  eyebrow,
  icon: Icon,
  tone,
  href,
  onClick,
  badge,
  badgeClassName,
  className,
  children,
  titleClassName,
}: PortalRegionProps) {
  const content = (
    <>
      <CountBubble count={badge} label={title} className={badgeClassName} />
      <div className="relative z-10 flex min-w-0 items-start gap-1.5 sm:gap-2">
        <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/35 bg-black/25 sm:h-8 sm:w-8">
          <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </span>
        <span className="min-w-0 flex-1 text-left">
          <span className="hidden font-code text-[7px] font-bold uppercase tracking-[0.18em] text-white/40 min-[430px]:block sm:text-[8px]">
            {eyebrow}
          </span>
          <span className={cn('block font-headline text-[clamp(0.72rem,3.2vw,1.15rem)] font-bold uppercase leading-[0.95] tracking-tight text-white min-[430px]:mt-0.5', titleClassName)}>
            {title}
          </span>
        </span>
      </div>
      {children ? <div className="relative z-10 mt-1.5 min-w-0 sm:mt-2">{children}</div> : null}
      <span className={cn('pointer-events-none absolute bottom-2 left-2 h-1 w-1 rounded-full opacity-80', regionGlow[tone])} />
    </>
  );
  const classes = cn(
    'group absolute z-10 flex min-w-0 flex-col overflow-hidden p-2 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/80',
    regionTone[tone],
    className
  );
  return href ? (
    <Link href={href} className={classes}>{content}</Link>
  ) : (
    <button type="button" onClick={onClick} className={classes}>{content}</button>
  );
}

function PostPreview({ post }: { post?: ProfilePost }) {
  if (!post) return <p className="text-[10px] leading-relaxed text-white/50">Your circle is warming up. Open the Block to see what friends post next.</p>;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <LiveArtistStarAvatar name={post.ownerName} userId={post.ownerId} slug={post.ownerSlug} size={30} link={false} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-bold text-white sm:text-xs">{post.ownerName}</span>
        <span className="mt-0.5 hidden max-h-[2.4rem] overflow-hidden text-[10px] leading-[1.2rem] text-white/55 min-[500px]:block">
          {post.text || (post.imageUrl ? 'Shared a photo' : post.voice ? 'Shared a voice note' : 'Shared something new')}
        </span>
      </span>
      {post.imageUrl ? <span className="hidden h-11 w-11 shrink-0 rounded-lg bg-cover bg-center sm:block" style={{ backgroundImage: `url(${post.imageUrl})` }} /> : null}
    </div>
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
      detail: card.post.text || 'New post from the Scene',
      userId: card.post.ownerId,
      slug: card.post.ownerSlug,
    };
  }
  if (card.kind === 'artist') {
    return {
      name: card.artist.displayName,
      detail: card.match?.reasons?.join(' · ') || 'Recently live Artist Home',
      userId: card.artist.userId,
      slug: card.artist.slug,
      avatarUrl: card.artist.avatarUrl,
    };
  }
  if (card.kind === 'drop') {
    return {
      name: card.drop.ownerName,
      detail: `${card.drop.title} · ${card.drop.hasDropAudio ? 'First Drop' : 'DNA Drop'}`,
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

function DiscoverPreview({ card }: { card?: DiscoverCard }) {
  const preview = discoverPreviewMeta(card);
  if (!preview) return <p className="text-[10px] leading-relaxed text-white/50">Fresh artists, posts, drops, and matches will appear here.</p>;
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <LiveArtistStarAvatar
        name={preview.name}
        userId={preview.userId}
        slug={preview.slug}
        avatarUrl={preview.avatarUrl}
        size={30}
        link={false}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-bold text-white sm:text-xs">{preview.name}</span>
        <span className="mt-0.5 hidden max-h-[2.4rem] overflow-hidden text-[10px] leading-[1.2rem] text-white/55 min-[500px]:block">{preview.detail}</span>
      </span>
    </div>
  );
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
  blockPreview,
  discoverPreview,
  newBlockCount,
  newDiscoverCount,
  onOpenBlock,
  onOpenDiscover,
}: ScenePortalHubProps) {
  return (
    <section className="space-y-3" data-tour="scene-feed" aria-label="Scene portals">
      <div data-tour="scene-nav-mobile" className="overflow-hidden rounded-[1.35rem] border border-sky-400/25 bg-[radial-gradient(circle_at_50%_45%,rgba(37,99,235,0.14),transparent_34%),linear-gradient(145deg,rgba(7,16,31,0.97),rgba(4,9,20,0.98))] p-3 shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:p-4">
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="flex items-center gap-1.5 font-code text-[9px] font-bold uppercase tracking-[0.24em] text-sky-300">
              <Radio className="h-3.5 w-3.5" /> Scene portals
            </p>
            <p className="mt-1 text-xs text-white/45">Open a room—or jump straight to your music and people.</p>
          </div>
          <span className="hidden font-code text-[8px] uppercase tracking-[0.2em] text-white/25 sm:block">Live previews</span>
        </div>

        <div data-scene-portal-map className="relative mx-auto aspect-square w-full max-w-[52rem] overflow-hidden rounded-[1.1rem] border-2 border-sky-300/45 bg-[radial-gradient(circle_at_50%_48%,rgba(14,165,233,0.11),transparent_34%),linear-gradient(145deg,rgba(5,13,27,0.98),rgba(3,8,18,0.99))] shadow-[inset_0_0_55px_rgba(14,165,233,0.06),0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-[1] w-px -translate-x-1/2 bg-gradient-to-b from-sky-300/45 via-fuchsia-300/55 to-violet-300/45" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] h-px -translate-y-1/2 bg-gradient-to-r from-violet-300/40 via-sky-300/50 to-fuchsia-300/40" />

          <PortalRegion
            title="The Vault"
            eyebrow="Create · organize"
            icon={Archive}
            tone="violet"
            href="/vault"
            className="left-0 top-0 h-[17%] w-1/2 items-start justify-start pl-3 pt-3 sm:pl-5 sm:pt-4"
          />
          <PortalRegion
            title="Your Circle"
            eyebrow={`${friendCount} friend${friendCount === 1 ? '' : 's'}`}
            icon={Users}
            tone="emerald"
            href="/friends"
            className="bottom-0 right-0 h-[17%] w-1/2 items-end justify-end pb-3 pr-3 sm:pb-4 sm:pr-5"
          />

          <div className="absolute left-[9%] top-1/2 z-20 aspect-square w-[82%] -translate-y-1/2 overflow-hidden rounded-full border-2 border-sky-300/55 bg-[radial-gradient(circle_at_50%_50%,rgba(30,64,175,0.15),rgba(3,8,18,0.96)_68%)] shadow-[0_0_42px_rgba(14,165,233,0.12)]">
            <span className="pointer-events-none absolute inset-y-0 left-1/2 z-20 w-px -translate-x-1/2 bg-sky-200/35" />
            <span className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-px -translate-y-1/2 bg-sky-200/35" />

            <PortalRegion
              title="Pressed + DNA"
              eyebrow="Songs · drops"
              icon={Disc3}
              tone="fuchsia"
              href="/vault"
              className="left-0 top-0 h-1/2 w-1/2 items-start justify-start pl-[18%] pr-[8%] pt-[20%]"
              titleClassName="max-w-[7.5rem]"
            />
            <PortalRegion
              title="Discover"
              eyebrow="For your taste"
              icon={Compass}
              tone="cyan"
              onClick={onOpenDiscover}
              badge={newDiscoverCount}
              badgeClassName="right-[25%] top-[25%]"
              className="right-0 top-0 h-1/2 w-1/2 items-start justify-start pl-[6%] pr-[12%] pt-[20%]"
              titleClassName="text-[9px] min-[430px]:text-xs sm:text-lg"
            >
              <DiscoverPreview card={discoverPreview} />
            </PortalRegion>
            <PortalRegion
              title="Library"
              eyebrow="Music you own"
              icon={Library}
              tone="amber"
              href="/library"
              className="bottom-0 left-0 h-1/2 w-1/2 items-start justify-end pb-[20%] pl-[18%] pr-[8%]"
            />
            <PortalRegion
              title="Your Block"
              eyebrow="Friends · posts"
              icon={Radio}
              tone="fuchsia"
              onClick={onOpenBlock}
              badge={newBlockCount}
              className="bottom-0 right-0 h-1/2 w-1/2 items-start justify-end pb-[8%] pl-[15%] pr-[7%]"
            >
              <PostPreview post={blockPreview} />
            </PortalRegion>
          </div>

          <Link
            href={artistHomeHref}
            className="group absolute left-1/2 top-1/2 z-40 flex aspect-square w-[26%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 overflow-hidden border-2 border-sky-200/65 bg-[radial-gradient(circle_at_50%_35%,rgba(14,165,233,0.3),rgba(5,18,38,0.98)_70%)] p-1.5 text-center shadow-[0_0_0_4px_rgba(3,8,18,0.94),0_0_36px_rgba(14,165,233,0.28)] transition hover:border-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:gap-2 sm:p-3"
          >
            <LiveArtistStarAvatar name={viewer.displayName} userId={viewer.userId} slug={viewer.slug} size={42} link={false} toneClass="bg-sky-500/25 text-sky-200" />
            <span className="font-headline text-[10px] font-bold uppercase leading-none text-white min-[430px]:text-xs sm:text-base">Artist Home</span>
            <span className="hidden max-w-full truncate font-code text-[7px] uppercase tracking-[0.1em] text-sky-100/55 min-[500px]:block sm:text-[8px]">{viewer.displayName}</span>
          </Link>

          <span className="pointer-events-none absolute bottom-2 left-2 font-code text-[6px] uppercase tracking-[0.24em] text-white/15 sm:text-[7px]">BA · Scene map</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Scene creator shortcuts">
        <QuickAction href="/insights" title="Music Listener Insights" detail="Real listeners · proof" icon={BarChart3} tone="border-cyan-400/30 text-cyan-300" />
        <QuickAction href="/supporters" title="Support Circle" detail="Followers · Inner Circle" icon={HeartHandshake} tone="border-fuchsia-400/30 text-fuchsia-300" />
        <QuickAction title="Press a Song" detail="Sell · First Drops" icon={Disc3} tone="border-sky-300/40 text-sky-200" />
      </div>
    </section>
  );
}
