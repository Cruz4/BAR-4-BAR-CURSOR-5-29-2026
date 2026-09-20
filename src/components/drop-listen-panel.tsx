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
import { Check, Loader, ShoppingCart, Sparkles, Trophy } from 'lucide-react';
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
import { albumHubHref, pressedSongHref } from '@/lib/pressed-song';
import { cn } from '@/lib/utils';
import { useDropCart } from '@/context/drop-cart-context';
import { DropInlineSpectrum, DropVisualizer } from '@/components/library/drop-visualizer';
import { DropTransportButton } from '@/components/drop-transport-button';
import { LivingPressField } from '@/components/profile/living-press-field';
import { ArtistStarAvatar } from '@/components/profile/artist-star-avatar';
import { useDropArtistChrome } from '@/hooks/use-drop-artist-chrome';
import { useMediaElementAnalyser } from '@/hooks/use-media-element-analyser';
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
  pressing,
  albumTitle,
  albumHref,
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
  presentation?: 'default' | 'song' | 'playlist' | 'compact' | 'feed';
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
  pressing?: import('@/lib/profile/pressing').PressingConfig;
  albumTitle?: string;
  albumHref?: string;
}) {
  const { user, authReady } = useAuth();
  const { toast } = useToast();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const cart = useDropCart();
  const { volume, setVolume, toggleMute } = useAudioVolume();
  const { chrome, pressingStyle } = useDropArtistChrome(shareId, trackId, pressing ? { pressing } : undefined);
  const resolvedAlbumTitle = albumTitle || chrome?.albumTitle || songMetadata?.albumTitle;
  const resolvedAlbumHref = albumHref || albumHubHref(chrome?.albumShareId || songMetadata?.albumShareId);
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
  const songPresentation = presentation === 'song';
  const firstPressEdition =
    typeof firstPressRank === 'number' && firstPressRank >= 1 && firstPressRank <= 10;
  /** Large lathe + EQ layout — opt-in only (`presentation="feed"`). Inline wall/feed uses compact/default. */
  const pressingFeed = Boolean(
    chrome?.pressing &&
      !firstPressEdition &&
      !purchaseOnly &&
      !compactPresentation &&
      presentation !== 'song' &&
      presentation === 'feed'
  );
  const showPressingBackdrop = Boolean(chrome?.pressing && !firstPressEdition && !pressingFeed);
  const { analyser, prime: primeAnalyser } = useMediaElementAnalyser(audioRef, Boolean(src));
  const trackDetailsHref =
    detailsHref ||
    pressedSongHref(shareId, {
      ...(effectiveTrackId ? { trackId: effectiveTrackId } : {}),
      ...(effectiveReferralPostId ? { referralPostId: effectiveReferralPostId } : {}),
    });
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
      ? 'relative overflow-hidden space-y-3 rounded-2xl border border-[var(--ph-border,rgba(232,121,249,.45))] bg-black/40 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_18px_55px_rgba(0,0,0,.35)] sm:p-5'
      : presentation === 'playlist'
        ? 'relative overflow-hidden space-y-3 rounded-2xl border border-[var(--ph-border,rgba(232,121,249,.4))] bg-black/35 p-4 sm:p-5'
      : pressingFeed || presentation === 'feed'
        ? 'relative overflow-hidden min-w-0 space-y-3 rounded-2xl border border-[var(--ph-border,rgba(232,121,249,.45))] bg-black/20 p-3 shadow-[0_12px_40px_rgba(0,0,0,.35)] sm:min-h-[248px] sm:p-4'
      : compactPresentation
        ? 'relative min-w-0 overflow-hidden rounded-xl border border-[var(--ph-border,rgba(232,121,249,.4))] bg-black/30 p-1.5 sm:p-2.5'
        : 'relative overflow-hidden min-w-0 rounded-xl border border-[var(--ph-border,rgba(232,121,249,.4))] bg-black/30 p-3 space-y-3 sm:p-4';

  return (
    <div
      className={cn(
      presentationClass,
      compactPresentation &&
        playing &&
        'border-fuchsia-400/50 shadow-[0_0_28px_rgba(217,70,239,0.14)]',
      firstPressEdition &&
        'relative overflow-hidden border-amber-300/70 bg-[linear-gradient(128deg,rgba(40,25,3,.96),rgba(8,11,18,.97)_48%,rgba(73,46,4,.86))] shadow-[inset_0_1px_0_rgba(255,244,185,.35),0_0_0_1px_rgba(251,191,36,.16),0_18px_60px_rgba(245,158,11,.24)]'
    )}
      style={pressingStyle as React.CSSProperties | undefined}
    >
      {pressingFeed && chrome?.pressing ? (
        <>
          <LivingPressField config={chrome.pressing} compact className="absolute inset-0 min-h-[220px] [&>p]:hidden" />
          <div
            className={cn(
              'pointer-events-none absolute inset-0 transition-[opacity,background] duration-300',
              playing
                ? 'bg-[linear-gradient(180deg,rgba(0,0,0,0.22),rgba(0,0,0,0.58))]'
                : 'bg-black/50'
            )}
            aria-hidden
          />
          <div
            className={cn(
              'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500',
              playing &&
                'opacity-100 bg-[radial-gradient(ellipse_85%_65%_at_50%_32%,rgba(232,121,249,0.32),transparent_72%)]'
            )}
            aria-hidden
          />
        </>
      ) : showPressingBackdrop && chrome?.pressing ? (
        <>
          <LivingPressField config={chrome.pressing} compact className="[&>p]:hidden" />
          <div className="absolute inset-0 bg-black/45" aria-hidden />
        </>
      ) : null}
      <div
        className={cn(
          'relative z-10',
          compactPresentation
            ? 'grid grid-rows-[auto_1fr_auto] gap-y-1 sm:gap-y-1.5'
            : songPresentation
              ? 'grid min-h-[7.5rem] grid-rows-[auto_1fr_auto] gap-y-2 sm:min-h-[8.5rem]'
              : 'space-y-3'
        )}
      >
      {compactPresentation && playing ? (
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_75%_55%_at_72%_38%,rgba(232,121,249,0.14),transparent_68%)]"
          aria-hidden
        />
      ) : null}
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
        <p className={cn('text-[10px] font-bold uppercase tracking-widest', firstPressEdition ? 'text-amber-200' : 'text-white/80 [text-shadow:0_1px_8px_rgba(0,0,0,.7)]')}>
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
        pressingFeed ? (
          <div className="space-y-3">
            <DropVisualizer analyser={analyser} playing={playing} className="sm:gap-4">
              <DropTransportButton
                playing={playing}
                loading={loading}
                disabled={loading || !src}
                size="md"
                onClick={() => {
                  primeAnalyser();
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
              />
            </DropVisualizer>
            <div className="flex min-w-0 items-start gap-3 px-0.5">
              {artistAttribution ? (
                <ArtistStarAvatar
                  name={artistName || 'Artist'}
                  avatarUrl={artistAttribution.avatarUrl}
                  useStarMark={artistAttribution.useStarMark}
                  starMarkSeed={artistAttribution.starMarkSeed}
                  href={artistAttribution.href}
                  size={40}
                  studioChrome={artistAttribution.studioChrome}
                  toneClass="bg-fuchsia-500/20 text-fuchsia-200"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <Link
                  href={trackDetailsHref}
                  className="block truncate font-headline text-base font-bold uppercase text-white [text-shadow:0_1px_10px_rgba(0,0,0,.75)] transition-colors hover:text-fuchsia-100 hover:underline sm:text-lg"
                >
                  {title}
                </Link>
                {artistAttribution ? (
                  <p className="mt-0.5 flex min-w-0 flex-wrap items-baseline gap-x-1 text-[9px] font-bold uppercase tracking-widest text-white/70">
                    <span>Original artist</span>
                    <span aria-hidden>·</span>
                    {artistAttribution.href ? (
                      <Link
                        href={artistAttribution.href}
                        className={cn(
                          'min-w-0 truncate transition-colors hover:text-white hover:underline',
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
                {resolvedAlbumTitle && resolvedAlbumHref ? (
                  <Link
                    href={resolvedAlbumHref}
                    className="mt-0.5 block truncate text-[10px] font-medium text-fuchsia-200/90 hover:text-fuchsia-100 hover:underline"
                  >
                    {resolvedAlbumTitle}
                  </Link>
                ) : null}
              </div>
            </div>
            {src ? (
              <audio
                ref={audioRef}
                src={src}
                preload="none"
                playsInline
                className="sr-only"
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
                  primeAnalyser();
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
        ) : compactPresentation ? (
        <div className="flex min-h-0 min-w-0 items-center self-stretch px-0.5 sm:px-1">
          <DropTransportButton
            playing={playing}
            loading={loading}
            disabled={loading || !src}
            size="sm"
            className="h-8 w-8 shrink-0 sm:h-9 sm:w-9"
            onClick={() => {
              primeAnalyser();
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
          />
          <div className="flex min-w-0 flex-1 items-center gap-1.5 pl-1.5 sm:gap-2.5 sm:pl-3">
            {artistAttribution ? (
              <ArtistStarAvatar
                name={artistName || 'Artist'}
                avatarUrl={artistAttribution.avatarUrl}
                useStarMark={artistAttribution.useStarMark}
                starMarkSeed={artistAttribution.starMarkSeed}
                href={artistAttribution.href}
                size={28}
                className="shrink-0"
                studioChrome={artistAttribution.studioChrome}
                toneClass="bg-fuchsia-500/20 text-fuchsia-200 ring-1 ring-fuchsia-400/25"
              />
            ) : null}
            <div className="min-w-0 flex-1 pr-0.5">
              <Link
                href={trackDetailsHref}
                className={cn(
                  'block max-w-full break-words text-left font-headline text-xs font-bold uppercase leading-[1.15] tracking-tight [text-shadow:0_1px_8px_rgba(0,0,0,.75)] transition-colors hover:text-fuchsia-100 hover:underline sm:text-[13px] md:text-sm',
                  firstPressEdition ? 'text-amber-50' : 'text-white'
                )}
              >
                {title}
              </Link>
              {artistAttribution || resolvedAlbumTitle ? (
                <p className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0.5 font-code text-[9px] font-semibold uppercase leading-tight tracking-wide text-white/65 sm:text-[10px]">
                  {artistAttribution ? (
                    <>
                      {artistAttribution.href ? (
                        <Link
                          href={artistAttribution.href}
                          className={cn(
                            'max-w-full break-words transition-colors hover:text-white hover:underline',
                            studioNameClass(artistAttribution.studioChrome)
                          )}
                          aria-label={`Open ${artistName || 'Artist'} artist page`}
                        >
                          {artistName || 'Artist'}
                        </Link>
                      ) : (
                        <span className={cn('max-w-full break-words', studioNameClass(artistAttribution.studioChrome))}>
                          {artistName || 'Artist'}
                        </span>
                      )}
                    </>
                  ) : null}
                  {resolvedAlbumTitle ? (
                    <>
                      {artistAttribution ? <span className="text-white/30" aria-hidden>•</span> : null}
                      {resolvedAlbumHref ? (
                        <Link
                          href={resolvedAlbumHref}
                          className="max-w-full break-words text-cyan-200/90 transition-colors hover:text-cyan-100 hover:underline"
                          aria-label={`Open ${resolvedAlbumTitle} album`}
                        >
                          {resolvedAlbumTitle}
                        </Link>
                      ) : (
                        <span className="max-w-full break-words text-cyan-200/85">{resolvedAlbumTitle}</span>
                      )}
                    </>
                  ) : null}
                </p>
              ) : null}
              <p className="mt-1 font-code text-[9px] uppercase leading-tight tracking-wide text-muted-foreground/90">
                {previewCapped
                  ? isHouseRelease
                    ? '30s preview · free account for full House stream'
                    : showPurchase
                      ? '30s featured excerpt'
                      : '30s album preview'
                  : featuredByUserId && excerptStartSec > 0
                    ? 'Full stream · featured moment'
                    : 'Streams in Library'}
              </p>
            </div>
          </div>
          {src ? (
            <audio
              ref={audioRef}
              src={src}
              preload="none"
              playsInline
              className="sr-only"
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
                primeAnalyser();
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
        ) : (
        <div
          className={cn(
            'flex min-w-0 w-full',
            songPresentation
              ? 'min-h-0 items-center self-stretch pl-4 pr-0.5 sm:pl-5'
              : 'items-center gap-2'
          )}
        >
          <DropTransportButton
            playing={playing}
            loading={loading}
            disabled={loading || !src}
            size={songPresentation ? 'lg' : 'md'}
            className={cn(
              'shrink-0',
              firstPressEdition &&
                'border-amber-200 bg-gradient-to-br from-yellow-200 via-amber-400 to-amber-600 shadow-[0_0_24px_rgba(251,191,36,.38)]'
            )}
            onClick={() => {
              primeAnalyser();
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
          />
          <div
            className={cn(
              'flex min-w-0 flex-1 items-center',
              songPresentation ? 'gap-4 pl-6 sm:gap-5 sm:pl-10 md:pl-12' : 'gap-2'
            )}
          >
          {artistAttribution ? (
            <ArtistStarAvatar
              name={artistName || 'Artist'}
              avatarUrl={artistAttribution.avatarUrl}
              useStarMark={artistAttribution.useStarMark}
              starMarkSeed={artistAttribution.starMarkSeed}
              href={artistAttribution.href}
              size={songPresentation ? 40 : 36}
              studioChrome={artistAttribution.studioChrome}
              toneClass="bg-fuchsia-500/20 text-fuchsia-200"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <Link
              href={trackDetailsHref}
              className={cn(
                'block truncate pl-0.5 text-sm font-headline font-bold uppercase transition-colors hover:underline',
                firstPressEdition ? 'text-amber-50 hover:text-amber-200' : 'text-white [text-shadow:0_1px_8px_rgba(0,0,0,.7)] hover:text-white'
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
                      'min-w-0 truncate transition-colors hover:text-white hover:underline',
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
            {resolvedAlbumTitle && resolvedAlbumHref ? (
              <Link
                href={resolvedAlbumHref}
                className="mt-0.5 block truncate text-[10px] font-medium text-white/75 [text-shadow:0_1px_8px_rgba(0,0,0,.7)] hover:text-white hover:underline"
              >
                {resolvedAlbumTitle}
              </Link>
            ) : null}
            <p className="text-[10px] text-muted-foreground">
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
        )
      )}

      {hasAudio && !purchaseOnly ? (
        <>
          <div
            className={cn(
              'flex min-w-0 items-center gap-2',
              pressingFeed
                ? 'pl-0'
                : compactPresentation
                  ? 'px-0.5 sm:px-1'
                  : songPresentation
                    ? 'pl-4 sm:pl-5'
                  : 'pl-[52px]'
            )}
          >
            <span className={cn('shrink-0 font-code text-[9px] tabular-nums text-muted-foreground', compactPresentation ? 'w-7 sm:w-9' : 'w-9')}>
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
            <span className={cn('shrink-0 text-right font-code text-[9px] tabular-nums text-muted-foreground', compactPresentation ? 'w-7 sm:w-9' : 'w-9')}>
              {formatPlaybackTime(displayedDurationSec)}
            </span>
            {compactPresentation || songPresentation ? (
              <DropInlineSpectrum analyser={analyser} playing={playing} showOnMobile={songPresentation} />
            ) : null}
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
            className={compactPresentation ? 'h-8 min-w-0 px-2 text-[10px] font-bold uppercase bg-[var(--ph-accent,#e879f9)] text-black hover:brightness-110' : 'h-9 min-w-0 px-3 text-xs font-bold uppercase bg-[var(--ph-accent,#e879f9)] text-black hover:brightness-110'}
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
            className={compactPresentation ? 'h-8 min-w-0 px-2 text-[10px] font-bold uppercase' : 'h-9 min-w-0 border-[var(--ph-accent,#e879f9)]/40 bg-[var(--ph-accent,#e879f9)]/10 px-3 text-xs font-bold uppercase text-white hover:bg-[var(--ph-accent,#e879f9)]/20'}
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
    </div>
  );
}
