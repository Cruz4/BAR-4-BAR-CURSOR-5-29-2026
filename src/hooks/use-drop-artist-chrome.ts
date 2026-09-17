'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  normalizePressingConfig,
  pressTokens,
  pressingCssVars,
  type PressingConfig,
} from '@/lib/profile/pressing';
import { parseStudioBadge, type StudioNameChrome } from '@/lib/studio-tier-chrome';

export type DropArtistChrome = {
  avatarUrl?: string;
  useStarMark: boolean;
  starMarkSeed?: number;
  studioChrome?: StudioNameChrome;
  slug?: string;
  pressing?: PressingConfig;
  albumTitle?: string;
  albumShareId?: string;
};

const chromeCache = new Map<string, DropArtistChrome | null>();

function cacheKey(shareId: string, trackId?: string): string {
  return trackId ? `${shareId}:${trackId}` : shareId;
}

export function useDropArtistChrome(
  shareId?: string | null,
  trackId?: string,
  initial?: Partial<DropArtistChrome>
) {
  const [chrome, setChrome] = useState<DropArtistChrome | null>(
    initial?.pressing ? { useStarMark: false, ...initial } : null
  );

  useEffect(() => {
    if (!shareId) {
      setChrome(null);
      return;
    }
    const key = cacheKey(shareId, trackId);
    if (chromeCache.has(key)) {
      setChrome(chromeCache.get(key) || null);
      return;
    }
    if (initial?.pressing) {
      const seeded: DropArtistChrome = { useStarMark: false, ...initial };
      chromeCache.set(key, seeded);
      setChrome(seeded);
      return;
    }

    let cancelled = false;
    const query = trackId ? `?trackId=${encodeURIComponent(trackId)}` : '';
    void fetch(`/api/songs/${encodeURIComponent(shareId)}${query}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((summary) => {
        const artist = summary?.artist as Record<string, unknown> | undefined;
        if (!artist) {
          chromeCache.set(key, null);
          if (!cancelled) setChrome(null);
          return;
        }
        const studioChrome = parseStudioBadge(artist.studioBadge);
        const next: DropArtistChrome = {
          ...(typeof artist.avatarUrl === 'string' && artist.avatarUrl.trim()
            ? { avatarUrl: artist.avatarUrl.trim() }
            : {}),
          useStarMark: artist.starMarkUseStar === true,
          ...(typeof artist.starMarkSeed === 'number' ? { starMarkSeed: artist.starMarkSeed } : {}),
          ...(studioChrome ? { studioChrome } : {}),
          ...(typeof artist.slug === 'string' && artist.slug.trim() ? { slug: artist.slug.trim() } : {}),
          pressing: normalizePressingConfig(artist.pressing),
          ...(typeof summary?.albumTitle === 'string' && summary.albumTitle.trim()
            ? { albumTitle: summary.albumTitle.trim() }
            : {}),
          ...(typeof summary?.albumShareId === 'string' && summary.albumShareId.trim()
            ? { albumShareId: summary.albumShareId.trim() }
            : {}),
        };
        chromeCache.set(key, next);
        if (!cancelled) setChrome(next);
      })
      .catch(() => {
        chromeCache.set(key, null);
        if (!cancelled) setChrome(null);
      });
    return () => {
      cancelled = true;
    };
  }, [shareId, trackId, initial?.pressing]);

  const pressingStyle = useMemo(
    () => (chrome?.pressing ? pressingCssVars(pressTokens(chrome.pressing)) : undefined),
    [chrome?.pressing]
  );

  return { chrome, pressingStyle };
}
