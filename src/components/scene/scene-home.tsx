'use client';

/**
 * The Scene — signed-in home. Friends feed + Discover stream + Your Booth in
 * the middle, studio progress on the left, nav dock on the right.
 * The feed is never empty: Discover cards fill in around friends' posts.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Check, Radio, Send, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { StudioLoader } from '@/components/studio-loader';
import { PostCard } from '@/components/profile/post-card';
import { FindArtistsPanel } from '@/components/profile/find-artists-panel';
import { VaultStudioProgress, SCENE_STUDIO_PROGRESS_EXPANDED_KEY, SCENE_STUDIO_PROGRESS_MOBILE_EXPANDED_KEY } from '@/components/gamification/vault-studio-progress';
import { SceneNavDock } from '@/components/scene/scene-nav-dock';
import { SceneBoothCard } from '@/components/scene/scene-booth-card';
import { SceneDiscoverCard } from '@/components/scene/scene-discover-card';
import { SceneLiveDropsStrip } from '@/components/scene/scene-live-drops-strip';
import { SceneBlockAtmosphere } from '@/components/scene/scene-block-atmosphere';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useToast } from '@/hooks/use-toast';
import {
  acceptFriendRequest,
  createPost,
  fetchBlockedUsers,
  fetchFriendships,
  fetchPostsByOwners,
  friendProfilesOf,
  removeFriendship,
  type Friendship,
  type ProfilePost,
} from '@/lib/profile/social-client';
import { FRIENDSHIP_CHANGED_EVENT, type FriendshipChangedDetail } from '@/lib/activity/client';
import { markBlockSeen } from '@/lib/profile/social-alerts';
import {
  buildDiscoverCards,
  DISCOVER_HOME_MAX_CARDS,
  fetchDiscover,
  type DiscoverCard,
  type DiscoverData,
} from '@/lib/scene/discover-client';
import { StudioGuidedTour } from '@/components/studio-guided-tour';
import {
  SCENE_HOME_TOUR_STEPS,
  markSceneTutorialComplete,
  PENDING_SCENE_TOUR_REPLAY_KEY,
  REPLAY_SCENE_TOUR_EVENT,
} from '@/lib/studio-onboarding';
import {
  dispatchStudioPrivacyIntroEligible,
  queueStudioPrivacyIntro,
  setVaultTourRunning,
} from '@/lib/studio-privacy-intro';
import { postGamificationEvent } from '@/lib/gamification-client';

function SceneComposer({
  profileSlug,
  onPosted,
}: {
  profileSlug?: string;
  onPosted: (post: ProfilePost) => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [embedUrl, setEmbedUrl] = useState('');
  const [showEmbed, setShowEmbed] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) return null;

  const submit = async () => {
    if (busy || (!text.trim() && !embedUrl.trim())) return;
    setBusy(true);
    try {
      const post = await createPost({
        text,
        embedUrl: embedUrl.trim() || undefined,
        ownerName: user.displayName || 'Artist',
        ...(profileSlug ? { ownerSlug: profileSlug } : {}),
      });
      setText('');
      setEmbedUrl('');
      setShowEmbed(false);
      onPosted(post);
      toast({ title: 'Posted to your wall' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not post', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-border/70 bg-card/60 p-4" data-tour="scene-composer">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Drop a bar to your wall — friends see it on their Scene."
        rows={2}
        maxLength={1000}
        className="min-h-[3.25rem] resize-none border-border/60 bg-background/60 text-sm"
      />
      {showEmbed && (
        <Input
          value={embedUrl}
          onChange={(e) => setEmbedUrl(e.target.value)}
          placeholder="YouTube / TikTok / Instagram / Facebook link (optional)"
          className="mt-2 h-9 border-border/60 bg-background/60 text-xs"
        />
      )}
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setShowEmbed((v) => !v)}
          className="font-code text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 transition-colors hover:text-primary"
        >
          {showEmbed ? '− Remove link' : '+ Add a link'}
        </button>
        <Button
          size="sm"
          className="h-9 gap-1.5 font-bold uppercase"
          disabled={busy || (!text.trim() && !embedUrl.trim())}
          onClick={() => void submit()}
        >
          <Send className="h-3.5 w-3.5" /> Post
        </Button>
      </div>
    </Card>
  );
}

export function SceneHome() {
  const { user, loading: authLoading } = useAuth();
  const { summary } = useGamification();
  const { toast } = useToast();

  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [discover, setDiscover] = useState<DiscoverData | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const tourAutoStartRef = useRef(false);

  const viewerSlug = summary.profileSlug || undefined;

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const [all, discoverData, blocked] = await Promise.all([
          fetchFriendships(user.id),
          fetchDiscover(user.id),
          fetchBlockedUsers(),
        ]);
        if (cancelled) return;
        // Fill missing requester slugs so friend-request names can open Artist Homes.
        const pendingLookups = all
          .filter((f) => f.status === 'pending' && f.requestedBy !== user.id)
          .map((f) => ({
            userId: f.requestedBy,
            slug: f.profiles[f.requestedBy]?.slug,
          }));
        let friendshipsForUi = all;
        if (pendingLookups.length) {
          const { fetchPublicArtistMetas } = await import('@/lib/profile/social-client');
          const metas = await fetchPublicArtistMetas(pendingLookups);
          friendshipsForUi = all.map((f) => {
            if (f.status !== 'pending' || f.requestedBy === user.id) return f;
            const meta = metas.get(f.requestedBy);
            if (!meta?.slug) return f;
            const existing = f.profiles[f.requestedBy] || { name: 'Artist' };
            return {
              ...f,
              profiles: {
                ...f.profiles,
                [f.requestedBy]: {
                  ...existing,
                  slug: existing.slug || meta.slug,
                  name: existing.name || meta.displayName || 'Artist',
                },
              },
            };
          });
        }
        if (cancelled) return;
        setFriendships(friendshipsForUi);
        setDiscover(discoverData);
        setBlockedIds(new Set(blocked.map((b) => b.blockedUserId)));
        const friendIds = friendProfilesOf(friendshipsForUi, user.id).map((f) => f.userId);
        // Your own posts ride the feed too — it's your scene, not a stranger's.
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
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Accept/decline on Activity or profile — clear the Scene request strip too.
  useEffect(() => {
    const onFriendshipChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<FriendshipChangedDetail>).detail;
      if (!detail) return;
      if (detail.action === 'accepted') {
        setFriendships((prev) =>
          prev.map((f) =>
            f.id === detail.friendshipId ? { ...f, status: 'accepted' as const } : f
          )
        );
      } else if (detail.action === 'removed') {
        setFriendships((prev) => prev.filter((f) => f.id !== detail.friendshipId));
      }
    };
    window.addEventListener(FRIENDSHIP_CHANGED_EVENT, onFriendshipChanged);
    return () => window.removeEventListener(FRIENDSHIP_CHANGED_EVENT, onFriendshipChanged);
  }, []);

  // Replay requested from another page (Studio Manual navigates here first).
  useEffect(() => {
    try {
      if (sessionStorage.getItem(PENDING_SCENE_TOUR_REPLAY_KEY)) {
        sessionStorage.removeItem(PENDING_SCENE_TOUR_REPLAY_KEY);
        setTourStep(0);
        setTourActive(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onReplay = () => {
      setTourStep(0);
      setTourActive(true);
    };
    window.addEventListener(REPLAY_SCENE_TOUR_EVENT, onReplay);
    return () => window.removeEventListener(REPLAY_SCENE_TOUR_EVENT, onReplay);
  }, []);

  // First-visit auto-start once the feed has painted.
  useEffect(() => {
    if (!user || authLoading || !loaded || tourAutoStartRef.current) return;
    if (user.sceneTutorialCompletedAt) return;
    tourAutoStartRef.current = true;
    setVaultTourRunning(true);
    let activated = false;
    const t = setTimeout(() => {
      activated = true;
      setTourActive(true);
    }, 1000);
    return () => {
      clearTimeout(t);
      if (!activated) setVaultTourRunning(false);
    };
  }, [user, authLoading, loaded]);

  useEffect(() => {
    setVaultTourRunning(tourActive);
    if (!tourActive) return;
    return () => setVaultTourRunning(false);
  }, [tourActive]);

  const handleTourComplete = useCallback(
    async (skipped: boolean) => {
      setTourActive(false);
      setVaultTourRunning(false);
      if (user && !user.sceneTutorialCompletedAt) {
        try {
          await markSceneTutorialComplete(user.id);
        } catch (e) {
          console.warn('Failed to save scene tutorial completion', e);
        }
      }
      if (!skipped) {
        void postGamificationEvent('tour_complete');
      }
      // Visibility choice lives on the Scene now — offer it right after the tour.
      if (user && !user.studioPrivacyIntroCompletedAt) {
        queueStudioPrivacyIntro();
        window.setTimeout(() => dispatchStudioPrivacyIntroEligible(), 400);
      }
    },
    [user]
  );

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

  const discoverCards: DiscoverCard[] = useMemo(() => {
    if (!discover) return [];
    return buildDiscoverCards(discover, {
      excludePostIds: new Set(posts.map((p) => p.id)),
      excludeUserIds: blockedIds,
      maxCards: DISCOVER_HOME_MAX_CARDS,
    });
  }, [discover, posts, blockedIds]);

  // Drives the Scene Block atmosphere — the skyline gets busier as your
  // circle does, not on a canned timer.
  const sceneEnergy =
    friendCount + posts.length + discoverCards.length + incomingRequests.length * 2;

  const onPosted = useCallback((post: ProfilePost) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  const onPostDeleted = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

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

  if (authLoading || !user) {
    return <StudioLoader size="lg" fullscreen />;
  }

  return (
    <TooltipProvider>
    <div className="flex-grow w-full relative min-h-screen selection:bg-primary/30 font-code">
      <SceneBlockAtmosphere energy={sceneEnergy} pulseKey={posts.length} />
      <div className="relative z-20 w-full min-w-0 max-w-[100vw] xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,44rem)_minmax(0,1fr)] xl:grid-rows-[auto_auto] xl:items-start">
        {/* Header — middle column */}
        <div className="relative min-w-0 w-full xl:col-start-2 xl:row-start-1 px-4 sm:px-6 pt-6">
          <header className="mb-6 border-b border-border pb-5" data-tour="scene-header">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                  <Radio className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <h1 className="font-headline text-3xl font-bold uppercase tracking-tight">
                    The Scene
                  </h1>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Your block · friends, drops, and who&apos;s live right now
                    {friendCount > 0 ? ` · ${friendCount} friends` : ''}
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* < xl: progress banner + nav strip stacked above the feed */}
          <div className="xl:hidden mb-4 space-y-3">
            <div data-tour="scene-progress-mobile">
              <VaultStudioProgress
                variant="banner"
                defaultExpanded={false}
                phoneStartsMinimized
                persistExpandedKey={SCENE_STUDIO_PROGRESS_MOBILE_EXPANDED_KEY}
              />
            </div>
            <SceneNavDock compact />
          </div>
        </div>

        {/* Left rail — studio progress (xl only) */}
        <aside
          className="hidden xl:flex xl:col-start-1 xl:row-start-2 justify-end items-start self-start pr-2 2xl:pr-3 sticky top-[5.25rem] z-30 pointer-events-none [&>*]:pointer-events-auto"
          aria-label="Studio progress"
          data-tour="scene-progress-desktop"
        >
          <VaultStudioProgress
            variant="sidebar"
            defaultExpanded
            persistExpandedKey={SCENE_STUDIO_PROGRESS_EXPANDED_KEY}
          />
        </aside>

        {/* Right rail — nav dock (xl only) */}
        <aside
          className="hidden xl:flex xl:col-start-3 xl:row-start-2 justify-start items-start self-start pl-2 2xl:pl-3 sticky top-[5.25rem] z-30 pointer-events-none [&>*]:pointer-events-auto"
          aria-label="Scene shortcuts"
        >
          <SceneNavDock />
        </aside>

        {/* Middle column — the feed */}
        <div className="relative min-w-0 w-full xl:col-start-2 xl:row-start-2 px-4 sm:px-6 pb-12 space-y-5">
          {incomingRequests.length > 0 && (
            <section className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
                <UserPlus className="h-3.5 w-3.5" /> Friend requests
              </h2>
              <div className="mt-3 space-y-2">
                {incomingRequests.map((request) => {
                  const requester = request.profiles[request.requestedBy];
                  const requesterSlug = requester?.slug;
                  return (
                    <div key={request.id} className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        {requesterSlug ? (
                          <Link
                            href={`/profile/${requesterSlug}`}
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

          <SceneComposer profileSlug={summary.profileSlug} onPosted={onPosted} />

          <SceneBoothCard />

          <SceneLiveDropsStrip />

          {!loaded ? (
            <div className="flex min-h-[30vh] items-center justify-center">
              <StudioLoader size="lg" />
            </div>
          ) : (
            <div className="space-y-4" data-tour="scene-feed">
              {posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    showAuthor
                    viewerSlug={viewerSlug}
                    onDeleted={onPostDeleted}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {friendCount === 0
                      ? 'Your circle is quiet so far — the scene below is live right now. Visit a page, add a friend, drop a bar.'
                      : 'Quiet block. Post something above to get it moving.'}
                  </p>
                </div>
              )}

              {discoverCards.length > 0 && (
                <div className="space-y-4" data-tour="scene-discover">
                  <div className="flex items-center gap-3 pt-2">
                    <span className="h-px flex-1 bg-border/60" />
                    <span className="font-code text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/70">
                      Discover the scene
                    </span>
                    <span className="h-px flex-1 bg-border/60" />
                  </div>
                  <div className="flex justify-end -mt-1">
                    <Link
                      href="/discover"
                      className="font-code text-[9px] font-bold uppercase tracking-[0.22em] text-primary/80 hover:text-primary"
                    >
                      View all →
                    </Link>
                  </div>
                  {discoverCards.map((card) => (
                    <SceneDiscoverCard key={card.key} card={card} viewerSlug={viewerSlug} />
                  ))}
                </div>
              )}
            </div>
          )}

          <div data-tour="scene-find-artists">
            <FindArtistsPanel viewerSlug={viewerSlug} />
          </div>
        </div>
      </div>

      <StudioGuidedTour
        active={tourActive}
        stepIndex={tourStep}
        onStepChange={setTourStep}
        onComplete={handleTourComplete}
        steps={SCENE_HOME_TOUR_STEPS}
      />
    </div>
    </TooltipProvider>
  );
}
