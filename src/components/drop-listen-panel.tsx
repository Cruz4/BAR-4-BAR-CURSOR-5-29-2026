'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client/firebase';
import {
  DROP_PAID_MIN_CENTS,
  centsToUsdLabel,
  dropPriceSummary,
  isCommerceLive,
  isDropFree,
  normalizeDropPrice,
  parseUsdToCents,
  resolveCheckoutCents,
  type DropPrice,
} from '@/lib/drop-commerce';
import { buildDropBuyLoginPath, getDropBuyIntentFromPath } from '@/lib/checkout-intent';
import { Check, Pause, Play, Loader, ShoppingCart, Sparkles, Trophy } from 'lucide-react';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { useAudioVolume } from '@/hooks/use-audio-volume';
import { AudioVolumeControl } from '@/components/audio-volume-control';
import { recordDropListenProgressClient, recordDropSpinClient } from '@/lib/drop-pulse-client';
import { autoDownloadLibraryItem } from '@/lib/offline/library-offline';
import {
  DROP_LISTEN_MILESTONES,
  type DropListenMilestone,
  type DropListenSource,
} from '@/lib/drop-listen-analytics';
import { pressedSongHref } from '@/lib/pressed-song';
import { cn } from '@/lib/utils';
import { useDropCart } from '@/context/drop-cart-context';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { studioNameClass, type StudioNameChrome } from '@/lib/studio-tier-chrome';
import type { PublicMusicMetadata } from '@/lib/music-discovery-metadata';

type DropPlayerArtistAttribution = {
  href?: string;
  avatarUrl?: string;
  useStarMark?: boolean;
  starMarkSeed?: number;
  studioChrome?: StudioNameChrome | null;
};

function formatPlaybackTime(value: number): string {
  if (!Number.isFinite(value) || value < 0) return '0:00';
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (!user) return headers;
  const token = await user.getIdToken();
  return { ...headers, Authorization: `Bearer ${token}` };
}

