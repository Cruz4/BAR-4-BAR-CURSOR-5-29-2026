'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StudioLoader } from '@/components/studio-loader';
import { ArtistHome } from '@/components/profile/artist-home';
import { publicProfileView } from '@/lib/profile/public-profile-view';
import type { PublicWallPostsPage } from '@/lib/server/public-post';
import type { ProfilePost } from '@/lib/profile/social-client';
import { persistArtistHomeProspectClaim } from '@/lib/artist-home-prospect-session';
import { ArtistHomeProspectClaimBanner } from '@/components/profile/artist-home-prospect-claim-banner';
import { ArtistHomeProspectClaimBootstrap } from '@/components/profile/artist-home-prospect-claim-bootstrap';
import { useAuth } from '@/hooks/use-auth';

export function ArtistHomeProspectPreviewClient({ viewToken }: { viewToken: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [prospectId, setProspectId] = useState('');
  const [slug, setSlug] = useState('');
  const [view, setView] = useState<ReturnType<typeof publicProfileView> | null>(null);
  const [wallPosts, setWallPosts] = useState<PublicWallPostsPage | null>(null);

  useEffect(() => {
    if (!viewToken) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(
          `/api/artist-home-prospect/view?token=${encodeURIComponent(viewToken)}`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error('not found');
        const data = await res.json();
        if (cancelled) return;
        const profileView = publicProfileView(data.profile, data.slug || 'preview');
        setView(profileView);
        setProspectId(String(data.prospectId || ''));
        setSlug(String(data.slug || ''));
        const posts = Array.isArray(data.wallPosts) ? (data.wallPosts as ProfilePost[]) : [];
        setWallPosts(
          posts.length
            ? { posts, page: 0, pageCount: 1, total: posts.length }
            : null
        );
        if (data.prospectId && data.slug) {
          persistArtistHomeProspectClaim({
            prospectId: String(data.prospectId),
            slug: String(data.slug),
          });
        }
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [viewToken]);

  if (loading) {
    return <StudioLoader size="lg" fullscreen className="!bg-[hsl(216_28%_5%)]" />;
  }

  if (error || !view) {
    return (
      <div className="container mx-auto max-w-lg py-20 px-4 text-center space-y-4">
        <p className="text-muted-foreground">This preview link is not available.</p>
        <Link href="/" className="text-primary text-sm font-bold uppercase">
          Back to studio
        </Link>
      </div>
    );
  }

  return (
    <>
      <ArtistHomeProspectClaimBootstrap />
      <div className="container mx-auto max-w-6xl px-4 pt-6">
        <ArtistHomeProspectClaimBanner
          displayName={view.profile.displayName}
          slug={slug}
          signedIn={Boolean(user)}
          isOwner={false}
        />
      </div>
      <ArtistHome
        profile={view.profile}
        config={view.config}
        isOwner={false}
        previewMode
        initialWallPosts={wallPosts}
      />
    </>
  );
}
