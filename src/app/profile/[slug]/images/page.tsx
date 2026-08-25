'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Images } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLoader } from '@/components/studio-loader';
import { PostCard } from '@/components/profile/post-card';
import { ProfileSectionTabs } from '@/components/profile/profile-section-tabs';
import { useAuth } from '@/hooks/use-auth';
import { fetchGamificationSummary } from '@/lib/gamification-client';
import { profileHref } from '@/lib/profile/profile-slug';
import type { ProfilePost } from '@/lib/profile/social-client';
import { PublicProfileSectionShell } from '@/components/profile/public-profile-section-shell';

export default function ProfileImagesPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('Artist');
  const [rawProfile, setRawProfile] = useState<unknown>({});
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [viewerSlug, setViewerSlug] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [missing, setMissing] = useState(false);

  const loadPage = useCallback(async (nextCursor?: string) => {
    const query = new URLSearchParams({ kind: 'images' });
    if (nextCursor) query.set('cursor', nextCursor);
    const response = await fetch(`/api/profile/${encodeURIComponent(slug)}/posts?${query}`);
    if (!response.ok) throw new Error('Images unavailable');
    const data = (await response.json()) as { posts?: ProfilePost[]; nextCursor?: string | null };
    setPosts((current) => (nextCursor ? [...current, ...(data.posts || [])] : data.posts || []));
    setCursor(data.nextCursor || null);
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch(`/api/profile/${encodeURIComponent(slug)}`);
        if (!response.ok) throw new Error('Profile unavailable');
        const profile = (await response.json()) as { displayName?: string };
        if (cancelled) return;
        setDisplayName(profile.displayName?.trim() || slug);
        setRawProfile(profile);
        await loadPage();
      } catch {
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, loadPage]);

  useEffect(() => {
    if (!user?.id) return;
    void fetchGamificationSummary(user.id).then((summary) => setViewerSlug(summary?.profileSlug));
  }, [user?.id]);

  if (!loaded) return <StudioLoader size="lg" fullscreen />;
  if (missing) {
    return <div className="mx-auto max-w-lg px-4 py-20 text-center">Artist page not found.</div>;
  }
  return (
    <PublicProfileSectionShell rawProfile={rawProfile} slug={slug}>
    <main className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Button size="sm" variant="outline" asChild className="h-8 gap-1.5 font-bold uppercase">
        <Link href={profileHref(slug) || '/'} replace><ChevronLeft className="h-4 w-4" /> {displayName}</Link>
      </Button>
      <ProfileSectionTabs slug={slug} />
      <header>
        <h1 className="flex items-center gap-2 font-headline text-3xl font-bold uppercase"><Images className="h-7 w-7 text-sky-400" /> Images</h1>
        <p className="text-sm text-muted-foreground">Every public image {displayName} posted.</p>
      </header>
      {posts.length ? (
        <div className="space-y-4">
          {posts.map((post) => <PostCard key={post.id} post={post} showAuthor viewerSlug={viewerSlug} />)}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 px-6 py-16 text-center text-sm text-muted-foreground">No public image posts yet.</div>
      )}
      {cursor ? (
        <Button
          variant="outline"
          className="w-full font-bold uppercase"
          disabled={loadingMore}
          onClick={() => {
            setLoadingMore(true);
            void loadPage(cursor).finally(() => setLoadingMore(false));
          }}
        >{loadingMore ? 'Loading…' : 'Load more images'}</Button>
      ) : null}
    </main>
    </PublicProfileSectionShell>
  );
}