export function DropListenPanel({
  shareId,
  title,
  artistName,
  ownerId,
  price,
  hasAudio,
  trackId,
  source = 'direct',
  featuredByUserId,
  excerptStartSec = 0,
  presentation = 'default',
  playbackGroup,
  onPlaybackStateChange,
  referralPostId,
  detailsHref,
  checkoutDestination = 'song',
  showPurchase = true,
  firstPressRank,
  artistAttribution,
  houseRelease = false,
  songMetadata,
  purchaseOnly = false,
}: {
  shareId: string;
  title: string;
  artistName?: string;
  ownerId: string;
  price?: DropPrice | null;
  hasAudio: boolean;
  trackId?: string;
  source?: DropListenSource;
  /** Profile owner whose saved featured selection this player must match. */
  featuredByUserId?: string;
  excerptStartSec?: number;
  presentation?: 'default' | 'song' | 'playlist' | 'compact';
  /** When set, starting this player pauses another Drop player in the same queue. */
  playbackGroup?: string;
  onPlaybackStateChange?: (state: { playing: boolean; currentTime: number; duration: number }) => void;
  referralPostId?: string;
  /** Override the title link for album bundles and other non-song pages. */
  detailsHref?: string;
  /** Album bundles return to their public album page after authentication. */
  checkoutDestination?: 'song' | 'share';
  /** Track previews inside an album use the album-level purchase control instead. */
  showPurchase?: boolean;
  /** Verified founding-supporter edition. Changes the complete player treatment. */
  firstPressRank?: number;
  /** Optional linked artist identity rendered inside feed/shared players. */
  artistAttribution?: DropPlayerArtistAttribution;
  /** Admin-selected release that streams free for every signed-in member. */
  houseRelease?: boolean;
  /** Compact public facts used by the dedicated song-page presentation. */
  songMetadata?: PublicMusicMetadata;
  /** Render entitlement and album checkout controls without a second inline audio player. */
  purchaseOnly?: boolean;
}) {
  const { user, authReady } = useAuth();
  const { toast } = useToast();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const cart = useDropCart();
  const { volume, setVolume, toggleMute } = useAudioVolume();
  const router = useRouter();
  const searchParams = useSearchParams();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerId = React.useId();
  const reportedMilestonesRef = useRef<Set<DropListenMilestone>>(new Set());
  const [src, setSrc] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [listenProof, setListenProof] = useState('');
  const [eligibleDurationSec, setEligibleDurationSec] = useState(30);
  const [playbackStartSec, setPlaybackStartSec] = useState(0);
  const [loading, setLoading] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [mediaDurationSec, setMediaDurationSec] = useState(30);
  const [busy, setBusy] = useState(false);
  const [pwyw, setPwyw] = useState('');
  const [isHouseRelease, setIsHouseRelease] = useState(houseRelease);
  const normalized = normalizeDropPrice(price);
  const artistFreeRelease = isDropFree(normalized) && !houseRelease;
  const isOwner = Boolean(user && user.id === ownerId);
  const enteredPwywCents = parseUsdToCents(pwyw);
  const pwywCheckoutCents = normalized.mode === 'pwyw'
    ? resolveCheckoutCents(normalized, enteredPwywCents ?? undefined)
    : 0;
  const pendingBuyIntent = showPurchase
    ? getDropBuyIntentFromPath(
        `/${checkoutDestination}/${encodeURIComponent(shareId)}?${searchParams.toString()}`
      )
    : null;
  const queryReferralPostId = searchParams.get('refPost')?.trim() || undefined;
  const effectiveReferralPostId = referralPostId || queryReferralPostId;
  const effectiveTrackId = trackId || pendingBuyIntent?.trackId;
  const pendingCheckoutHandledRef = useRef<string | null>(null);
  const compactPresentation = presentation === 'compact';
  const firstPressEdition =
    typeof firstPressRank === 'number' && firstPressRank >= 1 && firstPressRank <= 10;
  const trackDetailsHref =
    detailsHref || pressedSongHref(shareId, { referralPostId: effectiveReferralPostId });
  const houseJoinHref = `/login?mode=signup&next=${encodeURIComponent(trackDetailsHref)}`;

  useEffect(() => {
    setIsHouseRelease(houseRelease);
  }, [houseRelease, shareId]);

  const loadStream = useCallback(async () => {
    if (!firstDropsOn || !hasAudio) {
      setStreamReady(true);
      return;
    }
    setStreamReady(false);
    setLoading(true);
    try {
      const headers = await authHeaders();
      const qs = new URLSearchParams({ shareId });
      if (effectiveTrackId) qs.set('trackId', effectiveTrackId);
      if (effectiveReferralPostId) qs.set('referralPostId', effectiveReferralPostId);
      if (featuredByUserId) qs.set('profileUserId', featuredByUserId);
      const endpoint = featuredByUserId
        ? '/api/profile/featured-track/audio'
        : '/api/drops/audio';
      const res = await fetch(`${endpoint}?${qs.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load audio.');
      setSrc(data.url);
      setFull(Boolean(data.full));
      setIsHouseRelease(Boolean(data.houseRelease || houseRelease));
      setListenProof(typeof data.listenProof === 'string' ? data.listenProof : '');
      const nextEligibleDurationSec = Math.max(1, Number(data.eligibleDurationSec) || 30);
      const nextPlaybackStartSec = Math.max(0, Number(data.playbackStartSec) || 0);
      setEligibleDurationSec(nextEligibleDurationSec);
      setPlaybackStartSec(nextPlaybackStartSec);
      setPositionSec(nextPlaybackStartSec);
      setMediaDurationSec(nextPlaybackStartSec + nextEligibleDurationSec);
      reportedMilestonesRef.current = new Set();
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : undefined;
      setSrc(null);
      const staleFeaturedSelection = Boolean(
        featuredByUserId && raw && /no longer featured|no longer public|not public|offline/i.test(raw)
      );
      if (!staleFeaturedSelection) {
        toast({
          variant: 'destructive',
          title: 'Audio unavailable',
          description:
            raw && /iam\.|signBlob|Permission/i.test(raw)
              ? 'Could not open this stream. Refresh and try again.'
              : raw,
        });
      }
    } finally {
      setLoading(false);
      setStreamReady(true);
    }
  }, [effectiveReferralPostId, effectiveTrackId, featuredByUserId, firstDropsOn, hasAudio, houseRelease, shareId, toast]);

  useEffect(() => {
    void loadStream();
  }, [loadStream, user?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [src, volume]);

  useEffect(() => {
    if (!playbackGroup) return;
    const pauseOtherQueuePlayers = (event: Event) => {
      const detail = (event as CustomEvent<{ group?: string; playerId?: string }>).detail;
      if (detail?.group !== playbackGroup || detail.playerId === playerId) return;
      const audio = audioRef.current;
      if (audio && !audio.paused) audio.pause();
    };
    window.addEventListener('bar4bar:drop-player-play', pauseOtherQueuePlayers);
    return () => window.removeEventListener('bar4bar:drop-player-play', pauseOtherQueuePlayers);
  }, [playbackGroup, playerId]);

  useEffect(() => {
    if (!showPurchase) return;
    const sessionId = searchParams.get('session_id');
    if (!sessionId || !user?.id) return;
    void (async () => {
      try {
        const headers = await authHeaders();
        await fetch('/api/stripe/fulfill-session', {
          method: 'POST',
          headers,
          body: JSON.stringify({ sessionId, userId: user.id }),
        });
        await loadStream();
        if (user?.id) {
          void autoDownloadLibraryItem(
            user.id,
            {
              key: effectiveTrackId ? `${shareId}:${effectiveTrackId}` : shareId,
              shareId,
              trackId: effectiveTrackId,
              title,
              artistName: artistName || 'Artist',
              scope: effectiveTrackId ? 'track' : 'album',
              detailsHref: detailsHref ?? pressedSongHref(shareId, { trackId: effectiveTrackId }),
              purchasedAt: new Date().toISOString(),
              amountCents: 0,
              ownerId,
            },
            { silent: true }
          ).catch(() => undefined);
        }
        toast({
          title: 'Added to Library',
          description: 'Full stream is ready—and saving to this device for offline play.',
        });
      } catch {
        /* webhook may already have fulfilled */
      }
    })();
  }, [searchParams, user?.id, loadStream, showPurchase, toast, shareId, effectiveTrackId, title, artistName, detailsHref, ownerId]);

  const startCheckout = useCallback(async (amountCents?: number) => {
    if (!user) {
      router.push(
        buildDropBuyLoginPath(
          shareId,
          {
            amountCents,
            trackId: effectiveTrackId,
            referralPostId: effectiveReferralPostId,
          },
          checkoutDestination
        )
      );
      return;
    }
    if (!authReady) return;
    setBusy(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/drops/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user.id,
          email: user.email,
          shareId,
          trackId: effectiveTrackId,
          amountCents,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      if (data.url) window.location.href = data.url;
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not start checkout',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }, [authReady, checkoutDestination, effectiveReferralPostId, effectiveTrackId, router, shareId, toast, user]);

  useEffect(() => {
    if (!pendingBuyIntent || !authReady || !user || !streamReady || busy) return;
    const intentKey = [
      shareId,
      pendingBuyIntent.amountCents || 'priced',
      effectiveTrackId || 'single',
      user.id,
    ].join(':');
    if (pendingCheckoutHandledRef.current === intentKey) return;
    pendingCheckoutHandledRef.current = intentKey;

    const url = new URL(window.location.href);
    url.searchParams.delete('checkout');
    url.searchParams.delete('amountCents');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);

    if (full || isOwner) {
      toast({
        title: isOwner ? 'This is your song' : 'Already in your Library',
        description: 'The full stream is ready—no additional purchase needed.',
      });
      return;
    }
    void startCheckout(pendingBuyIntent.amountCents);
  }, [
    authReady,
    busy,
    effectiveTrackId,
    full,
    isOwner,
    pendingBuyIntent,
    shareId,
    startCheckout,
    streamReady,
    toast,
    user,
  ]);

  const claimFree = useCallback(async () => {
    if (!user) {
      router.push(
        buildDropBuyLoginPath(
          shareId,
          { trackId: effectiveTrackId, referralPostId: effectiveReferralPostId },
          checkoutDestination
        )
      );
      return;
    }
    if (!authReady) return;
    setBusy(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/drops/claim', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId: user.id,
          shareId,
          trackId: effectiveTrackId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not add to Library');
      await loadStream();
      toast({
        title: 'Added to Library',
        description: 'Full stream is ready.',
      });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Could not add to Library',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }, [
    authReady,
    checkoutDestination,
    effectiveReferralPostId,
    effectiveTrackId,
    loadStream,
    router,
    shareId,
    toast,
    user,
  ]);

  const buy = () => {
    if (artistFreeRelease) {
      void claimFree();
      return;
    }
    if (normalized.mode === 'pwyw') {
      const entered = parseUsdToCents(pwyw);
      const cents = resolveCheckoutCents(normalized, entered ?? undefined);
      void startCheckout(cents);
      return;
    }
    void startCheckout(resolveCheckoutCents(normalized));
  };

  const addToCart = () => {
    if (cart.hasItem(shareId, effectiveTrackId)) {
      cart.setOpen(true);
      return;
    }
    const amountCents = normalized.mode === 'pwyw'
      ? pwywCheckoutCents
      : resolveCheckoutCents(normalized);
    cart.addItem({
      shareId,
      trackId: effectiveTrackId,
      title,
      artistName,
      ownerId,
      scope: checkoutDestination === 'share' && !effectiveTrackId ? 'album' : 'track',
      price: normalized,
      amountCents,
      detailsHref: detailsHref || pressedSongHref(shareId),
    });
  };

  if (!firstDropsOn) return null;
  if (!hasAudio && !isCommerceLive(normalized)) return null;
  if (purchaseOnly && (!streamReady || full || isOwner)) return null;

  const previewCapped = !full && !isOwner;
  const timelineStartSec = previewCapped ? playbackStartSec : 0;
  const previewEndSec = playbackStartSec + Math.min(30, eligibleDurationSec);
  const timelineEndSec = Math.max(
    timelineStartSec + 0.1,
    previewCapped
      ? Math.min(Math.max(mediaDurationSec, timelineStartSec + 0.1), previewEndSec)
      : Math.max(mediaDurationSec, eligibleDurationSec),
  );
  const timelinePositionSec = Math.min(timelineEndSec, Math.max(timelineStartSec, positionSec));
  const displayedPositionSec = previewCapped
    ? timelinePositionSec - timelineStartSec
    : timelinePositionSec;
  const displayedDurationSec = previewCapped
    ? timelineEndSec - timelineStartSec
    : timelineEndSec;

  const presentationClass = presentation === 'song'
      ? 'space-y-3 rounded-2xl border border-fuchsia-300/45 bg-black/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_18px_55px_rgba(0,0,0,.35)] sm:p-5'
      : presentation === 'playlist'
        ? 'space-y-3 rounded-2xl border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/15 via-black/65 to-blue-500/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_14px_38px_rgba(0,0,0,.28)] transition-colors hover:border-fuchsia-300/60 sm:p-5'
      : compactPresentation
        ? 'min-w-0 space-y-2 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 p-2.5'
        : 'min-w-0 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 p-3 space-y-3 sm:p-4';

  return (
    <div className={cn(
      presentationClass,
      firstPressEdition &&
        'relative overflow-hidden border-amber-300/70 bg-[linear-gradient(128deg,rgba(40,25,3,.96),rgba(8,11,18,.97)_48%,rgba(73,46,4,.86))] shadow-[inset_0_1px_0_rgba(255,244,185,.35),0_0_0_1px_rgba(251,191,36,.16),0_18px_60px_rgba(245,158,11,.24)]'
    )}>
      {firstPressEdition ? (
        <div className="relative mb-1 flex items-center justify-between gap-3 rounded-xl border border-amber-200/25 bg-gradient-to-r from-amber-400/20 via-yellow-100/10 to-amber-500/15 px-3 py-2 text-amber-100">
          <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.18em]">
            <Trophy className="h-4 w-4 text-amber-300" /> First Press #{firstPressRank}
          </span>
          <span className="hidden items-center gap-1 text-[8px] font-bold uppercase tracking-[.16em] text-amber-200/80 sm:flex">
            <Sparkles className="h-3 w-3" /> Founding supporter edition
          </span>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <p className={cn('text-[10px] font-bold uppercase tracking-widest', firstPressEdition ? 'text-amber-200' : 'text-fuchsia-200')}>
          {purchaseOnly
            ? 'Album access'
            : isHouseRelease
            ? full || isOwner
              ? 'House release · full stream'
              : 'House release · free for members'
            : full || isOwner
              ? 'Full stream'
              : hasAudio
                ? 'Play preview · 30 seconds'
                : 'On sale'}
        </p>
        {showPurchase && !isHouseRelease && dropPriceSummary(normalized) ? (
          <span className="max-w-full break-words text-right font-code text-[10px] leading-relaxed text-muted-foreground">{dropPriceSummary(normalized)}</span>
        ) : null}
      </div>

      {hasAudio && !purchaseOnly && (
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            size="icon"
            className={cn(
              compactPresentation ? 'h-9 w-9 rounded-full' : 'h-11 w-11 rounded-full',
              firstPressEdition && 'bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 text-black shadow-[0_0_24px_rgba(251,191,36,.38)] hover:from-yellow-100 hover:to-amber-500'
            )}
            disabled={loading || !src}
            onClick={() => {
              const el = audioRef.current;
              if (!el) return;
              if (el.paused) {
                void el.play();
                setPlaying(true);
              } else {
                el.pause();
                setPlaying(false);
              }
            }}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>
          {artistAttribution ? (
            <ArtistStarAvatar
              name={artistName || 'Artist'}
              avatarUrl={artistAttribution.avatarUrl}
              useStarMark={artistAttribution.useStarMark}
              starMarkSeed={artistAttribution.starMarkSeed}
              href={artistAttribution.href}
              size={compactPresentation ? 30 : 36}
              studioChrome={artistAttribution.studioChrome}
              toneClass="bg-fuchsia-500/20 text-fuchsia-200"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <Link
              href={trackDetailsHref}
              className={cn(
                'block truncate text-sm font-headline font-bold uppercase transition-colors hover:underline',
                firstPressEdition ? 'text-amber-50 hover:text-amber-200' : 'hover:text-fuchsia-300'
              )}
            >
              {title}
            </Link>
            {artistAttribution ? (
              <p className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                <span>Original artist</span>
                <span aria-hidden>·</span>
                {artistAttribution.href ? (
                  <Link
                    href={artistAttribution.href}
                    className={cn(
                      'min-w-0 truncate transition-colors hover:text-fuchsia-300 hover:underline',
                      studioNameClass(artistAttribution.studioChrome)
                    )}
                  >
                    {artistName || 'Artist'}
                  </Link>
                ) : (
                  <span className={studioNameClass(artistAttribution.studioChrome)}>
                    {artistName || 'Artist'}
                  </span>
                )}
              </p>
            ) : null}
            <p className={compactPresentation ? 'truncate text-[9px] text-muted-foreground' : 'text-[10px] text-muted-foreground'}>
              {previewCapped
                ? isHouseRelease
                  ? '30-second preview. Create a free account to unlock the full House release in Library.'
                  : showPurchase
                  ? `Featured 30-second excerpt${excerptStartSec > 0 ? ` from ${Math.floor(excerptStartSec / 60)}:${Math.floor(excerptStartSec % 60).toString().padStart(2, '0')}` : ''}. Buy once to unlock.`
                  : '30-second album preview. Use the album button above to unlock every included track.'
                : featuredByUserId && excerptStartSec > 0
                  ? 'Full track unlocked · starts at the featured moment.'
                  : 'Streams in Library.'}
            </p>
          </div>
          {src ? (
            <audio
              ref={audioRef}
              src={src}
              preload="none"
              playsInline
              onLoadedMetadata={(event) => {
                const duration = Number.isFinite(event.currentTarget.duration) && event.currentTarget.duration > 0
                  ? event.currentTarget.duration
                  : playbackStartSec + eligibleDurationSec;
                setMediaDurationSec(duration);
                if (playbackStartSec > 0 && event.currentTarget.currentTime < playbackStartSec) {
                  event.currentTarget.currentTime = playbackStartSec;
                }
                setPositionSec(event.currentTarget.currentTime);
              }}
              onEnded={(event) => {
                setPlaying(false);
                setPositionSec(event.currentTarget.currentTime);
                onPlaybackStateChange?.({ playing: false, currentTime: event.currentTarget.currentTime, duration: event.currentTarget.duration || eligibleDurationSec });
              }}
              onPause={(event) => {
                setPlaying(false);
                setPositionSec(event.currentTarget.currentTime);
                onPlaybackStateChange?.({ playing: false, currentTime: event.currentTarget.currentTime, duration: event.currentTarget.duration || eligibleDurationSec });
              }}
              onPlay={() => {
                setPlaying(true);
                if (playbackGroup) {
                  window.dispatchEvent(new CustomEvent('bar4bar:drop-player-play', {
                    detail: { group: playbackGroup, playerId },
                  }));
                }
                recordDropSpinClient(shareId, previewCapped ? 'preview' : 'play');
                const audio = audioRef.current;
                onPlaybackStateChange?.({ playing: true, currentTime: audio?.currentTime || 0, duration: audio?.duration || eligibleDurationSec });
              }}
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                setPositionSec(el.currentTime);
                if (Number.isFinite(el.duration) && el.duration > 0) setMediaDurationSec(el.duration);
                onPlaybackStateChange?.({ playing: !el.paused, currentTime: el.currentTime, duration: el.duration || eligibleDurationSec });
                const listenedSec = Math.max(0, el.currentTime - playbackStartSec);
                const progressDuration = Math.max(
                  1,
                  Math.min(
                    eligibleDurationSec,
                    Number.isFinite(el.duration) && el.duration > 0 ? el.duration : eligibleDurationSec
                  )
                );
                for (const milestone of DROP_LISTEN_MILESTONES) {
                  if (
                    listenProof &&
                    !reportedMilestonesRef.current.has(milestone) &&
                    listenedSec >= progressDuration * (milestone / 100)
                  ) {
                    reportedMilestonesRef.current.add(milestone);
                    void recordDropListenProgressClient({ shareId, listenProof, milestone, source }).then(
                      (recorded) => {
                        if (!recorded) reportedMilestonesRef.current.delete(milestone);
                      }
                    );
                  }
                }
                if (!previewCapped) return;
                if (listenedSec >= Math.min(30, eligibleDurationSec)) {
                  el.pause();
                  el.currentTime = playbackStartSec + Math.min(30, eligibleDurationSec);
                  setPlaying(false);
                }
              }}
            />
          ) : null}
        </div>
      )}

      {hasAudio && !purchaseOnly ? (
        <>
          {presentation === 'song' ? (
            <dl className="grid grid-cols-2 gap-2 border-y border-white/10 py-3 sm:grid-cols-4">
              <div className="min-w-0 rounded-lg bg-white/[0.025] px-2.5 py-2">
                <dt className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Format</dt>
                <dd className="mt-1 truncate text-[11px] font-bold text-white/85">
                  {songMetadata?.albumTitle ? 'Album track' : 'Single release'}
                </dd>
              </div>
              <div className="min-w-0 rounded-lg bg-white/[0.025] px-2.5 py-2">
                <dt className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Runtime</dt>
                <dd className="mt-1 font-code text-[11px] font-bold tabular-nums text-white/85">
                  {formatPlaybackTime(displayedDurationSec)}
                </dd>
              </div>
              <div className="min-w-0 rounded-lg bg-white/[0.025] px-2.5 py-2">
                <dt className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Access</dt>
                <dd className="mt-1 truncate text-[11px] font-bold text-white/85">
                  {previewCapped ? '30-sec preview' : isOwner ? 'Artist copy' : 'Full stream'}
                </dd>
              </div>
              <div className="min-w-0 rounded-lg bg-white/[0.025] px-2.5 py-2">
                <dt className="font-code text-[8px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Release</dt>
                <dd className="mt-1 truncate text-[11px] font-bold text-white/85">
                  {isHouseRelease
                    ? 'House · free'
                    : artistFreeRelease
                      ? 'Free'
                      : normalized.mode === 'pwyw'
                        ? 'Pay your way'
                        : 'Buy once'}
                </dd>
              </div>
            </dl>
          ) : null}
          <div className={cn('flex min-w-0 items-center gap-2', compactPresentation ? 'pl-[44px]' : 'pl-[52px]')}>
            <span className="w-9 shrink-0 font-code text-[9px] tabular-nums text-muted-foreground">
              {formatPlaybackTime(displayedPositionSec)}
            </span>
            <input
              type="range"
              min={timelineStartSec}
              max={timelineEndSec}
              step={0.1}
              value={timelinePositionSec}
              disabled={!src}
              onChange={(event) => {
                const next = Number(event.target.value);
                const audio = audioRef.current;
                if (audio) audio.currentTime = next;
                setPositionSec(next);
                onPlaybackStateChange?.({
                  playing: Boolean(audio && !audio.paused),
                  currentTime: next,
                  duration: mediaDurationSec,
                });
              }}
              className="h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Song playback position"
              aria-valuetext={`${formatPlaybackTime(displayedPositionSec)} of ${formatPlaybackTime(displayedDurationSec)}`}
            />
            <span className="w-9 shrink-0 text-right font-code text-[9px] tabular-nums text-muted-foreground">
              {formatPlaybackTime(displayedDurationSec)}
            </span>
            <AudioVolumeControl
              volume={volume}
              onVolumeChange={setVolume}
              onToggleMute={toggleMute}
              compact
            />
          </div>
        </>
      ) : null}

      {showPurchase && isHouseRelease && !full && !isOwner && authReady && !user ? (
        <div className={compactPresentation
          ? 'border-t border-white/10 pt-2'
          : '!mt-2 border-t border-white/10 pt-2'}>
          <Button asChild className={compactPresentation ? 'h-8 w-full text-[10px] font-bold uppercase' : 'h-9 w-full text-xs font-bold uppercase'}>
            <Link href={houseJoinHref}>Join free · add to Library</Link>
          </Button>
        </div>
      ) : null}

      {showPurchase && artistFreeRelease && !full && !isOwner && (
        <div
          className={
            compactPresentation
              ? 'border-t border-white/10 pt-2'
              : '!mt-2 border-t border-white/10 pt-2'
          }
        >
          <Button
            className={
              compactPresentation
                ? 'h-8 w-full text-[10px] font-bold uppercase bg-cyan-400 text-black hover:bg-cyan-300'
                : 'h-9 w-full text-xs font-bold uppercase bg-cyan-400 text-black hover:bg-cyan-300'
            }
            disabled={busy || (Boolean(user) && !authReady)}
            onClick={() => void claimFree()}
          >
            {busy ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
            {user ? 'Add to Library · Free' : 'Sign up · add free to Library'}
          </Button>
        </div>
      )}

      {showPurchase && !isHouseRelease && !artistFreeRelease && !full && !isOwner && isCommerceLive(normalized) && (
        <div className={compactPresentation
          ? 'space-y-1.5 border-t border-white/10 pt-2'
          : '!mt-2 space-y-1.5 border-t border-white/10 pt-2'}>
          {normalized.mode === 'pwyw' && (
            <Input
              value={pwyw}
              onChange={(e) => setPwyw(e.target.value)}
              placeholder={`Suggested ${centsToUsdLabel(Math.max(DROP_PAID_MIN_CENTS, normalized.suggestedCents ?? 777))}`}
              className="h-8 font-code text-[11px]"
            />
          )}
          <div className={cn('grid gap-2', compactPresentation ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2')}>
          <Button
            className={compactPresentation ? 'h-8 min-w-0 px-2 text-[10px] font-bold uppercase bg-fuchsia-400 text-black hover:bg-fuchsia-300' : 'h-9 min-w-0 px-3 text-xs font-bold uppercase bg-fuchsia-400 text-black hover:bg-fuchsia-300'}
            disabled={busy || (Boolean(user) && !authReady)}
            onClick={buy}
          >
            {busy ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
            {normalized.mode === 'fixed'
                ? user
                  ? `Buy · ${centsToUsdLabel(Math.max(DROP_PAID_MIN_CENTS, normalized.amountCents ?? DROP_PAID_MIN_CENTS))}`
                  : `Sign up · Buy · ${centsToUsdLabel(Math.max(DROP_PAID_MIN_CENTS, normalized.amountCents ?? DROP_PAID_MIN_CENTS))}`
                : user
                    ? `Pay · ${centsToUsdLabel(pwywCheckoutCents)}`
                    : `Sign up · Pay · ${centsToUsdLabel(pwywCheckoutCents)}`}
          </Button>
          <Button
            type="button"
            variant="outline"
            className={compactPresentation ? 'h-8 min-w-0 px-2 text-[10px] font-bold uppercase' : 'h-9 min-w-0 border-fuchsia-300/40 bg-fuchsia-300/5 px-3 text-xs font-bold uppercase text-fuchsia-100 hover:bg-fuchsia-300/15'}
            onClick={addToCart}
          >
            {cart.hasItem(shareId, effectiveTrackId) ? <Check className="mr-1.5 h-4 w-4" /> : <ShoppingCart className="mr-1.5 h-4 w-4" />}
            {cart.hasItem(shareId, effectiveTrackId) ? 'View cart' : 'Add to cart'}
          </Button>
          </div>
          <p className={compactPresentation ? 'sr-only' : 'text-center text-[8px] leading-none text-muted-foreground'}>
            Buy once. Stream in the app. Not on Spotify unless the artist goes wide later.
          </p>
        </div>
      )}
    </div>
  );
}
