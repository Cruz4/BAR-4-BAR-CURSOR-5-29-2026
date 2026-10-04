'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StudioLoader } from '@/components/studio-loader';
import { ArtistHome } from '@/components/profile/artist-home';
import { QuotePressFontLoader } from '@/components/profile/quote-press-font-loader';
import type { PublicProfileData } from '@/components/profile/public-profile-showcase';
import { trackShareCardEvent } from '@/lib/gamification-client';
import { recordProfileViewClient } from '@/lib/profile-view-client';
import { auth } from '@/lib/firebase/client/firebase';
import type { ArtistHomeConfig } from '@/lib/profile/modules';
import { publicProfileView } from '@/lib/profile/public-profile-view';
import { profileHref, sanitizeProfileSlugParam } from '@/lib/profile/profile-slug';
import { useAuth } from '@/hooks/use-auth';
import { RELEASE_VISIBILITY_CHANGED_EVENT } from '@/lib/release-management-client';

import type { PublicWallPostsPage } from '@/lib/server/public-post';
import type { ProfilePost } from '@/lib/profile/social-client';
import { persistArtistHomeProspectClaim } from '@/lib/artist-home-prospect-session';
import { ArtistHomeProspectClaimBanner } from '@/components/profile/artist-home-prospect-claim-banner';
import { ArtistHomeProspectClaimBootstrap } from '@/components/profile/artist-home-prospect-claim-bootstrap';

export function PublicProfilePageClient({
  slug,
  initialData,
  initialWallPosts = null,
  initialImprintPosts = [],
  prospectClaim,
  prospectClaimSecret,
}: {
  slug: string;
  initialData?: unknown;
  initialWallPosts?: PublicWallPostsPage | null;
  initialImprintPosts?: ProfilePost[];
  prospectClaim?: { prospectId: string; slug: string };
  prospectClaimSecret?: string;
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
        const headers: HeadersInit = { cache: 'no-store' };
        const token = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
        if (token) {
          (headers as Record<string, string>).Authorization = `Bearer ${token}`;
        }
        const res = await fetch(`/api/profile/${encodeURIComponent(cleanSlug)}`, headers);
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
        const profileViewCount =
          typeof data.profileViewCount === 'number'
            ? data.profileViewCount
            : typeof data.ownerProfileViewCount === 'number'
              ? data.ownerProfileViewCount
              : undefined;
        const profileViewCountUnique =
          typeof data.profileViewCountUnique === 'number' ? data.profileViewCountUnique : undefined;
        const legacyProfilePageLoads =
          typeof data.legacyProfilePageLoads === 'number' ? data.legacyProfilePageLoads : undefined;
        const ownerProfileViewCount =
          typeof data.ownerProfileViewCount === 'number' ? data.ownerProfileViewCount : undefined;
        setProfile({
          ...view.profile,
          ...(profileViewCount !== undefined ? { profileViewCount } : {}),
          ...(profileViewCountUnique !== undefined ? { profileViewCountUnique } : {}),
          ...(legacyProfilePageLoads !== undefined ? { legacyProfilePageLoads } : {}),
          ...(ownerProfileViewCount !== undefined ? { ownerProfileViewCount } : {}),
        });
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

  useEffect(() => {
    if (!prospectClaim?.prospectId) return;
    persistArtistHomeProspectClaim({
      prospectId: prospectClaim.prospectId,
      slug: prospectClaim.slug,
      claimSecret: prospectClaimSecret,
    });
  }, [prospectClaim, prospectClaimSecret]);

  useEffect(() => {
    if (!profile?.slug || !profile.userId) return;
    if (user?.id && user.id === profile.userId) return;
    recordProfileViewClient(profile.slug);
  }, [profile?.slug, profile?.userId, user?.id]);

  useEffect(() => {
    const slug = profile?.slug;
    if (!slug || !user?.id || !profile?.userId || user.id !== profile.userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token || cancelled) return;
        const res = await fetch(`/api/profile/${encodeURIComponent(slug)}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;
        const count =
          typeof data.profileViewCount === 'number'
            ? data.profileViewCount
            : typeof data.ownerProfileViewCount === 'number'
              ? data.ownerProfileViewCount
              : undefined;
        if (typeof count !== 'number') return;
        setProfile((current) => {
          if (!current) return current;
          const kept =
            count > 0
              ? count
              : Math.max(current.profileViewCount || 0, current.ownerProfileViewCount || 0);
          if (kept <= 0 && count <= 0) return current;
          return {
            ...current,
            ownerProfileViewCount: kept,
            profileViewCount: kept,
            profileViewCountUnique:
              typeof data.profileViewCountUnique === 'number' && data.profileViewCountUnique > 0
                ? data.profileViewCountUnique
                : current.profileViewCountUnique,
          };
        });
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile?.slug, profile?.userId, user?.id]);

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
  const isUnclaimedProspect = Boolean(prospectClaim && !profile.userId);

  return (
    <>
      <QuotePressFontLoader />
      <ArtistHomeProspectClaimBootstrap />
      {isUnclaimedProspect ? (
        <div className="container mx-auto max-w-6xl px-4 pt-6">
          <ArtistHomeProspectClaimBanner
            displayName={profile.displayName}
            slug={prospectClaim!.slug}
            prospectId={prospectClaim!.prospectId}
            claimSecret={prospectClaimSecret}
            signedIn={Boolean(user)}
            isOwner={isOwner}
          />
        </div>
      ) : null}
      <ArtistHome
        profile={profile}
        config={config}
        isOwner={isOwner}
        previewMode={isUnclaimedProspect}
        initialWallPosts={initialWallPosts}
        initialImprintPosts={initialImprintPosts}
      />
    </>
  );
}
