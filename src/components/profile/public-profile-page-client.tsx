'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StudioLoader } from '@/components/studio-loader';
import { ArtistHome } from '@/components/profile/artist-home';
import type { PublicProfileData } from '@/components/profile/public-profile-showcase';
import { trackShareCardEvent } from '@/lib/gamification-client';
import type { ArtistHomeConfig } from '@/lib/profile/modules';
import { publicProfileView } from '@/lib/profile/public-profile-view';
import { profileHref, sanitizeProfileSlugParam } from '@/lib/profile/profile-slug';
import { useAuth } from '@/hooks/use-auth';
import { RELEASE_VISIBILITY_CHANGED_EVENT } from '@/lib/release-management-client';

export function PublicProfilePageClient({
  slug,
  initialData,
}: {
  slug: string;
  initialData?: unknown;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const initial = initialData ? publicProfileView(initialData, slug) : null;
  const [profile, setProfile] = useState<PublicProfileData | null>(initial?.profile || null);
  const [config, setConfig] = useState<ArtistHomeConfig | null>(initial?.config || null);
  const [loading, setLoading] = useState(!initial);
  const [error, setError] = useState(initialData === null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    let redirected = false;
    const hasInitial = Boolean(initialData);
    if (initialData) {
      const next = publicProfileView(initialData, slug);
      setProfile(next.profile);
      setConfig(next.config);
      setLoading(false);
      setError(false);
      void trackShareCardEvent('share_card_opened', { slug: next.liveSlug });
    } else {
      setLoading(true);
      setError(false);
      setProfile(null);
      setConfig(null);
    }

    const { slug: cleanSlug, hash: swallowedHash } = sanitizeProfileSlugParam(slug);
    if (!cleanSlug) {
      setError(true);
      setLoading(false);
      return;
    }
    if (swallowedHash) {
      const next = profileHref(cleanSlug, swallowedHash);
      if (next) {
        router.replace(next);
        return;
      }
    }

    const load = async (trackOpen = false) => {
      try {
        const res = await fetch(`/api/profile/${encodeURIComponent(cleanSlug)}`, { cache: 'no-store' });
        if (!res.ok) {
          // Keep already-rendered profile data during a background refresh.
          if (!cancelled && trackOpen) setError(true);
          return;
        }
        const data = await res.json();
        const view = publicProfileView(data, cleanSlug);
        const liveSlug = view.liveSlug;
        if (liveSlug !== cleanSlug) {
          redirected = true;
          const hash =
            swallowedHash ||
            (typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '');
          router.replace(profileHref(liveSlug, hash || undefined) || `/${liveSlug}`);
          return;
        }
        if (cancelled) return;
        setProfile(view.profile);
        setConfig(view.config);
        setError(false);
        if (trackOpen) void trackShareCardEvent('share_card_opened', { slug: liveSlug });
      } catch {
        // A refresh failure should not replace a profile that is already on screen.
        if (!cancelled && trackOpen) setError(true);
      } finally {
        // Stay on the loader while the URL is rewritten to the live slug.
        if (!cancelled && !redirected) setLoading(false);
      }
    };
    // Server props paint immediately, then this no-store refresh removes stale
    // release/featured selections left in the router's back-forward cache.
    void load(!hasInitial);
    const refreshReleaseState = () => void load(false);
    window.addEventListener(RELEASE_VISIBILITY_CHANGED_EVENT, refreshReleaseState);
    window.addEventListener('pageshow', refreshReleaseState);
    return () => {
      cancelled = true;
      window.removeEventListener(RELEASE_VISIBILITY_CHANGED_EVENT, refreshReleaseState);
      window.removeEventListener('pageshow', refreshReleaseState);
    };
  }, [slug, router, initialData]);

  if (loading) {
    return (
      <StudioLoader
        size="lg"
        fullscreen
        className="!bg-[hsl(216_28%_5%)]"
      />
    );
  }

  if (error || !profile || !config) {
    return (
      <div className="container mx-auto max-w-lg py-20 px-4 text-center space-y-4">
        <p className="text-muted-foreground">This public profile is not available.</p>
        <Link href="/" className="text-primary text-sm font-bold uppercase">
          Back to studio
        </Link>
      </div>
    );
  }

  const isOwner = Boolean(user?.id && profile.userId && user.id === profile.userId);

  return <ArtistHome profile={profile} config={config} isOwner={isOwner} />;
}
