'use client';

/**
 * Discover cards for the Scene feed — recently live Artist Homes, public wall
 * posts, live DNA Drops, and this week's leaderboard risers.
 */

import React from 'react';
import Link from 'next/link';
import { Dna, Flame, Lock, Radio, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PostCard } from '@/components/profile/post-card';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { cn } from '@/lib/utils';
import type { DiscoverCard } from '@/lib/scene/discover-client';

function timeAgo(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

function DiscoverTag({ label, icon: Icon, tone }: { label: string; icon: React.ComponentType<{ className?: string }>; tone: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 font-code text-[9px] font-bold uppercase tracking-[0.24em]', tone)}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  );
}

export function SceneDiscoverCard({ card, viewerSlug }: { card: DiscoverCard; viewerSlug?: string }) {
  if (card.kind === 'post') {
    return (
      <div className="space-y-1.5">
        <DiscoverTag label="From the scene" icon={Radio} tone="text-fuchsia-400/90" />
        <PostCard post={card.post} showAuthor viewerSlug={viewerSlug} />
      </div>
    );
  }

  if (card.kind === 'artist') {
    const { artist } = card;
    return (
      <Card className="border-sky-500/25 bg-gradient-to-r from-sky-500/[0.07] via-card/85 to-card/70 p-4">
        <DiscoverTag label="Recently live" icon={Radio} tone="text-sky-400/90" />
        <div className="mt-2.5 flex items-center gap-3">
          <ArtistStarAvatar
            name={artist.displayName}
            avatarUrl={artist.avatarUrl}
            useStarMark={artist.starMarkUseStar}
            starMarkSeed={artist.starMarkSeed}
            href={`/profile/${artist.slug}`}
            size={56}
            toneClass="bg-sky-500/25 text-sky-300"
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${artist.slug}`}
              className="block truncate font-headline text-sm font-bold uppercase tracking-tight text-foreground hover:text-sky-300"
            >
              {artist.displayName}
            </Link>
            <p className="font-code text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
              Artist Home {artist.updatedAt ? `· updated ${timeAgo(artist.updatedAt)}` : ''}
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-8 shrink-0 font-bold uppercase" asChild>
            <Link href={`/profile/${artist.slug}`}>Visit</Link>
          </Button>
        </div>
      </Card>
    );
  }

  if (card.kind === 'drop') {
    const { drop } = card;
    const ownerHref = drop.ownerSlug ? `/profile/${drop.ownerSlug}` : undefined;
    return (
      <Card className="border-primary/25 bg-gradient-to-r from-primary/[0.07] via-card/85 to-card/70 p-4">
        <DiscoverTag label="Live DNA Drop" icon={Dna} tone="text-primary/90" />
        <div className="mt-2.5 flex items-center gap-3">
          <ArtistStarAvatar
            name={drop.ownerName}
            avatarUrl={drop.avatarUrl}
            useStarMark={drop.starMarkUseStar}
            starMarkSeed={drop.starMarkSeed}
            href={ownerHref}
            size={56}
            toneClass="bg-primary/25 text-primary"
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`/share/${drop.shareId}`}
              className="block truncate font-headline text-sm font-bold uppercase tracking-tight text-foreground hover:text-primary"
            >
              {drop.title}
            </Link>
            <p className="font-code text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
              {drop.type === 'album' ? 'Album' : 'Track'} DNA by{' '}
              {ownerHref ? (
                <Link href={ownerHref} className="text-foreground/90 hover:text-primary">
                  {drop.ownerName}
                </Link>
              ) : (
                drop.ownerName
              )}
              {drop.updatedAt ? ` · ${timeAgo(drop.updatedAt)}` : ''}
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-8 shrink-0 font-bold uppercase" asChild>
            <Link href={`/share/${drop.shareId}`}>Open</Link>
          </Button>
        </div>
      </Card>
    );
  }

  if (card.kind === 'lock') {
    const { lock } = card;
    return (
      <Card className="border-emerald-500/25 bg-gradient-to-r from-emerald-500/[0.07] via-card/85 to-card/70 p-4">
        <DiscoverTag label="Finish this bar" icon={Lock} tone="text-emerald-400/90" />
        <div className="mt-2.5 space-y-2">
          <p className="font-headline text-sm font-bold uppercase tracking-tight">
            {lock.ownerName}
          </p>
          <p className="text-sm leading-snug text-foreground/90 line-clamp-2">“{lock.seedBar}”</p>
          <div className="flex items-center justify-between gap-2">
            <p className="font-code text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
              {lock.echoCount} replies
              {lock.updatedAt ? ` · ${timeAgo(lock.updatedAt)}` : ''}
            </p>
            <Button size="sm" variant="outline" className="h-8 shrink-0 font-bold uppercase" asChild>
              <Link href={`/lock/${lock.id}`}>Finish it</Link>
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  // Leaderboard risers
  if (card.kind !== 'risers') return null;
  return (
    <Card className="border-amber-500/25 bg-gradient-to-r from-amber-500/[0.07] via-card/85 to-card/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <DiscoverTag label="Rising this week" icon={TrendingUp} tone="text-amber-400/90" />
        <Button size="sm" variant="ghost" className="h-7 px-2 font-code text-[9px] font-bold uppercase tracking-[0.18em] text-amber-400/90" asChild>
          <Link href="/leaderboard">Full board →</Link>
        </Button>
      </div>
      <ul className="mt-2.5 space-y-1.5">
        {card.risers.map((riser, i) => (
          <li key={riser.userId} className="flex items-center gap-2.5">
            <span className="w-5 shrink-0 text-center font-code text-[10px] font-bold text-amber-400/80">
              {i + 1}
            </span>
            <ArtistStarAvatar
              name={riser.displayName}
              avatarUrl={riser.avatarUrl}
              useStarMark={riser.starMarkUseStar}
              starMarkSeed={riser.starMarkSeed}
              href={riser.profileSlug ? `/profile/${riser.profileSlug}` : undefined}
              size={44}
              toneClass="bg-amber-500/25 text-amber-300"
            />
            {riser.profileSlug ? (
              <Link
                href={`/profile/${riser.profileSlug}`}
                className="min-w-0 flex-1 truncate text-sm font-bold text-foreground hover:text-amber-300"
              >
                {riser.displayName}
              </Link>
            ) : (
              <span className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
                {riser.displayName}
              </span>
            )}
            <span className="shrink-0 font-code text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground/70">
              {riser.barsWritten7d} bars
            </span>
            {riser.currentStreak > 1 && (
              <span className="inline-flex shrink-0 items-center gap-0.5 font-code text-[9px] font-bold text-orange-400">
                <Flame className="h-3 w-3" /> {riser.currentStreak}
              </span>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
