'use client';

/**
 * Feed avatar chip:
 * - Generative on → round Vesperfold mark (feed star)
 * - Generative off + photo (https or data:image) → square photo
 * - Generative off + no photo → stock initials in a 5-point star
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { VesperfoldMark } from '@/components/profile/vesperfold-mark';
import { normalizeVesperfoldSeed } from '@/lib/profile/vesperfold';
import { getInitials } from '@/lib/gamification/studio-pass';
import { parseStudioBadge, type StudioNameChrome } from '@/lib/studio-tier-chrome';
import { useLiveArtistHomeSlug } from '@/components/profile/artist-home-link';
import { fetchPublicArtistAvatarMeta } from '@/lib/profile/social-client';

/** Classic 5-point star clip — stock initials only (no photo, no generative). */
export const ARTIST_STAR_CLIP =
  'polygon(50% 0%, 61.8% 35.4%, 98.2% 35.4%, 68.2% 57.6%, 79.4% 91.2%, 50% 71%, 20.6% 91.2%, 31.8% 57.6%, 1.8% 35.4%, 38.2% 35.4%)';

export const ARTIST_STAR_POINTS =
  '50,0 61.8,35.4 98.2,35.4 68.2,57.6 79.4,91.2 50,71 20.6,91.2 31.8,57.6 1.8,35.4 38.2,35.4';

type ArtistStarAvatarProps = {
  name: string;
  avatarUrl?: string;
  starMarkSeed?: number;
  useStarMark?: boolean;
  href?: string;
  size?: number;
  className?: string;
  toneClass?: string;
  studioChrome?: StudioNameChrome | null;
};

function StockInitialsStar({
  name,
  size,
  className,
  toneClass,
  studioChrome,
}: {
  name: string;
  size: number;
  className?: string;
  toneClass: string;
  studioChrome?: StudioNameChrome | null;
}) {
  const initials = getInitials(name);
  const isPro = studioChrome === 'pro';
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span
        className={cn(
          'relative inline-flex h-full w-full items-center justify-center overflow-hidden border border-white/25',
          toneClass
        )}
        style={{
          clipPath: ARTIST_STAR_CLIP,
          WebkitClipPath: ARTIST_STAR_CLIP,
        }}
      >
        <span
          className="flex h-full w-full items-center justify-center font-bold uppercase tracking-tight text-sky-300"
          style={{ fontSize: Math.max(9, Math.round(size * (initials.length > 1 ? 0.23 : 0.28))) }}
        >
          {initials}
        </span>
      </span>
      {isPro ? (
        <svg
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          aria-hidden
        >
          <polygon
            points={ARTIST_STAR_POINTS}
            fill="none"
            className="stroke-accent"
            strokeWidth="2.25"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}
    </span>
  );
}

