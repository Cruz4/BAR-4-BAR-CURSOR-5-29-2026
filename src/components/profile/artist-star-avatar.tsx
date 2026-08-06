'use client';

/**
 * Feed avatar chip:
 * - Generative on → round Vesperfold mark (feed star)
 * - Generative off + photo → square photo
 * - Generative off + no photo → stock initials in a 5-point star
 */

import React from 'react';
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

export function ArtistStarAvatar({
  name,
  avatarUrl,
  starMarkSeed,
  useStarMark,
  href,
  size = 56,
  className,
  toneClass = 'bg-primary/20 text-primary',
}: ArtistStarAvatarProps) {
  const initials = getInitials(name);
  const seed = normalizeVesperfoldSeed(starMarkSeed ?? 0);

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
  } else if (avatarUrl) {
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
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      </span>
    );
  } else {
    mark = (
      <span
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/20',
          toneClass,
          className
        )}
        style={{ width: size, height: size, clipPath: ARTIST_STAR_CLIP }}
        aria-hidden={!href}
      >
        <span
          className="flex h-full w-full items-center justify-center font-bold uppercase tracking-tight"
          style={{ fontSize: Math.max(10, Math.round(size * (initials.length > 1 ? 0.26 : 0.32))) }}
        >
          {initials}
        </span>
      </span>
    );
  }

  if (href) {
    return (
      <Link
        href={href}
        className="shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`${name} profile`}
      >
        {mark}
      </Link>
    );
  }

  return mark;
}
