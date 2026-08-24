'use client';

/**
 * Discover cards for the Scene feed — recently live Artist Homes, public wall
 * posts, live DNA Drops, and this week's leaderboard risers.
 */

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { Dna, Flame, Lock, Music, Radio, Trash2, TrendingUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PostCard } from '@/components/profile/post-card';
import { ArtistStarAvatar, LiveArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { DropListenPanel } from '@/components/drop-listen-panel';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client/firebase';
import { cn } from '@/lib/utils';
import { profileHref } from '@/lib/profile/profile-slug';
import { isMasterAdminEmail } from '@/lib/master-admin';
import type { DiscoverCard } from '@/lib/scene/discover-client';
import { parseStudioBadge, studioNameClass } from '@/lib/studio-tier-chrome';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { formatDropPulseLine } from '@/lib/drop-pulse';
import { normalizeDropPrice } from '@/lib/drop-commerce';

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

export function SceneDiscoverCard({
  card,
  viewerSlug,
  onLockRemoved,
}: {
  card: DiscoverCard;
  viewerSlug?: string;
  /** Called after the owner or studio admin deletes a Finish this bar cast. */
  onLockRemoved?: (lockId: string) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const [busy, setBusy] = useState(false);

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
            href={profileHref(artist.slug) || `/${artist.slug}`}
            size={56}
            toneClass="bg-sky-500/25 text-sky-300"
            studioChrome={parseStudioBadge(artist.studioBadge) || 'free'}
          />
          <div className="min-w-0 flex-1">
            <Link
              href={profileHref(artist.slug) || `/${artist.slug}`}
              className={cn(
                'block truncate font-headline text-sm font-bold uppercase tracking-tight hover:text-sky-300',
                studioNameClass(parseStudioBadge(artist.studioBadge) || 'free')
              )}
            >
              {artist.displayName}
            </Link>
            <p className="font-code text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
              Artist Home {artist.updatedAt ? `· updated ${timeAgo(artist.updatedAt)}` : ''}
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-8 shrink-0 font-bold uppercase" asChild>
            <Link href={profileHref(artist.slug) || `/${artist.slug}`}>Visit</Link>
          </Button>
        </div>
      </Card>
    );
  }

  if (card.kind === 'drop') {
    const { drop } = card;
    const ownerHref = drop.ownerSlug ? profileHref(drop.ownerSlug) : undefined;
    const firstDrop = firstDropsOn && Boolean(drop.hasDropAudio);
    const pulse = formatDropPulseLine(drop);
    return (
      <Card className="border-fuchsia-500/40 bg-gradient-to-r from-fuchsia-500/[0.12] via-card/85 to-card/70 p-4">
        <DiscoverTag
          label={firstDrop ? 'On sale' : 'Live DNA Drop'}
          icon={firstDrop ? Music : Dna}
          tone={firstDrop ? 'text-fuchsia-400/90' : 'text-primary/90'}
        />
        <div className="mt-2.5 flex items-center gap-3">
          <ArtistStarAvatar
            name={drop.ownerName}
            avatarUrl={drop.avatarUrl}
            useStarMark={drop.starMarkUseStar}
            starMarkSeed={drop.starMarkSeed}
            href={ownerHref}
            size={56}
            toneClass={firstDrop ? 'bg-fuchsia-500/25 text-fuchsia-300' : 'bg-primary/25 text-primary'}
            studioChrome={parseStudioBadge(drop.studioBadge) || 'free'}
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`/share/${drop.shareId}`}
              className="block truncate font-headline text-sm font-bold uppercase tracking-tight text-foreground hover:text-primary"
            >
              {drop.title}
            </Link>
            <p className="font-code text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
              {firstDrop ? 'Song' : drop.type === 'album' ? 'Album' : 'Track'}
              {firstDrop ? ' · stream' : ' DNA'} by{' '}
              {ownerHref ? (
                <Link
                  href={ownerHref}
                  className={cn(
                    'hover:text-primary',
                    studioNameClass(parseStudioBadge(drop.studioBadge) || 'free')
                  )}
                >
                  {drop.ownerName}
                </Link>
              ) : (
                <span className={studioNameClass(parseStudioBadge(drop.studioBadge) || 'free')}>
                  {drop.ownerName}
                </span>
              )}
              {drop.updatedAt ? ` · ${timeAgo(drop.updatedAt)}` : ''}
              {firstDrop && drop.dropPriceSummary ? ` · ${drop.dropPriceSummary}` : ''}
              {pulse ? ` · ${pulse}` : ''}
              {drop.firstBuyerName ? ` · first cop ${drop.firstBuyerName}` : ''}
            </p>
          </div>
          {!firstDrop ? (
            <Button size="sm" className="h-8 shrink-0 font-bold uppercase" variant="outline" asChild>
              <Link href={`/share/${drop.shareId}`}>Open</Link>
            </Button>
          ) : null}
        </div>
        {firstDrop ? (
          <div className="mt-3">
            <Suspense fallback={<div className="h-24 animate-pulse rounded-xl bg-fuchsia-500/10" />}>
              <DropListenPanel
                shareId={drop.shareId}
                source="scene"
                title={drop.title}
                ownerId={drop.ownerId || ''}
                price={normalizeDropPrice(drop.dropPrice)}
                hasAudio
              />
            </Suspense>
          </div>
        ) : null}
      </Card>
    );
  }

  if (card.kind === 'lock') {
    const { lock } = card;
    const isOwner = Boolean(
      user?.id &&
        ((lock.ownerId && lock.ownerId === user.id) ||
          (viewerSlug && lock.ownerSlug && viewerSlug === lock.ownerSlug))
    );
    const isAdmin = Boolean(user) && (isMasterAdminEmail(user?.email) || user?.role === 'admin');
    const canRemove = isOwner || isAdmin;
    const ownerHref = lock.ownerSlug ? profileHref(lock.ownerSlug) : undefined;

    const deleteCast = async () => {
      if (!user?.id || busy) return;
      const ok = window.confirm(
        lock.echoCount > 0
          ? `Delete this Finish this bar cast and all ${lock.echoCount} replies? This cannot be undone.`
          : 'Delete this Finish this bar cast? This cannot be undone.'
      );
      if (!ok) return;
      setBusy(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) throw new Error('Sign in required');
        const res = await fetch(`/api/lock/${encodeURIComponent(lock.id)}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId: user.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Delete failed');
        toast({ title: 'Cast deleted' });
        onLockRemoved?.(lock.id);
      } catch (e) {
        toast({
          variant: 'destructive',
          title: 'Could not delete',
          description: e instanceof Error ? e.message : 'Try again',
        });
      } finally {
        setBusy(false);
      }
    };

    return (
      <Card className="border-emerald-500/25 bg-gradient-to-r from-emerald-500/[0.07] via-card/85 to-card/70 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <DiscoverTag label="Finish this bar" icon={Lock} tone="text-emerald-400/90" />
          {isOwner ? (
            <span className="font-code text-[9px] font-bold uppercase tracking-[0.24em] text-primary/90">
              Yours
            </span>
          ) : null}
        </div>
        <div className="mt-2.5 flex items-start gap-3">
          <LiveArtistStarAvatar
            name={lock.ownerName}
            userId={lock.ownerId}
            slug={lock.ownerSlug}
            size={44}
            toneClass="bg-emerald-500/25 text-emerald-300"
          />
          <div className="min-w-0 flex-1 space-y-2">
            {ownerHref ? (
              <Link
                href={ownerHref}
                className="block truncate font-headline text-sm font-bold uppercase tracking-tight hover:text-emerald-300"
              >
                {lock.ownerName}
              </Link>
            ) : (
              <p className="truncate font-headline text-sm font-bold uppercase tracking-tight">
                {lock.ownerName}
              </p>
            )}
            <p className="text-sm leading-snug text-foreground/90 line-clamp-2">“{lock.seedBar}”</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-code text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                {lock.echoCount} replies
                {lock.updatedAt ? ` · ${timeAgo(lock.updatedAt)}` : ''}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {isOwner ? (
                  <Button size="sm" variant="outline" className="h-8 shrink-0 font-bold uppercase" asChild>
                    <Link href={`/lock/${lock.id}/manage`}>Manage</Link>
                  </Button>
                ) : null}
                {canRemove ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 shrink-0 font-bold uppercase text-rose-300 hover:bg-rose-500/10 hover:text-rose-200"
                    disabled={busy}
                    onClick={() => void deleteCast()}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Delete
                  </Button>
                ) : null}
                <Button size="sm" variant={isOwner ? 'ghost' : 'outline'} className="h-8 shrink-0 font-bold uppercase" asChild>
                  <Link href={`/lock/${lock.id}`}>{isOwner ? 'Open' : 'Finish it'}</Link>
                </Button>
              </div>
            </div>
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
              href={riser.profileSlug ? profileHref(riser.profileSlug) : undefined}
              size={44}
              toneClass="bg-amber-500/25 text-amber-300"
              studioChrome={parseStudioBadge(riser.studioBadge) || 'free'}
            />
            {riser.profileSlug ? (
              <Link
                href={profileHref(riser.profileSlug) || `/${riser.profileSlug}`}
                className={cn(
                  'min-w-0 flex-1 truncate text-sm font-bold hover:text-amber-300',
                  studioNameClass(parseStudioBadge(riser.studioBadge) || 'free')
                )}
              >
                {riser.displayName}
              </Link>
            ) : (
              <span
                className={cn(
                  'min-w-0 flex-1 truncate text-sm font-bold',
                  studioNameClass(parseStudioBadge(riser.studioBadge) || 'free')
                )}
              >
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