/** Custom / hosted photos for <img> — not generative Vesperfold data URLs. */
function usablePhotoUrl(url?: string): string | undefined {
  if (!url || !url.trim()) return undefined;
  const trimmed = url.trim();
  // Hero uploads are often data:image/*; generative marks use VesperfoldMark instead.
  if (/^data:image\//i.test(trimmed)) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return undefined;
}

export function ArtistStarAvatar({
  name,
  avatarUrl,
  starMarkSeed,
  useStarMark,
  href,
  size = 56,
  className,
  toneClass = 'bg-sky-500/25 text-sky-300',
  studioChrome,
}: ArtistStarAvatarProps) {
  const seed = normalizeVesperfoldSeed(starMarkSeed ?? 0);
  const photoUrl = usablePhotoUrl(avatarUrl);
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [photoUrl]);

  let mark: React.ReactNode;

  if (useStarMark) {
    mark = (
      <span
        className={cn(
          'relative inline-flex shrink-0 overflow-hidden rounded-full border border-white/15',
          className
        )}
        style={{ width: size, height: size }}
        aria-hidden={!href}
      >
        <span className={cn('absolute inset-0', toneClass)} />
        <span className="relative flex h-full w-full items-center justify-center bg-black/40">
          <VesperfoldMark seed={seed} size={Math.round(size * 1.05)} />
        </span>
      </span>
    );
  } else if (photoUrl && !imgFailed) {
    mark = (
      <span
        className={cn(
          'relative inline-flex shrink-0 overflow-hidden rounded-md border border-white/15',
          className
        )}
        style={{ width: size, height: size }}
        aria-hidden={!href}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </span>
    );
  } else {
    mark = (
      <StockInitialsStar
        name={name}
        size={size}
        className={className}
        toneClass={toneClass}
        studioChrome={studioChrome}
      />
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${name} profile`}
      >
        {mark}
      </Link>
    );
  }

  return mark;
}

type LiveArtistStarAvatarProps = {
  name: string;
  userId?: string | null;
  slug?: string | null;
  /** Prefer when already resolved (friends lists). */
  avatarUrl?: string;
  useStarMark?: boolean;
  starMarkSeed?: number;
  studioChrome?: StudioNameChrome | null;
  size?: number;
  className?: string;
  toneClass?: string;
  /** When false, never link even if the profile is live. */
  link?: boolean;
};

/**
 * Live Artist Home badge — photo, feed star, or initials star.
 * Loads public avatar meta when only userId/slug are known (activity, search, admin).
 */
export function LiveArtistStarAvatar({
  name,
  userId,
  slug,
  avatarUrl: bakedAvatarUrl,
  useStarMark: bakedUseStar,
  starMarkSeed: bakedSeed,
  studioChrome: bakedChrome,
  size = 36,
  className,
  toneClass,
  link = true,
}: LiveArtistStarAvatarProps) {
  const { liveSlug, href, isLive } = useLiveArtistHomeSlug(userId, slug);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(bakedAvatarUrl);
  const [useStarMark, setUseStarMark] = useState(Boolean(bakedUseStar));
  const [starMarkSeed, setStarMarkSeed] = useState<number | undefined>(bakedSeed);
  const [studioChrome, setStudioChrome] = useState<StudioNameChrome | null | undefined>(bakedChrome);

  useEffect(() => {
    setAvatarUrl(bakedAvatarUrl);
    setUseStarMark(Boolean(bakedUseStar));
    setStarMarkSeed(bakedSeed);
    setStudioChrome(bakedChrome);
  }, [bakedAvatarUrl, bakedUseStar, bakedSeed, bakedChrome]);

  useEffect(() => {
    const targetSlug = liveSlug || (isLive ? slug || undefined : undefined);
    if (!targetSlug) return;
    // Friends / circle lists already resolved the public chip — don't refetch.
    if (bakedUseStar === true) return;
    if (bakedUseStar === false && typeof bakedAvatarUrl === 'string') return;

    let cancelled = false;
    void fetchPublicArtistAvatarMeta(targetSlug).then((meta) => {
      if (cancelled || !meta) return;
      if (meta.starMarkUseStar) {
        setUseStarMark(true);
        setStarMarkSeed(meta.starMarkSeed);
        setAvatarUrl(undefined);
      } else {
        setUseStarMark(false);
        setAvatarUrl(meta.avatarUrl || bakedAvatarUrl);
      }
      setStudioChrome(parseStudioBadge(meta.studioBadge) || bakedChrome || undefined);
    });
    return () => {
      cancelled = true;
    };
  }, [liveSlug, slug, isLive, bakedUseStar, bakedAvatarUrl, bakedChrome]);

  return (
    <ArtistStarAvatar
      name={name}
      avatarUrl={avatarUrl}
      useStarMark={useStarMark}
      starMarkSeed={starMarkSeed}
      studioChrome={studioChrome}
      href={link && isLive ? href : undefined}
      size={size}
      className={className}
      toneClass={toneClass}
    />
  );
}
