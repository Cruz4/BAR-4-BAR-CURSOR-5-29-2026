'use client';

/**
 * Large Artist Home / edit-preview stock portrait:
 * 2-letter initials in a 5-point star (no photo, no collage).
 * SVG text scales cleanly in the small editor preview and the large Artist Home hero.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ARTIST_STAR_CLIP, ARTIST_STAR_POINTS } from '@/components/profile/artist-star-avatar';
import { getInitials } from '@/lib/gamification/studio-pass';
import type { StudioNameChrome } from '@/lib/studio-tier-chrome';

type ProfileInitialsStarProps = {
  displayName?: string | null;
  className?: string;
  /** Emphasize as the active hero choice in the editor. */
  active?: boolean;
  studioChrome?: StudioNameChrome | null;
};

export function ProfileInitialsStar({
  displayName,
  className,
  active,
  studioChrome,
}: ProfileInitialsStarProps) {
  const name = displayName?.trim() || 'Artist';
  const initials = getInitials(name);
  const isPro = studioChrome === 'pro';
  // Star indent is tight — keep glyphs inside the inner pentagon with breathing room.
  const fontSize = initials.length > 1 ? 22 : 26;

  return (
    <div
      className={cn(
        'relative flex aspect-square w-full items-center justify-center overflow-hidden bg-black/50',
        active ? 'border border-primary/40' : 'border border-primary/30',
        className
      )}
      role="img"
      aria-label={`${name} initials`}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-[82%] w-[82%] text-primary"
        style={isPro ? undefined : { clipPath: ARTIST_STAR_CLIP }}
        aria-hidden
      >
        {isPro ? (
          <polygon points={ARTIST_STAR_POINTS} className="fill-primary/20" />
        ) : (
          <rect width="100" height="100" className="fill-primary/20" />
        )}
        {isPro ? (
          <polygon
            points={ARTIST_STAR_POINTS}
            fill="none"
            className="stroke-accent"
            strokeWidth="0.9"
            strokeLinejoin="round"
          />
        ) : null}
        <text
          x="50"
          y="52"
          textAnchor="middle"
          dominantBaseline="central"
          fill="currentColor"
          fontSize={fontSize}
          fontWeight="700"
          letterSpacing={initials.length > 1 ? 0.5 : 0}
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
