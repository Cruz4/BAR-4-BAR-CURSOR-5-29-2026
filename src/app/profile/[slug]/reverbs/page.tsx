'use client';

/**
 * Artist Reverbs — posts this artist passed along (repost / RT).
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Repeat2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StudioLoader } from '@/components/studio-loader';
import { PostCard } from '@/components/profile/post-card';
import { useAuth } from '@/hooks/use-auth';
import { fetchGamificationSummary } from '@/lib/gamification-client';
import {
  fetchReverbsByOwner,
  type ProfilePost,
} from '@/lib/profile/social-client';

export default function ProfileReverbsPage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const { user } = useAuth();
  const [displayName, setDisplayName] = useState('Artist');
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [viewerSlug, setViewerSlug] = useState<string | undefined>();
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/profile/${encodeURIComponent(slug)}`);
        if (!res.ok) {
          if (!cancelled) setMissing(true);
          return;
        }
        const data = (await res.json()) as {
          userId?: string;
          displayName?: string;
        };
        if (cancelled) return;
        if (!data.userId) {
          setMissing(true);
          return;
        }
        setOwnerId(data.userId);
        setDisplayName(
          typeof data.displayName === 'string' && data.displayName.trim()
            ? data.displayName.trim()
            : slug
        );
        const reverbs = await fetchReverbsByOwner(data.userId, 50);
        if (!cancelled) setPosts(reverbs);
      } catch {
        if (!cancelled) setMissing(true);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!user?.id) return;
    void fetchGamificationSummary(user.id).then((s) => {
      if (s?.profileSlug) setViewerSlug(s.profileSlug);
    });
  }, [user?.id]);

  if (!loaded) {
    return <StudioLoader size="lg" fullscreen />;
  }

  if (missing || !ownerId) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center space-y-4">
        <h1 className="font-headline text-2xl font-bold uppercase">Reverbs</h1>
        <p className="text-sm text-muted-foreground">Artist page not found.</p>
        <Button asChild className="font-bold uppercase">
          <Link href="/">Back to The Scene</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-3">
        <Button size="sm" variant="outline" className="h-8 gap-1.5 font-bold uppercase" asChild>
          <Link href={`/profile/${slug}`}>
            <ChevronLeft className="h-3.5 w-3.5" /> {displayName}
          </Link>
        </Button>
        <div className="flex items-end gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/35 bg-violet-500/15">
            <Repeat2 className="h-5 w-5 text-violet-300" />
          </span>
          <div>
            <h1 className="font-headline text-3xl font-bold uppercase tracking-tight">
              Reverbs
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Posts {displayName} passed along — the Scene&apos;s take on a repost
            </p>
          </div>
        </div>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No Reverbs yet. Hit Reverb on someone else&apos;s wall post to echo it here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              showAuthor
              viewerSlug={viewerSlug}
              onDeleted={(id) => setPosts((prev) => prev.filter((p) => p.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  );
}
