'use client';

/**
 * Large Artist Home / edit-preview stock portrait:
 * 2-letter initials in a 5-point star (no photo, no collage).
 * SVG text scales cleanly in the small editor preview and the large Artist Home hero.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ARTIST_STAR_CLIP } from '@/components/profile/artist-star-avatar';
import { getInitials } from '@/lib/gamification/studio-pass';

type ProfileInitialsStarProps = {
  displayName: string;
  className?: string;
  /** Emphasize as the active hero choice in the editor. */
  active?: boolean;
};

export function ProfileInitialsStar({ displayName, className, active }: ProfileInitialsStarProps) {
  const initials = getInitials(displayName);
  const fontSize = initials.length > 1 ? 28 : 34;

  return (
    <div
      className={cn(
        'relative flex aspect-square w-full items-center justify-center overflow-hidden bg-black/50',
        active ? 'border border-primary/40' : 'border border-primary/30',
        className
      )}
      role="img"
      aria-label={`${displayName} initials`}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-[82%] w-[82%] text-primary"
        style={{ clipPath: ARTIST_STAR_CLIP }}
        aria-hidden
      >
        <rect width="100" height="100" className="fill-primary/20" />
        <text
          x="50"
          y="52"
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          fontSize={fontSize}
          fontWeight="700"
          letterSpacing={initials.length > 1 ? 1.2 : 0}
          style={{
            fontFamily:
              'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            textTransform: 'uppercase',
          }}
        >
          {initials}
        </text>
      </svg>
    </div>
  );
}
