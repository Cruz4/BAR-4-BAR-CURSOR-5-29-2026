'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { buildAlbumCoverCollageLayout } from '@/lib/album-cover-collage';

type AlbumCoverCollageProps = {
  urls: string[];
  displayName: string;
  className?: string;
};

export function AlbumCoverCollage({ urls, displayName, className }: AlbumCoverCollageProps) {
  const layout = buildAlbumCoverCollageLayout(urls);

  if (!layout) {
    return (
      <div
        className={cn(
          'flex aspect-square items-center justify-center rounded-2xl border border-primary/30 bg-black/50 shadow-[0_0_40px_rgba(59,130,246,0.25)]',
          className
        )}
        aria-hidden
      >
        <span className="font-headline text-4xl font-bold uppercase text-primary">
          {displayName.slice(0, 2)}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'aspect-square overflow-hidden rounded-2xl border border-primary/30 bg-[#070d14] shadow-[0_0_40px_rgba(59,130,246,0.25)]',
        className
      )}
      role="img"
      aria-label={`${displayName} album cover collage`}
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
