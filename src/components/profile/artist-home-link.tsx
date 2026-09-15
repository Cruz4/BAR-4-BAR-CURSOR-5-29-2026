'use client';

/**
 * Name/avatar links to Artist Home — only when the artist is live-public.
 * Offline / private accounts stay non-clickable with an “Artist Home offline” hint
 * so old baked slugs never open an empty profile page.
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Hint } from '@/components/ui/tooltip';
import { fetchLivePublicProfileByUserId } from '@/lib/profile/social-client';
import { profileHref } from '@/lib/profile/profile-slug';
import { cn } from '@/lib/utils';

const OFFLINE_HINT = 'Artist Home offline';

async function slugStillLive(slug: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/profile/${encodeURIComponent(slug)}`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

/** Resolve a currently-live public slug; never trust a baked chip alone. */
export function useLiveArtistHomeSlug(
  userId?: string | null,
  bakedSlug?: string | null
): { liveSlug?: string; href?: string; resolved: boolean; isLive: boolean } {
  const [liveSlug, setLiveSlug] = useState<string | undefined>(undefined);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setResolved(false);
    setLiveSlug(undefined);

    const run = async () => {
      if (userId) {
        const live = await fetchLivePublicProfileByUserId(userId);
        if (cancelled) return;
        setLiveSlug(live?.slug);
        setResolved(true);
        return;
      }
      const baked = typeof bakedSlug === 'string' ? bakedSlug.trim() : '';
      if (baked) {
        const ok = await slugStillLive(baked);
        if (cancelled) return;
        setLiveSlug(ok ? baked : undefined);
        setResolved(true);
        return;
      }
      if (!cancelled) {
        setLiveSlug(undefined);
        setResolved(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [userId, bakedSlug]);

  const href = profileHref(liveSlug);
  return { liveSlug, href, resolved, isLive: Boolean(href) };
}

type ArtistHomeLinkProps = {
  userId?: string | null;
  /** Baked slug from old comments/posts — verified live before linking. */
  slug?: string | null;
  children: React.ReactNode;
  className?: string;
  /** Shown when the artist has no live public Artist Home. */
  offlineHint?: string;
  onNavigate?: () => void;
};

export function ArtistHomeLink({
  userId,
  slug,
  children,
  className,
  offlineHint = OFFLINE_HINT,
  onNavigate,
}: ArtistHomeLinkProps) {
  const { href, resolved, isLive } = useLiveArtistHomeSlug(userId, slug);

  if (!resolved) {
    return <span className={className}>{children}</span>;
  }

  if (isLive && href) {
    return (
      <Link
        href={href}
        scroll
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          onNavigate?.();
        }}
      >
        {children}
      </Link>
    );
  }

  // Has identity but not live — or no slug at all with a name that used to link.
  const showOfflineHint = Boolean(userId || slug);
  if (!showOfflineHint) {
    return <span className={className}>{children}</span>;
  }

  return (
    <Hint content={offlineHint} side="top" skipOnTouch={false}>
      <span
        className={cn(className, 'cursor-default')}
        tabIndex={0}
        role="text"
        aria-label={`${typeof children === 'string' ? children : 'Artist'} — ${offlineHint}`}
      >
        {children}
      </span>
    </Hint>
  );
}
