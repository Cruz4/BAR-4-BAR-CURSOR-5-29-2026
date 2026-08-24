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
  Sparkles,
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

type PortalTileProps = {
  title: string;
  eyebrow: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'violet' | 'cyan' | 'fuchsia' | 'amber' | 'sky';
  href?: string;
  onClick?: () => void;
  badge?: number;
  className?: string;
  children?: React.ReactNode;
};

const tileTone: Record<PortalTileProps['tone'], string> = {
  violet: 'border-violet-400/35 from-violet-500/15 via-card/90 to-card/75 hover:border-violet-300/65',
  cyan: 'border-cyan-400/35 from-cyan-500/15 via-card/90 to-card/75 hover:border-cyan-300/65',
  fuchsia: 'border-fuchsia-400/40 from-fuchsia-500/18 via-card/90 to-card/75 hover:border-fuchsia-300/70',
  amber: 'border-amber-400/45 from-amber-500/16 via-card/90 to-card/75 hover:border-amber-300/70',
  sky: 'border-sky-400/40 from-sky-500/16 via-card/90 to-card/75 hover:border-sky-300/70',
};

const iconTone: Record<PortalTileProps['tone'], string> = {
  violet: 'border-violet-400/35 bg-violet-500/15 text-violet-200',
  cyan: 'border-cyan-400/35 bg-cyan-500/15 text-cyan-200',
  fuchsia: 'border-fuchsia-400/40 bg-fuchsia-500/15 text-fuchsia-200',
  amber: 'border-amber-400/40 bg-amber-500/15 text-amber-200',
  sky: 'border-sky-400/40 bg-sky-500/15 text-sky-200',
};

function CountBubble({ count, label }: { count?: number; label: string }) {
  if (!count) return null;
  return (
    <span
      className="absolute right-2.5 top-2.5 z-20 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1.5 font-code text-[9px] font-black text-black shadow-[0_0_18px_rgba(52,211,153,0.6)]"
      aria-label={`${count} new in ${label}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function PortalTile({
  title,
  eyebrow,
  icon: Icon,
  tone,
  href,
  onClick,
  badge,
  className,
  children,
}: PortalTileProps) {
  const content = (
    <>
      <CountBubble count={badge} label={title} />
      <div className="relative z-10 flex min-w-0 items-start gap-2.5">
        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border', iconTone[tone])}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-code text-[8px] font-bold uppercase tracking-[0.22em] text-white/45">
            {eyebrow}
          </span>
          <span className="mt-0.5 block font-headline text-base font-bold uppercase leading-none tracking-tight text-white sm:text-lg">
            {title}
          </span>
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-white/35 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/80" />
      </div>
      {children ? <div className="relative z-10 mt-auto min-w-0 pt-3">{children}</div> : null}
      <span className="pointer-events-none absolute -bottom-12 -right-10 h-32 w-32 rounded-full border border-current opacity-[0.07]" />
    </>
  );
  const classes = cn(
    'group relative flex min-h-[9.25rem] min-w-0 flex-col overflow-hidden rounded-2xl border bg-gradient-to-br p-3 text-left shadow-[0_18px_55px_rgba(0,0,0,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_65px_rgba(0,0,0,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
    tileTone[tone],
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
      <LiveArtistStarAvatar name={post.ownerName} userId={post.ownerId} slug={post.ownerSlug} size={38} link={false} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-white">{post.ownerName}</span>
        <span className="mt-0.5 block max-h-[2.4rem] overflow-hidden text-[10px] leading-[1.2rem] text-white/55">
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
        size={38}
        link={false}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-bold text-white">{preview.name}</span>
        <span className="mt-0.5 block max-h-[2.4rem] overflow-hidden text-[10px] leading-[1.2rem] text-white/55">{preview.detail}</span>
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

        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <PortalTile title="The Vault" eyebrow="Create · organize" icon={Archive} tone="violet" href="/vault" className="min-h-[5.6rem] sm:min-h-[6.2rem]" />
          <PortalTile
            title="Discover"
            eyebrow="For your taste"
            icon={Compass}
            tone="cyan"
            onClick={onOpenDiscover}
            badge={newDiscoverCount}
            className="row-span-2 min-h-[12.75rem]"
          >
            <DiscoverPreview card={discoverPreview} />
            <span className="mt-2 inline-flex items-center gap-1 font-code text-[8px] font-bold uppercase tracking-[0.16em] text-cyan-200/70">
              <Sparkles className="h-3 w-3" /> Snap through the Scene
            </span>
          </PortalTile>

          <PortalTile title="Pressed + DNA" eyebrow="Songs · drops" icon={Disc3} tone="fuchsia" href="/vault" className="min-h-[6.35rem]" />
          <PortalTile title="Library" eyebrow="Music you own" icon={Library} tone="amber" href="/library" className="min-h-[9.25rem]" />
          <PortalTile
            title="Your Block"
            eyebrow="Friends · posts"
            icon={Radio}
            tone="fuchsia"
            onClick={onOpenBlock}
            badge={newBlockCount}
            className="min-h-[9.25rem]"
          >
            <PostPreview post={blockPreview} />
          </PortalTile>
        </div>

        <div className="relative z-20 -mt-7 mx-auto w-[min(15rem,68%)]">
          <Link
            href={artistHomeHref}
            className="group flex min-h-[7.25rem] items-center gap-3 rounded-2xl border border-sky-300/60 bg-[linear-gradient(145deg,rgba(14,68,130,0.96),rgba(8,25,51,0.98))] p-3 shadow-[0_0_0_5px_rgba(3,8,18,0.9),0_18px_45px_rgba(14,165,233,0.24)] transition hover:-translate-y-0.5 hover:border-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            <LiveArtistStarAvatar name={viewer.displayName} userId={viewer.userId} slug={viewer.slug} size={58} link={false} toneClass="bg-sky-500/25 text-sky-200" />
            <span className="min-w-0 flex-1">
              <span className="block font-code text-[8px] font-bold uppercase tracking-[0.2em] text-sky-200/60">Center of your Scene</span>
              <span className="mt-1 block font-headline text-lg font-bold uppercase leading-none text-white">Artist Home</span>
              <span className="mt-1 block truncate text-[10px] text-white/55">{viewer.displayName}</span>
            </span>
            <ArrowUpRight className="h-4 w-4 text-sky-200/50 group-hover:text-sky-100" />
          </Link>
        </div>

        <Link
          href="/friends"
          className="group mt-3 flex min-h-16 items-center gap-3 rounded-xl border border-violet-400/30 bg-violet-500/[0.08] px-3 py-2.5 transition hover:border-violet-300/55 hover:bg-violet-500/[0.13] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-violet-400/35 bg-violet-500/15 text-violet-200"><Users className="h-4 w-4" /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold uppercase tracking-wide text-white">Your Circle</span>
            <span className="mt-0.5 block font-code text-[8px] uppercase tracking-[0.16em] text-white/45">{friendCount} friend{friendCount === 1 ? '' : 's'} · manage connections</span>
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 text-white/35 group-hover:text-white/80" />
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Scene creator shortcuts">
        <QuickAction href="/insights" title="Music Listener Insights" detail="Real listeners · proof" icon={BarChart3} tone="border-cyan-400/30 text-cyan-300" />
        <QuickAction href="/supporters" title="Support Circle" detail="Followers · Inner Circle" icon={HeartHandshake} tone="border-fuchsia-400/30 text-fuchsia-300" />
        <QuickAction title="Press a Song" detail="Sell · First Drops" icon={Disc3} tone="border-sky-300/40 text-sky-200" />
      </div>
    </section>
  );
}
