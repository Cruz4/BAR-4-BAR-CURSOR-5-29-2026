'use client';

/**
 * Feed avatar chip:
 * - Generative on → round Vesperfold mark (feed star)
 * - Generative off + photo → square photo
 * - Generative off + no photo → stock initials in a 5-point star
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { VesperfoldMark } from '@/components/profile/vesperfold-mark';
import { normalizeVesperfoldSeed } from '@/lib/profile/vesperfold';
import { getInitials } from '@/lib/gamification/studio-pass';

/** Classic 5-point star clip — stock initials only (no photo, no generative). */
export const ARTIST_STAR_CLIP =
  'polygon(50% 0%, 61.8% 35.4%, 98.2% 35.4%, 68.2% 57.6%, 79.4% 91.2%, 50% 71%, 20.6% 91.2%, 31.8% 57.6%, 1.8% 35.4%, 38.2% 35.4%)';

type ArtistStarAvatarProps = {
  name: string;
  avatarUrl?: string;
  starMarkSeed?: number;
  useStarMark?: boolean;
  href?: string;
  size?: number;
  className?: string;
  toneClass?: string;
};

function StockInitialsStar({
  name,
  size,
  className,
  toneClass,
}: {
  name: string;
  size: number;
  className?: string;
  toneClass: string;
}) {
  const initials = getInitials(name);
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/25',
        toneClass,
        className
      )}
      style={{
        width: size,
        height: size,
        clipPath: ARTIST_STAR_CLIP,
        WebkitClipPath: ARTIST_STAR_CLIP,
      }}
      aria-hidden
    >
      <span
        className="flex h-full w-full items-center justify-center font-bold uppercase tracking-tight text-sky-300"
        style={{ fontSize: Math.max(9, Math.round(size * (initials.length > 1 ? 0.23 : 0.28))) }}
      >
        {initials}
      </span>
    </span>
  );
}

/** Only real hosted photos belong in <img> — data URLs are generative marks. */
function usablePhotoUrl(url?: string): string | undefined {
  if (!url || !url.trim()) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith('data:')) return undefined;
  if (!/^https?:\/\//i.test(trimmed)) return undefined;
  return trimmed;
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
      <StockInitialsStar name={name} size={size} className={className} toneClass={toneClass} />
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
