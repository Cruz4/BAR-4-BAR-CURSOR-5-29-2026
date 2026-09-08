'use client';

/**
 * The Scene — signed-in home. Your Booth leads into a reversible portal hub;
 * Your Block and Discover reuse the real feeds inside an immersive snap viewer.
 * The original inline feeds and shortcut dock remain behind one feature switch.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart3, Check, ChevronDown, Radio, Send, Sparkles, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { StudioLoader } from '@/components/studio-loader';
import { PostCard } from '@/components/profile/post-card';
import { LiveArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { VoiceNoteComposer } from '@/components/profile/voice-note-composer';
import { ComposerLinkPreview } from '@/components/profile/inline-link-preview';
import { ImageAttachComposer, attachPastedImage } from '@/components/profile/image-attach-composer';
import { EmojiPickerButton, useEmojiInserter } from '@/components/ui/emoji-picker-button';
import { ReferAFriendSection } from '@/components/refer-a-friend-section';
import { VaultStudioProgress, SCENE_STUDIO_PROGRESS_EXPANDED_KEY, SCENE_STUDIO_PROGRESS_MOBILE_EXPANDED_KEY } from '@/components/gamification/vault-studio-progress';
import { SceneNavDock } from '@/components/scene/scene-nav-dock';
import { SceneBoothCard } from '@/components/scene/scene-booth-card';
import { SceneDiscoverCard } from '@/components/scene/scene-discover-card';
import { SceneLiveDropsStrip } from '@/components/scene/scene-live-drops-strip';
import { SceneOnSaleRail } from '@/components/scene/scene-on-sale-rail';
import { SceneLivePrompts } from '@/components/scene/scene-live-prompts';
import { SceneHouseBarPin } from '@/components/scene/scene-house-bar-pin';
import { SceneWeatherChip } from '@/components/scene/scene-weather-chip';
import { SceneBoothMemoryCard } from '@/components/scene/scene-booth-memory-card';
import { SceneBlockAtmosphere } from '@/components/scene/scene-block-atmosphere';
import { InfiniteFeedSentinel } from '@/components/scene/infinite-feed-sentinel';
import { SceneFeedJumpHints } from '@/components/scene/scene-feed-jump-hints';
import { SceneUniversalSearch } from '@/components/scene/scene-universal-search';
import { SceneChartSpotlight } from '@/components/scene/scene-chart-spotlight';
import { ScenePortalHub } from '@/components/scene/scene-portal-hub';
import { SceneImmersiveFeedDialog } from '@/components/scene/scene-immersive-feed-dialog';
import { LockClaimBootstrap } from '@/components/lock/lock-claim-bootstrap';
import { GuestPressingClaimBootstrap } from '@/components/profile/guest-pressing-claim-bootstrap';
import { MentionField } from '@/components/profile/mention-suggestions';
import { PollComposerFields } from '@/components/profile/poll-composer-fields';
import { QuotePressCard } from '@/components/profile/quote-press-card';
import { queueAutoImprintSyndication } from '@/lib/profile/imprint-syndicate-client';
import { QuotePressComposerPanel } from '@/components/profile/quote-press-composer-panel';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/hooks/use-auth';
import { useGamification } from '@/context/gamification-context';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  acceptFriendRequest,
  createPost,
  fetchBlockedUsers,
  fetchFriendships,
  fetchPostById,
  fetchPostsByOwners,
  friendProfilesOf,
  removeFriendship,
  type Friendship,
  type ProfilePost,
} from '@/lib/profile/social-client';
import { type RecordedVoiceClip } from '@/lib/profile/voice-notes';
import { revokePostImagePreview, type PendingPostImage } from '@/lib/profile/post-images';
import { revokeWallClipPreview, type PendingWallClip } from '@/lib/profile/wall-clips';
import type { PostPollResultsVisibility } from '@/lib/profile/post-polls';
import { FRIENDSHIP_CHANGED_EVENT, type FriendshipChangedDetail } from '@/lib/activity/client';
import { getBlockLastSeenAt, markBlockSeen } from '@/lib/profile/social-alerts';
import {
  buildDiscoverCards,
  DISCOVER_HOME_MAX_CARDS,
  discoverCardTimestamp,
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
import {
  dispatchActivityPushIntroEligible,
  queueActivityPushIntro,
} from '@/lib/activity-push-intro';
import {
  COOKIE_CONSENT_CHANGED_EVENT,
  hasMarketingCookieConsent,
} from '@/lib/tiktok-pixel';
import {
  quotePressFadersFromText,
  quotePressSlotLabel,
  sanitizeQuotePressSlots,
  type QuotePressFaders,
  type QuotePressSlot,
} from '@/lib/profile/quote-press';
import { isProOrTrial } from '@/lib/subscription';
import { patchGamificationSettings, postGamificationEvent } from '@/lib/gamification-client';
import {
  BLOCK_SECTION_ID,
  DISCOVER_SECTION_ID,
  FIND_ARTISTS_SECTION_ID,
  SCENE_TOP_ID,
} from '@/lib/scene-home';
import { parseActivityPostHash, scrollActivityPostTarget } from '@/lib/activity/post-deep-link';
import {
  BLOCK_PAGE_SIZE,
  DISCOVER_PAGE_SIZE,
  SCENE_BLOCK_EXPANDED_KEY,
  SCENE_DISCOVER_EXPANDED_KEY,
  getDiscoverLastSeenAt,
  markDiscoverSeen,
  readPersistedExpanded,
  writePersistedExpanded,
} from '@/lib/scene/scene-section-prefs';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { profileHref } from '@/lib/profile/profile-slug';
import { useSceneLayout } from '@/hooks/use-scene-layout';
import {
  mergeWallPostFeed,
  WALL_POST_FEED_EVENT,
  type WallPostFeedDetail,
} from '@/lib/scene/wall-post-feed-events';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  clearScenePortalSlide,
  closeScenePortalFeed,
  parseScenePortalFeed,
  readScenePortalFeedCache,
  readScenePortalSlide,
  rememberScenePortalFeedCache,
  rememberScenePortalSlide,
  scenePortalHref,
} from '@/lib/scene/portal-feed';

const SCENE_BLOCK_SHOW_MINE_KEY = 'b4b.scene.block.showMine';

function mergePosts(prev: ProfilePost[], incoming: ProfilePost[]): ProfilePost[] {
  if (incoming.length === 0) return prev;
  const map = new Map(prev.map((post) => [post.id, post]));
  for (const post of incoming) map.set(post.id, post);
  return [...map.values()].sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id)
  );
}

function FeedCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
        <div className="h-3 w-28 rounded bg-white/10" />
      </div>
      <div className="mt-3 h-3 w-full rounded bg-white/10" />
      <div className="mt-2 h-3 w-2/3 rounded bg-white/10" />
    </div>
  );
}

function SoftNewBubble({ count, label }: { count: number; label: string }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500/90 px-1 text-[9px] font-bold tabular-nums text-black shadow-[0_0_10px_rgba(16,185,129,0.45)]"
      aria-label={`${count} new in ${label}`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

function SceneComposer({
  profileSlug,
  onPosted,
}: {
  profileSlug?: string;
  onPosted: (post: ProfilePost) => void;
}) {
  const { user } = useAuth();
  const { summary, loading: profileLoading } = useGamification();
  const { toast } = useToast();
  const isPro = isProOrTrial(user);
  const [text, setText] = useState('');
  const [voice, setVoice] = useState<RecordedVoiceClip | null>(null);
  const [image, setImage] = useState<PendingPostImage | null>(null);
  const [clip, setClip] = useState<PendingWallClip | null>(null);
  const [pollOpen, setPollOpen] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollVisibility, setPollVisibility] = useState<PostPollResultsVisibility>('after_vote');
  const [imprintOn, setImprintOn] = useState(false);
  const [imprintFaders, setImprintFaders] = useState<QuotePressFaders>(() =>
    quotePressFadersFromText('')
  );
  const [imprintSlots, setImprintSlots] = useState<QuotePressSlot[]>([]);
  const [slotBusy, setSlotBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const textRef = useRef<HTMLTextAreaElement | null>(null);
  const imprintPreviewRef = useRef<HTMLDivElement | null>(null);
  const insertEmoji = useEmojiInserter(text, setText, textRef);

  useEffect(() => {
    setImprintSlots(sanitizeQuotePressSlots(summary.quotePressSlots));
  }, [summary.quotePressSlots]);

  const activeImprintConfig = useMemo(() => {
    const faders = isPro ? imprintFaders : quotePressFadersFromText(text);
    return { faders };
  }, [isPro, imprintFaders, text]);

  const persistImprintSlots = async (nextSlots: QuotePressSlot[]) => {
    setSlotBusy(true);
    try {
      await patchGamificationSettings({ quotePressSlots: nextSlots });
      setImprintSlots(nextSlots);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not save imprint style',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSlotBusy(false);
    }
  };

  useEffect(() => {
    const el = textRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = `${Math.max(56, el.scrollHeight)}px`;
  }, [text]);

  const profileLive = Boolean(summary.publicProfile && summary.profileSlug);
  const pollReady = !pollOpen || (Boolean(text.trim()) && pollOptions.every((option) => option.trim()));
  if (!user || profileLoading || !profileLive) return null;

  const submit = async () => {
    if (busy || !pollReady || (!text.trim() && !voice && !image && !clip)) return;
    setBusy(true);
    try {
      const post = await createPost({
        text,
        ownerName: user.displayName || 'Artist',
        ...(profileSlug ? { ownerSlug: profileSlug } : {}),
        ...(voice ? { voice } : {}),
        ...(image ? { image } : {}),
        ...(clip ? { video: clip } : {}),
        ...(pollOpen ? { poll: { options: pollOptions, resultsVisibility: pollVisibility } } : {}),
        ...(imprintOn && text.trim() ? { quotePress: activeImprintConfig } : {}),
      });
      const captureRoot = imprintPreviewRef.current;
      if (post.quotePress && captureRoot) {
        void queueAutoImprintSyndication({ post, captureRoot });
      }
      setText('');
      setVoice(null);
      revokePostImagePreview(image);
      setImage(null);
      revokeWallClipPreview(clip);
      setClip(null);
      setPollOpen(false);
      setPollOptions(['', '']);
      setPollVisibility('after_vote');
      setImprintOn(false);
      onPosted(post);
      toast({ title: 'Posted to your wall' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Could not post', description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-tour="scene-composer" className="relative">
      <MentionField value={text} onChange={setText} excludeUserId={user?.id}>
        <Textarea
          ref={textRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onPaste={(e) => {
            void attachPastedImage(e, {
              disabled: busy,
              image,
              onImageChange: setImage,
              clip,
              onClipChange: setClip,
              onError: (message) =>
                toast({ variant: 'destructive', title: 'Could not attach photo', description: message }),
            });
          }}
          placeholder="Write a post, or paste a link or photo…"
          rows={2}
          maxLength={1000}
          className="min-h-[3.5rem] overflow-hidden resize-none border-border/60 bg-background/60 text-sm leading-snug"
        />
      </MentionField>
      <ComposerLinkPreview text={text} />
      {imprintOn && text.trim() ? (
        <div className="mt-2 space-y-2">
          <QuotePressCard
            ref={imprintPreviewRef}
            text={text}
            config={activeImprintConfig}
            creatorSlug={profileSlug}
          />
          <QuotePressComposerPanel
            faders={activeImprintConfig.faders}
            onFadersChange={(next) => {
              if (!isPro) return;
              setImprintFaders(next);
            }}
            slots={imprintSlots}
            isPro={isPro}
            busy={busy || slotBusy}
            onLockSlot={() => {
              if (!isPro) return;
              const label = quotePressSlotLabel(imprintFaders);
              const next: QuotePressSlot = {
                id: `qp-${Date.now()}`,
                faders: { ...imprintFaders },
                lockedAt: new Date().toISOString(),
                label,
              };
              void persistImprintSlots([...imprintSlots, next]);
            }}
            onLoadSlot={(slot) => {
              if (!isPro) return;
              setImprintFaders(slot.faders);
            }}
            onClearSlot={(slotId) => {
              void persistImprintSlots(imprintSlots.filter((s) => s.id !== slotId));
            }}
          />
        </div>
      ) : null}
      {pollOpen ? (
        <PollComposerFields
          options={pollOptions}
          onOptionsChange={setPollOptions}
          resultsVisibility={pollVisibility}
          onResultsVisibilityChange={setPollVisibility}
          onRemovePoll={() => {
            setPollOpen(false);
            setPollOptions(['', '']);
            setPollVisibility('after_vote');
          }}
          disabled={busy}
        />
      ) : null}
      <div className="mt-1.5 flex min-w-0 items-center gap-1 overflow-x-auto">
        <div className={cn('shrink-0', voice && 'min-w-0 max-w-full basis-full sm:basis-auto')}>
          <VoiceNoteComposer clip={voice} onClipChange={setVoice} disabled={busy} compact />
        </div>
        <div className="shrink-0">
          <ImageAttachComposer
            image={image}
            onImageChange={setImage}
            clip={clip}
            onClipChange={setClip}
            disabled={busy}
            compact
            onError={(message) =>
              toast({ variant: 'destructive', title: 'Could not attach photo', description: message })
            }
          />
        </div>
        <EmojiPickerButton
          compact
          disabled={busy}
          onInsert={insertEmoji}
          className="text-muted-foreground hover:text-primary"
        />
        <button
          type="button"
          onClick={() => setPollOpen((value) => !value)}
          disabled={busy}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-code text-[9px] font-bold uppercase tracking-wider transition-colors',
            pollOpen ? 'text-cyan-300' : 'text-muted-foreground/70 hover:text-cyan-300'
          )}
        >
          <BarChart3 className="h-3.5 w-3.5" /> Poll
        </button>
        <button
          type="button"
          onClick={() => {
            setImprintOn((value) => {
              const next = !value;
              if (next && isPro) {
                setImprintFaders(quotePressFadersFromText(text));
              }
              return next;
            });
          }}
          disabled={busy}
          className={cn(
            'inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-1 font-code text-[9px] font-bold uppercase tracking-wider transition-all',
            imprintOn
              ? 'border-cyan-400/55 bg-cyan-500/20 text-cyan-100 shadow-[0_0_14px_rgba(34,211,238,0.28)]'
              : 'border-transparent text-muted-foreground/70 hover:border-cyan-500/35 hover:bg-cyan-500/10 hover:text-cyan-300'
          )}
        >
          <Sparkles
            className={cn('h-3.5 w-3.5', imprintOn ? 'text-cyan-200' : 'text-cyan-400/80')}
          />
          Imprint
        </button>
        <Button
          size="sm"
          className="ml-auto h-7 shrink-0 gap-1 px-2.5 font-bold uppercase"
          disabled={busy || !pollReady || (!text.trim() && !voice && !image && !clip)}
          onClick={() => void submit()}
        >
          <Send className="h-3 w-3" /> Post
        </Button>
      </div>
    </div>
  );
}

export function SceneHome() {
  const { user, loading: authLoading } = useAuth();
  const { summary } = useGamification();
  const { toast } = useToast();
  const { portalHubEnabled } = useSceneLayout();
  const isMobile = useIsMobile();
  const showPortalHub = portalHubEnabled && isMobile;
  const router = useRouter();
  const searchParams = useSearchParams();
  const portalFeed = showPortalHub ? parseScenePortalFeed(searchParams) : null;

  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [posts, setPosts] = useState<ProfilePost[]>([]);
  const [discover, setDiscover] = useState<DiscoverData | null>(null);
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [blockReady, setBlockReady] = useState(false);
  const [discoverReady, setDiscoverReady] = useState(false);
  const [circleLoading, setCircleLoading] = useState(true);
  const [tourActive, setTourActive] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [showMine, setShowMine] = useState(true);
  const [blockExpanded, setBlockExpanded] = useState(true);
  const [discoverExpanded, setDiscoverExpanded] = useState(true);
  const [blockVisible, setBlockVisible] = useState(BLOCK_PAGE_SIZE);
  const [discoverVisible, setDiscoverVisible] = useState(DISCOVER_PAGE_SIZE);
  const [blockLastSeen, setBlockLastSeen] = useState<string | null>(null);
  const [discoverLastSeen, setDiscoverLastSeen] = useState<string | null>(null);
  const [immersiveFeed, setImmersiveFeed] = useState<'block' | 'discover' | null>(null);
  const [immersiveInitialKey, setImmersiveInitialKey] = useState<string | undefined>(undefined);
  const tourAutoStartRef = useRef(false);
  const portalCacheHydratedRef = useRef(false);

  useEffect(() => {
    if (!showPortalHub || portalCacheHydratedRef.current) return;
    portalCacheHydratedRef.current = true;
    const cached = readScenePortalFeedCache();
    if (!cached) return;
    if (cached.posts.length) {
      setPosts((prev) => mergePosts(prev, cached.posts));
      setBlockReady(true);
      setLoaded(true);
    }
    if (cached.discover) {
      setDiscover(cached.discover);
      setDiscoverReady(true);
    }
  }, [showPortalHub]);

  useEffect(() => {
    if (!showPortalHub) {
      setImmersiveFeed(null);
      return;
    }
    setImmersiveFeed(portalFeed);
    setImmersiveInitialKey(portalFeed ? readScenePortalSlide(portalFeed) : undefined);
  }, [portalFeed, showPortalHub]);

  const viewerSlug = summary.profileSlug || undefined;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SCENE_BLOCK_SHOW_MINE_KEY);
      if (raw === '0' || raw === 'false') setShowMine(false);
      else if (raw === '1' || raw === 'true') setShowMine(true);
    } catch {
      /* ignore */
    }
    setBlockExpanded(readPersistedExpanded(SCENE_BLOCK_EXPANDED_KEY, true));
    setDiscoverExpanded(readPersistedExpanded(SCENE_DISCOVER_EXPANDED_KEY, true));
    setBlockLastSeen(getBlockLastSeenAt());
    setDiscoverLastSeen(getDiscoverLastSeenAt());
  }, []);

  const setShowMinePersist = useCallback((next: boolean) => {
    setShowMine(next);
    setBlockVisible(BLOCK_PAGE_SIZE);
    try {
      localStorage.setItem(SCENE_BLOCK_SHOW_MINE_KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const setBlockExpandedPersist = useCallback((next: boolean) => {
    setBlockExpanded(next);
    writePersistedExpanded(SCENE_BLOCK_EXPANDED_KEY, next);
    if (next && !showPortalHub) {
      markBlockSeen();
      setBlockLastSeen(new Date().toISOString());
    }
  }, [showPortalHub]);

  const setDiscoverExpandedPersist = useCallback((next: boolean) => {
    setDiscoverExpanded(next);
    writePersistedExpanded(SCENE_DISCOVER_EXPANDED_KEY, next);
    if (next && !showPortalHub) {
      markDiscoverSeen();
      setDiscoverLastSeen(new Date().toISOString());
    }
  }, [showPortalHub]);

  const sceneProgressTourPinned =
    tourActive && SCENE_HOME_TOUR_STEPS[tourStep]?.id === 'scene-progress';

  const reloadBlockFeed = useCallback(async (nextFriendships: Friendship[], viewerId: string) => {
    const friendIds = friendProfilesOf(nextFriendships, viewerId, {
      email: user?.email,
      displayName: user?.displayName,
    }).map((f) => f.userId);
    const feed = await fetchPostsByOwners([viewerId, ...friendIds], 8);
    setPosts((prev) => mergePosts(prev, feed));
  }, [user?.email, user?.displayName]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    let circleDone = false;
    let heldDiscover: DiscoverData | null = null;

    const releaseDiscover = (data: DiscoverData) => {
      if (cancelled) return;
      setDiscover(data);
      setDiscoverReady(true);
      if (!showPortalHub && readPersistedExpanded(SCENE_DISCOVER_EXPANDED_KEY, true)) {
        markDiscoverSeen();
        setDiscoverLastSeen(new Date().toISOString());
      }
    };

    void fetchPostsByOwners([user.id], 8)
      .then((ownPosts) => {
        if (cancelled) return;
        setPosts((prev) => mergePosts(prev, ownPosts));
        setBlockReady(true);
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setBlockReady(true);
        setLoaded(true);
      });

    void fetchDiscover(user.id, { enrichSlugs: false })
      .then((discoverData) => {
        if (cancelled) return;
        if (circleDone) releaseDiscover(discoverData);
        else heldDiscover = discoverData;
      })
      .catch(() => {
        if (cancelled) return;
        if (circleDone) setDiscoverReady(true);
        else heldDiscover = {
          artists: [],
          posts: [],
          drops: [],
          risers: [],
          locks: [],
          viewerGraph: { personalized: false, hasTaste: false, hasCreation: false },
          publicPulse: { profiles: 0, posts: 0, pressedSongs: 0 },
        };
      });

    const loadCircle = async () => {
      try {
        setCircleLoading(true);
        const [all, blocked] = await Promise.all([
          fetchFriendships(user.id),
          fetchBlockedUsers(),
        ]);
        if (cancelled) return;
        setBlockedIds(new Set(blocked.map((b) => b.blockedUserId)));
        setFriendships(all);
        await reloadBlockFeed(all, user.id);
        if (cancelled) return;

        const pendingLookups = all
          .filter((f) => f.status === 'pending' && f.requestedBy !== user.id)
          .map((f) => ({
            userId: f.requestedBy,
            slug: f.profiles[f.requestedBy]?.slug,
          }));
        if (!pendingLookups.length) return;
        const { fetchPublicArtistMetas } = await import('@/lib/profile/social-client');
        const metas = await fetchPublicArtistMetas(pendingLookups);
        if (cancelled) return;
        setFriendships(
          all.map((f) => {
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
                  slug: meta.slug || existing.slug,
                  name: meta.displayName || existing.name || 'Artist',
                },
              },
            };
          })
        );
      } finally {
        if (!cancelled) {
          circleDone = true;
          setLoaded(true);
          setBlockReady(true);
          setCircleLoading(false);
          if (heldDiscover) releaseDiscover(heldDiscover);
          if (!showPortalHub && readPersistedExpanded(SCENE_BLOCK_EXPANDED_KEY, true)) {
            markBlockSeen();
            setBlockLastSeen(new Date().toISOString());
          }
        }
      }
    };
    void loadCircle();
    return () => {
      cancelled = true;
    };
  }, [user?.id, reloadBlockFeed, showPortalHub]);

  // Accept/decline on Activity or profile — clear the Scene request strip too.
  useEffect(() => {
    if (!user?.id) return;
    const onFriendshipChanged = (ev: Event) => {
      const detail = (ev as CustomEvent<FriendshipChangedDetail>).detail;
      if (!detail) return;
      if (detail.action === 'accepted') {
        setFriendships((prev) => {
          const next = prev.map((f) =>
            f.id === detail.friendshipId ? { ...f, status: 'accepted' as const } : f
          );
          void reloadBlockFeed(next, user.id);
          return next;
        });
      } else if (detail.action === 'removed') {
        setFriendships((prev) => {
          const next = prev.filter((f) => f.id !== detail.friendshipId);
          void reloadBlockFeed(next, user.id);
          return next;
        });
      }
    };
    window.addEventListener(FRIENDSHIP_CHANGED_EVENT, onFriendshipChanged);
    return () => window.removeEventListener(FRIENDSHIP_CHANGED_EVENT, onFriendshipChanged);
  }, [user?.id, reloadBlockFeed]);

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

  // First-visit auto-start once the feed has painted — after cookie consent so banners don't stack.
  useEffect(() => {
    if (!user || authLoading || !loaded || tourAutoStartRef.current) return;
    if (user.sceneTutorialCompletedAt) return;

    let cancelled = false;
    let activateTimer = 0;
    let armed = false;
    let activated = false;

    const tryStart = () => {
      if (cancelled || tourAutoStartRef.current || armed) return;
      if (!hasMarketingCookieConsent()) return;
      armed = true;
      tourAutoStartRef.current = true;
      setVaultTourRunning(true);
      activateTimer = window.setTimeout(() => {
        activated = true;
        if (!cancelled) setTourActive(true);
      }, 1000);
    };

    tryStart();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, tryStart);
    return () => {
      cancelled = true;
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, tryStart);
      if (activateTimer) window.clearTimeout(activateTimer);
      if (armed && !activated) setVaultTourRunning(false);
    };
  }, [user, authLoading, loaded]);

  useEffect(() => {
    setVaultTourRunning(tourActive);
    if (!tourActive) return;
    return () => setVaultTourRunning(false);
  }, [tourActive]);

  // Client navigations to `/#your-block` / `#discover-scene` often skip native hash scroll.
  useEffect(() => {
    if (!loaded || typeof window === 'undefined') return;

    const scrollToHashSection = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (hash === BLOCK_SECTION_ID) {
        setBlockExpandedPersist(true);
        if (showPortalHub) {
          markBlockSeen();
          setBlockLastSeen(new Date().toISOString());
          clearScenePortalSlide();
          setImmersiveInitialKey(undefined);
          if (portalFeed !== 'block') router.push(scenePortalHref('block'));
        }
      } else if (hash === DISCOVER_SECTION_ID) {
        setDiscoverExpandedPersist(true);
        if (showPortalHub) {
          markDiscoverSeen();
          setDiscoverLastSeen(new Date().toISOString());
          clearScenePortalSlide();
          setImmersiveInitialKey(undefined);
          if (portalFeed !== 'discover') router.push(scenePortalHref('discover'));
        }
      } else {
        return;
      }
      const el = document.getElementById(hash);
      if (!el) return;
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    };

    scrollToHashSection();
    const retry = window.setTimeout(scrollToHashSection, 150);
    window.addEventListener('hashchange', scrollToHashSection);
    return () => {
      window.clearTimeout(retry);
      window.removeEventListener('hashchange', scrollToHashSection);
    };
  }, [loaded, showPortalHub, portalFeed, router, setBlockExpandedPersist, setDiscoverExpandedPersist]);

  const handleTourBeforeStep = useCallback(
    (step: { id: string }) => {
      if (step.id === 'scene-feed') {
        setBlockExpandedPersist(true);
        setDiscoverExpandedPersist(true);
        return;
      }
      if (step.id !== 'scene-progress' && step.id !== 'scene-nav') return;
      // Feed steps scroll deep; rails live above. Nudge toward top before measure.
      if (typeof window === 'undefined') return;
      if (window.innerWidth >= 1280) return;
      const y = window.scrollY || document.documentElement.scrollTop || 0;
      if (y > 120) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    },
    [setBlockExpandedPersist, setDiscoverExpandedPersist]
  );

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
      // Queue push opt-in for after privacy (or right away if privacy already done).
      if (user) {
        queueActivityPushIntro();
      }
      // Visibility choice lives on the Scene now — offer it right after the tour.
      if (user && !user.studioPrivacyIntroCompletedAt) {
        queueStudioPrivacyIntro();
        window.setTimeout(() => dispatchStudioPrivacyIntroEligible(), 400);
      } else if (user) {
        window.setTimeout(() => dispatchActivityPushIntroEligible(), 500);
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
    () =>
      user?.id
        ? friendProfilesOf(friendships, user.id, {
            email: user.email,
            displayName: user.displayName,
          }).length
        : 0,
    [friendships, user?.id, user?.email, user?.displayName]
  );

  const discoverCards: DiscoverCard[] = useMemo(() => {
    if (!discover) return [];
    return buildDiscoverCards(discover, {
      excludePostIds: new Set(posts.map((p) => p.id)),
      excludeUserIds: blockedIds,
      maxCards: DISCOVER_HOME_MAX_CARDS,
    });
  }, [discover, posts, blockedIds]);

  const blockPosts = useMemo(() => {
    if (showMine || !user?.id) return posts;
    return posts.filter((p) => p.ownerId !== user.id);
  }, [posts, showMine, user?.id]);

  const visibleBlockPosts = blockPosts.slice(0, blockVisible);
  const visibleDiscoverCards = discoverCards.slice(0, discoverVisible);

  const rememberPortalFeed = useCallback(() => {
    rememberScenePortalFeedCache(posts, discover);
  }, [discover, posts]);

  useEffect(() => {
    if (!showPortalHub || !portalFeed) return;
    if (!blockReady && !discoverReady) return;
    rememberScenePortalFeedCache(posts, discover);
  }, [blockReady, discover, discoverReady, portalFeed, posts, showPortalHub]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = parseActivityPostHash(window.location.hash);
    if (!target) return;
    setShowMinePersist(true);
    setBlockExpandedPersist(true);
    if (showPortalHub) {
      markBlockSeen();
      setBlockLastSeen(new Date().toISOString());
      rememberScenePortalSlide('block', `post-${target.postId}`);
      setImmersiveInitialKey(`post-${target.postId}`);
      if (portalFeed !== 'block') router.push(scenePortalHref('block'));
    }
  }, [showPortalHub, portalFeed, router, setShowMinePersist, setBlockExpandedPersist]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const target = parseActivityPostHash(window.location.hash);
    if (!target) return;
    const postId = target.postId;
    if (!postId || posts.some((p) => p.id === postId)) return;
    let cancelled = false;
    void fetchPostById(postId).then((one) => {
      if (cancelled || !one) return;
      setPosts((prev) => (prev.some((p) => p.id === postId) ? prev : [one, ...prev]));
    });
    return () => {
      cancelled = true;
    };
  }, [posts]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const run = () => {
      const target = parseActivityPostHash(window.location.hash);
      if (!target) return;
      const idx = blockPosts.findIndex((p) => p.id === target.postId);
      if (idx >= 0) {
        setBlockVisible((n) => Math.max(n, idx + 1));
      }
      if (showPortalHub) {
        markBlockSeen();
        setBlockLastSeen(new Date().toISOString());
        rememberScenePortalSlide('block', `post-${target.postId}`);
        setImmersiveInitialKey(`post-${target.postId}`);
        if (portalFeed !== 'block') router.push(scenePortalHref('block'));
        return;
      }
      const tryScroll = () => scrollActivityPostTarget(target);
      window.setTimeout(tryScroll, 80);
      window.setTimeout(tryScroll, 500);
    };
    run();
    window.addEventListener('hashchange', run);
    return () => window.removeEventListener('hashchange', run);
  }, [blockPosts, showPortalHub, portalFeed, router]);

  useEffect(() => {
    setBlockVisible((n) => Math.min(Math.max(BLOCK_PAGE_SIZE, n), Math.max(BLOCK_PAGE_SIZE, blockPosts.length)));
  }, [blockPosts.length]);

  useEffect(() => {
    setDiscoverVisible((n) =>
      Math.min(Math.max(DISCOVER_PAGE_SIZE, n), Math.max(DISCOVER_PAGE_SIZE, discoverCards.length))
    );
  }, [discoverCards.length]);

  const newBlockCount = useMemo(() => {
    if ((!showPortalHub && blockExpanded) || !user?.id || !blockLastSeen) return 0;
    return posts.filter((p) => p.ownerId !== user.id && p.createdAt > blockLastSeen).length;
  }, [blockExpanded, blockLastSeen, showPortalHub, posts, user?.id]);

  const newDiscoverCount = useMemo(() => {
    if ((!showPortalHub && discoverExpanded) || !discoverLastSeen) return 0;
    return discoverCards.filter((c) => {
      const ts = discoverCardTimestamp(c);
      return Boolean(ts) && ts > discoverLastSeen;
    }).length;
  }, [discoverCards, discoverExpanded, discoverLastSeen, showPortalHub]);

  // Drives the Scene Block atmosphere — the skyline gets busier as your
  // circle does, not on a canned timer.
  const sceneEnergy =
    friendCount + posts.length + discoverCards.length + incomingRequests.length * 2;

  const onPosted = useCallback((post: ProfilePost) => {
    setPosts((prev) => mergeWallPostFeed(prev, post));
  }, []);

  const onPostDeleted = useCallback((postId: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  }, []);

  useEffect(() => {
    const onFeedChange = (ev: Event) => {
      const detail = (ev as CustomEvent<WallPostFeedDetail>).detail;
      if (!detail) return;
      if (detail.kind === 'deleted') {
        setPosts((prev) => prev.filter((p) => p.id !== detail.postId));
        return;
      }
      if (detail.kind === 'upsert') {
        setPosts((prev) => mergeWallPostFeed(prev, detail.post));
      }
    };
    window.addEventListener(WALL_POST_FEED_EVENT, onFeedChange);
    return () => window.removeEventListener(WALL_POST_FEED_EVENT, onFeedChange);
  }, []);

  const openBlockPortal = useCallback(() => {
    setBlockExpandedPersist(true);
    markBlockSeen();
    setBlockLastSeen(new Date().toISOString());
    clearScenePortalSlide();
    setImmersiveInitialKey(undefined);
    router.push(scenePortalHref('block'));
  }, [router, setBlockExpandedPersist]);

  const openDiscoverPortal = useCallback(() => {
    setDiscoverExpandedPersist(true);
    markDiscoverSeen();
    setDiscoverLastSeen(new Date().toISOString());
    clearScenePortalSlide();
    setImmersiveInitialKey(undefined);
    router.push(scenePortalHref('discover'));
    if (!user?.id) return;
    void fetchDiscover(user.id, { view: 'all', enrichSlugs: false }).then((next) => {
      setDiscover(next);
      setDiscoverReady(true);
    });
  }, [router, setDiscoverExpandedPersist, user?.id]);

  const onDiscoverLockRemoved = useCallback((lockId: string) => {
    setDiscover((prev) =>
      prev ? { ...prev, locks: prev.locks.filter((lock) => lock.id !== lockId) } : prev
    );
  }, []);

  const loadMoreBlock = useCallback(() => {
    setBlockVisible((n) => n + BLOCK_PAGE_SIZE);
  }, []);

  const loadMoreDiscover = useCallback(() => {
    setDiscoverVisible((n) => n + DISCOVER_PAGE_SIZE);
  }, []);

  const respond = async (friendship: Friendship, accept: boolean) => {
    if (!user?.id) return;
    try {
      if (accept) {
        await acceptFriendRequest(friendship.id);
        setFriendships((prev) => {
          const next = prev.map((f) =>
            f.id === friendship.id ? { ...f, status: 'accepted' as const } : f
          );
          void reloadBlockFeed(next, user.id);
          return next;
        });
      } else {
        await removeFriendship(friendship.id);
        setFriendships((prev) => {
          const next = prev.filter((f) => f.id !== friendship.id);
          void reloadBlockFeed(next, user.id);
          return next;
        });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Could not update request' });
    }
  };

  if (authLoading && !user) {
    return <StudioLoader size="lg" fullscreen />;
  }

  if (!user) {
    return <div className="min-h-screen bg-background" aria-busy="true" />;
  }

  return (
    <TooltipProvider>
    <div className="flex-grow w-full relative min-h-screen selection:bg-primary/30 font-code">
      <LockClaimBootstrap />
      <GuestPressingClaimBootstrap />
      <SceneBlockAtmosphere energy={sceneEnergy} pulseKey={posts.length} />
      <SceneFeedJumpHints
        blockExpanded={blockExpanded}
        discoverExpanded={discoverExpanded}
        hidden={tourActive || showPortalHub}
        onEnsureBlock={() => setBlockExpandedPersist(true)}
        onEnsureDiscover={() => setDiscoverExpandedPersist(true)}
      />
      <div className="relative z-20 w-full min-w-0 max-w-[100vw] xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,44rem)_minmax(0,1fr)] xl:grid-rows-[auto_auto] xl:items-start">
        {/* Header — middle column */}
        <div className="relative min-w-0 w-full xl:col-start-2 xl:row-start-1 px-4 sm:px-6 pt-6">
          <header
            id={SCENE_TOP_ID}
            className="mb-6 scroll-mt-[5.5rem] border-b border-border pb-5"
            data-tour="scene-header"
          >
            <div className="flex flex-wrap items-end justify-between gap-3 md:max-xl:flex-col md:max-xl:items-start md:max-xl:pr-[19rem]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
                  <Radio className="h-5 w-5 text-primary" />
                </span>
                <div>
                  <h1 className="font-headline text-3xl font-bold uppercase tracking-tight">
                    The Scene
                  </h1>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    Your block · friends, drops, and who&apos;s live right now
                    {friendCount > 0 ? ` · ${friendCount} friends` : ''}
                  </p>
                </div>
              </div>
              <SceneWeatherChip />
            </div>
            <SceneUniversalSearch
              className="mt-4"
              excludedUserIds={blockedIds}
            />
            <SceneChartSpotlight excludedUserIds={blockedIds} />
          </header>

          {/* < xl: progress banner + nav strip stacked above the feed */}
          <div className="xl:hidden mb-4 space-y-3" data-tour="scene-rails-mobile">
            <VaultStudioProgress
              variant="banner"
              tourId="scene-progress-mobile"
              tourForceExpanded={sceneProgressTourPinned}
              defaultExpanded={false}
              phoneStartsMinimized
              persistExpandedKey={SCENE_STUDIO_PROGRESS_MOBILE_EXPANDED_KEY}
            />
            {!showPortalHub ? <SceneNavDock compact /> : null}
          </div>
        </div>

        {/* Left rail — studio progress (xl only). Not sticky — scrolls with the page. */}
        <aside
          className="pointer-events-none relative z-30 hidden self-start justify-end pr-2 xl:col-start-1 xl:row-start-2 xl:flex 2xl:pr-3 [&>*]:pointer-events-auto"
          aria-label="Studio progress"
        >
          <VaultStudioProgress
            variant="sidebar"
            tourId="scene-progress-desktop"
            tourForceExpanded={sceneProgressTourPinned}
            defaultExpanded
            persistExpandedKey={SCENE_STUDIO_PROGRESS_EXPANDED_KEY}
          />
        </aside>

        {/* Right rail — nav dock (xl only) */}
        {!showPortalHub ? (
          <aside
            className="pointer-events-none relative z-30 hidden self-stretch pl-2 xl:col-start-3 xl:row-start-2 xl:block 2xl:pl-3"
            aria-label="Scene shortcuts"
          >
            <div className="pointer-events-auto sticky top-[5.25rem] max-h-[calc(100vh-6rem)] w-fit overflow-y-auto overscroll-contain px-0.5 pb-3 pt-1.5">
              <SceneNavDock />
            </div>
          </aside>
        ) : null}

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
                      <LiveArtistStarAvatar
                        name={requester?.name || 'Artist'}
                        userId={request.requestedBy}
                        slug={requesterSlug}
                        size={32}
                        link={false}
                      />
                      <div className="min-w-0 flex-1">
                        {requesterSlug ? (
                          <Link
                            href={profileHref(requesterSlug) || `/${requesterSlug}`}
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

          {/* Combined Your Booth + wall composer. Revert this commit to split them. */}
          <SceneBoothCard>
            <SceneComposer profileSlug={summary.profileSlug} onPosted={onPosted} />
          </SceneBoothCard>

          <SceneBoothMemoryCard />

          <SceneLivePrompts />

          <SceneLiveDropsStrip />

          {showPortalHub ? (
            <>
              <div id={BLOCK_SECTION_ID} className="scroll-mt-[5.5rem]">
                <span id={DISCOVER_SECTION_ID} className="sr-only" aria-hidden />
                <ScenePortalHub
                  viewer={{
                    userId: user.id,
                    displayName: user.displayName || 'Music Fan',
                    ...(viewerSlug ? { slug: viewerSlug } : {}),
                  }}
                  artistHomeHref={viewerSlug ? profileHref(viewerSlug) || '/profile/customize' : '/profile/customize'}
                  friendCount={friendCount}
                  blockPreviews={posts.slice(0, 3)}
                  discoverPreviews={discoverCards.slice(0, 3)}
                  newBlockCount={newBlockCount}
                  newDiscoverCount={newDiscoverCount}
                  onOpenBlock={openBlockPortal}
                  onOpenDiscover={openDiscoverPortal}
                />
              </div>
              <SceneImmersiveFeedDialog
                mode={immersiveFeed}
                initialItemKey={immersiveInitialKey}
                onOpenChange={(open) => {
                  if (!open) closeScenePortalFeed(router);
                }}
                posts={posts}
                discoverCards={discoverCards}
                viewerSlug={viewerSlug}
                onPostDeleted={onPostDeleted}
                onPostUpserted={onPosted}
                onLockRemoved={onDiscoverLockRemoved}
                blockLoading={!blockReady}
                discoverLoading={!discoverReady}
                onRememberFeed={rememberPortalFeed}
              />
            </>
          ) : (
          <>
            <div
              id={BLOCK_SECTION_ID}
              className="scroll-mt-[5.5rem] space-y-4"
              data-tour="scene-feed"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
                <span className="h-px min-w-[2rem] flex-1 bg-border/60" />
                <button
                  type="button"
                  onClick={() => setBlockExpandedPersist(!blockExpanded)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 transition-colors hover:border-primary/40 hover:bg-black/40"
                  aria-expanded={blockExpanded}
                  aria-controls="scene-block-body"
                >
                  <SoftNewBubble count={newBlockCount} label="Your Block" />
                  <span className="font-code text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/90">
                    Your Block
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-muted-foreground transition-transform',
                      blockExpanded && 'rotate-180'
                    )}
                  />
                </button>
                {blockExpanded ? (
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2 py-1">
                    <Checkbox
                      id="scene-block-show-mine"
                      checked={showMine}
                      onCheckedChange={(v) => setShowMinePersist(v === true)}
                      className="h-3.5 w-3.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <Label
                      htmlFor="scene-block-show-mine"
                      className="cursor-pointer font-code text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground/80"
                    >
                      Incl. mine
                    </Label>
                  </div>
                ) : null}
                <span className="h-px min-w-[2rem] flex-1 bg-border/60" />
              </div>

              {blockExpanded ? (
                <div id="scene-block-body" className="space-y-4">
                  {!blockReady && visibleBlockPosts.length === 0 ? (
                    <>
                      <FeedCardSkeleton />
                      <FeedCardSkeleton />
                    </>
                  ) : visibleBlockPosts.length > 0 ? (
                    visibleBlockPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        showAuthor
                        viewerSlug={viewerSlug}
                        onDeleted={onPostDeleted}
                        onReverbed={onPosted}
                      />
                    ))
                  ) : circleLoading ? (
                    <>
                      <FeedCardSkeleton />
                      <FeedCardSkeleton />
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        {posts.length > 0 && !showMine
                          ? 'Your own posts are off — turn on Incl. mine to see them here.'
                          : friendCount === 0
                            ? 'Your circle is quiet so far — the scene below is live right now. Visit a page, add a friend, drop a bar.'
                            : 'Quiet block. Post something above to get it moving.'}
                      </p>
                    </div>
                  )}
                  {circleLoading && visibleBlockPosts.length > 0 ? (
                    <p className="font-code text-[9px] uppercase tracking-[0.22em] text-muted-foreground/70">
                      Catching up your circle…
                    </p>
                  ) : null}
                  <InfiniteFeedSentinel
                    key={`block-${blockVisible}`}
                    disabled={visibleBlockPosts.length >= blockPosts.length}
                    onVisible={loadMoreBlock}
                  />
                </div>
              ) : null}
            </div>

            {blockExpanded ? <SceneOnSaleRail drops={discover?.drops || []} /> : null}

            <div
              id={DISCOVER_SECTION_ID}
              className="scroll-mt-[5.5rem] space-y-4"
              data-tour="scene-discover"
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-2">
                <span className="h-px min-w-[2rem] flex-1 bg-border/60" />
                <button
                  type="button"
                  onClick={() => setDiscoverExpandedPersist(!discoverExpanded)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 transition-colors hover:border-primary/40 hover:bg-black/40"
                  aria-expanded={discoverExpanded}
                  aria-controls="scene-discover-body"
                >
                  <SoftNewBubble count={newDiscoverCount} label="Discover the scene" />
                  <span className="font-code text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground/90">
                    Discover the scene
                  </span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-muted-foreground transition-transform',
                      discoverExpanded && 'rotate-180'
                    )}
                  />
                </button>
                {discoverExpanded ? (
                  <Link
                    href="/discover"
                    className="font-code text-[9px] font-bold uppercase tracking-[0.22em] text-primary/80 hover:text-primary"
                  >
                    View all →
                  </Link>
                ) : null}
                <span className="h-px min-w-[2rem] flex-1 bg-border/60" />
              </div>

              {discoverExpanded ? (
                <div id="scene-discover-body" className="space-y-4">
                  <SceneHouseBarPin variant="dock" />
                  {!discoverReady && visibleDiscoverCards.length === 0 ? (
                    <>
                      <FeedCardSkeleton />
                      <FeedCardSkeleton />
                    </>
                  ) : visibleDiscoverCards.length > 0 ? (
                    visibleDiscoverCards.map((card) => (
                      <SceneDiscoverCard
                        key={card.key}
                        card={card}
                        viewerSlug={viewerSlug}
                        onLockRemoved={(lockId) => {
                          setDiscover((prev) =>
                            prev
                              ? { ...prev, locks: prev.locks.filter((l) => l.id !== lockId) }
                              : prev
                          );
                        }}
                      />
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Nothing live in Discover yet — check back as the scene wakes up.
                      </p>
                    </div>
                  )}
                  <InfiniteFeedSentinel
                    key={`discover-${discoverVisible}`}
                    disabled={visibleDiscoverCards.length >= discoverCards.length}
                    onVisible={loadMoreDiscover}
                  />
                </div>
              ) : null}
            </div>
          </>
          )}

          <div id={FIND_ARTISTS_SECTION_ID} className="scroll-mt-[5.5rem]" data-tour="scene-find-artists">
            <ReferAFriendSection />
          </div>
        </div>
      </div>

      <StudioGuidedTour
        active={tourActive}
        stepIndex={tourStep}
        onStepChange={setTourStep}
        onComplete={handleTourComplete}
        onBeforeStep={handleTourBeforeStep}
        steps={SCENE_HOME_TOUR_STEPS}
      />
    </div>
    </TooltipProvider>
  );
}
