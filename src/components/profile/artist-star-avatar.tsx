'use client';

/**
 * Feed avatar chip:
 * - Star system on → generative Vesperfold in a round chip
 * - Star system off → square photo / initial
 */

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { VesperfoldMark } from '@/components/profile/vesperfold-mark';
import { normalizeVesperfoldSeed } from '@/lib/profile/vesperfold';

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
  const initial = name.trim().slice(0, 1).toUpperCase() || '?';
  const seed = normalizeVesperfoldSeed(starMarkSeed ?? 0);

  const mark = useStarMark ? (
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
  ) : (
    <span
      className={cn(
        'relative inline-flex shrink-0 overflow-hidden rounded-md border border-white/15',
        className,
        !avatarUrl && toneClass
      )}
      style={{ width: size, height: size }}
      aria-hidden={!href}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center font-bold uppercase"
          style={{ fontSize: Math.max(11, Math.round(size * 0.32)) }}
        >
          {initial}
        </span>
      )}
    </span>
  );

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
