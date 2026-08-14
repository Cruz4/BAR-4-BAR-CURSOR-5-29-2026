'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { buildAlbumCoverCollageLayout } from '@/lib/album-cover-collage';
import { ProfileInitialsStar } from '@/components/profile/profile-initials-star';
import type { StudioNameChrome } from '@/lib/studio-tier-chrome';

type AlbumCoverCollageProps = {
  urls: string[];
  displayName?: string | null;
  className?: string;
  studioChrome?: StudioNameChrome | null;
};

export function AlbumCoverCollage({
  urls,
  displayName,
  className,
  studioChrome,
}: AlbumCoverCollageProps) {
  const layout = buildAlbumCoverCollageLayout(urls);
  const name = displayName?.trim() || 'Artist';

  // No covers (or collage mode with nothing to tile) → stock initials star, not a letter box.
  if (!layout) {
    return (
      <ProfileInitialsStar
        displayName={name}
        className={className}
        studioChrome={studioChrome}
      />
    );
  }

  return (
    <div
      className={cn(
        'aspect-square overflow-hidden rounded-2xl border border-primary/30 bg-[#070d14] shadow-[0_0_40px_rgba(59,130,246,0.25)]',
        className
      )}
      role="img"
      aria-label={`${name} album cover collage`}
    >
      <div
        className={cn('grid h-full w-full', layout.gridClass)}
        style={{ gridTemplateRows: `repeat(${layout.rowCount}, minmax(0, 1fr))` }}
      >
        {layout.cells.map((cell, index) => (
          <div
            key={`${cell.url}-${index}`}
            className={cn(
              'flex min-h-0 min-w-0 items-center justify-center overflow-hidden bg-[#070d14]',
              cell.className
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cell.url}
              alt=""
              className="h-full w-full object-contain"
              loading="lazy"
              decoding="async"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
