'use client';

/**
 * The Block — friends-only feed of Artist Home posts.
 * Small indexed reads only: your friendships, then a few posts per friend.
 */

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Trophy, UserPlus, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { PostCard } from '@/components/profile/post-card';
import { FindArtistsPanel } from '@/components/profile/find-artists-panel';
import { StudioLoader } from '@/components/studio-loader';
import { fetchGamificationSummary } from '@/lib/gamification-client';
import {
  acceptFriendRequest,
  fetchFriendships,
  fetchPostsByOwners,
  friendProfilesOf,
  removeFriendship,
  type Friendship,
  type ProfilePost,
} from '@/lib/profile/social-client';
import { markBlockSeen } from '@/lib/profile/social-alerts';

export default function FeedPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [viewerSlug, setViewerSlug] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const all = await fetchFriendships(user.id);
        if (cancelled) return;
        setFriendships(all);
        const friendIds = friendProfilesOf(all, user.id).map((f) => f.userId);
        // Your own posts ride the feed too — it's your block, not a stranger's.
        const feed = await fetchPostsByOwners([user.id, ...friendIds]);
        if (!cancelled) setPosts(feed);
      } finally {
        if (!cancelled) {
          setLoaded(true);
          markBlockSeen();
        }
      }
    };
    void load();
    void fetchGamificationSummary(user.id).then((summary) => {
      if (summary?.publicProfile && summary.profileSlug) setViewerSlug(summary.profileSlug);
    });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const incomingRequests = useMemo(
    () =>
      user?.id
        ? friendships.filter((f) => f.status === 'pending' && f.requestedBy !== user.id)
        : [],
    [friendships, user?.id]
  );
  const friendCount = useMemo(
    () => (user?.id ? friendProfilesOf(friendships, user.id).length : 0),
    [friendships, user?.id]
  );

  if (authLoading) {
    return <StudioLoader size="lg" fullscreen />;
  }

  if (!user) {
    return (
      <div className="container mx-auto max-w-lg px-4 py-20 text-center space-y-4">
        <Users className="mx-auto h-10 w-10 text-primary" />
        <h1 className="font-headline text-2xl font-bold uppercase">The Block</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to see drops from your friends&apos; Artist Homes.
        </p>
        <Button className="font-bold uppercase" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );
  }

  const respond = async (friendship: Friendship, accept: boolean) => {
    try {
      if (accept) {
        await acceptFriendRequest(friendship.id);
        setFriendships((prev) =>
          prev.map((f) => (f.id === friendship.id ? { ...f, status: 'accepted' as const } : f))
        );
      } else {
        await removeFriendship(friendship.id);
        setFriendships((prev) => prev.filter((f) => f.id !== friendship.id));
      }
    } catch {
      toast({ variant: 'destructive', title: 'Could not update request' });
    }
  };

  return (
    <div className="container mx-auto max-w-2xl space-y-6 px-4 py-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-headline text-3xl font-bold uppercase tracking-tight">The Block</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drops from your circle{friendCount > 0 ? ` · ${friendCount} friends` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="h-9 gap-1.5 font-bold uppercase" asChild>
            <Link href="/leaderboard">
              <Trophy className="h-3.5 w-3.5" /> Leaderboard
            </Link>
          </Button>
          <Button size="sm" variant="outline" className="h-9 gap-1.5 font-bold uppercase" asChild>
            <Link href="/friends">
              <Users className="h-3.5 w-3.5" /> Your circle
            </Link>
          </Button>
        </div>
      </header>

      <FindArtistsPanel viewerSlug={viewerSlug} />

      {incomingRequests.length > 0 && (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
            <UserPlus className="h-3.5 w-3.5" /> Friend requests
          </h2>
          <div className="mt-3 space-y-2">
            {incomingRequests.map((request) => {
              const requester = request.profiles[request.requestedBy];
              return (
                <div key={request.id} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    {requester?.slug ? (
                      <Link
                        href={`/profile/${requester.slug}`}
                        className="text-sm font-bold text-white hover:text-primary"
                      >
                        {requester?.name || 'Artist'}
                      </Link>
                    ) : (
                      <span className="text-sm font-bold text-white">
                        {requester?.name || 'Artist'}
                      </span>
                    )}
                  </div>
                  <Button
                    size="sm"
                    className="h-8 gap-1 font-bold uppercase"
                    onClick={() => void respond(request, true)}
                  >
                    <Check className="h-3.5 w-3.5" /> Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 font-bold uppercase"
                    onClick={() => void respond(request, false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!loaded ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <StudioLoader size="lg" />
        </div>
      ) : posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} showAuthor viewerSlug={viewerSlug} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-16 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {friendCount === 0
              ? 'No friends on the block yet. Visit an artist page and add them — their drops land here.'
              : 'Quiet block. Post something on your own wall to get it moving.'}
          </p>
          {viewerSlug && (
            <Button size="sm" variant="outline" className="h-9 font-bold uppercase" asChild>
              <Link href={`/profile/${viewerSlug}`}>Go to my page</Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
