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
  normalizeDropPrice,
  parseUsdToCents,
  resolveCheckoutCents,
  type DropPrice,
} from '@/lib/drop-commerce';
import { buildDropBuyLoginPath, getDropBuyIntentFromPath } from '@/lib/checkout-intent';
import { Pause, Play, Loader } from 'lucide-react';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { useAudioVolume } from '@/hooks/use-audio-volume';
import { AudioVolumeControl } from '@/components/audio-volume-control';
import { recordDropListenProgressClient, recordDropSpinClient } from '@/lib/drop-pulse-client';
import {
  DROP_LISTEN_MILESTONES,
  type DropListenMilestone,
  type DropListenSource,
} from '@/lib/drop-listen-analytics';
import { pressedSongHref } from '@/lib/pressed-song';

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
}: {
  shareId: string;
  title: string;
  ownerId: string;
  price?: DropPrice | null;
  hasAudio: boolean;
  trackId?: string;
  source?: DropListenSource;
  /** Profile owner whose saved featured selection this player must match. */
  featuredByUserId?: string;
  excerptStartSec?: number;
  presentation?: 'default' | 'song' | 'playlist';
  /** When set, starting this player pauses another Drop player in the same queue. */
  playbackGroup?: string;
  onPlaybackStateChange?: (state: { playing: boolean; currentTime: number; duration: number }) => void;
  referralPostId?: string;
}) {
  const { user, authReady } = useAuth();
  const { toast } = useToast();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
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
  const [busy, setBusy] = useState(false);
  const [pwyw, setPwyw] = useState('');
  const normalized = normalizeDropPrice(price);
  const isOwner = Boolean(user && user.id === ownerId);
  const enteredPwywCents = parseUsdToCents(pwyw);
  const pwywCheckoutCents = normalized.mode === 'pwyw'
    ? resolveCheckoutCents(normalized, enteredPwywCents ?? undefined)
    : 0;
  const pendingBuyIntent = getDropBuyIntentFromPath(
    `/song/${encodeURIComponent(shareId)}?${searchParams.toString()}`
  );
  const queryReferralPostId = searchParams.get('refPost')?.trim() || undefined;
  const effectiveReferralPostId = referralPostId || queryReferralPostId;
  const effectiveTrackId = trackId || pendingBuyIntent?.trackId;
  const pendingCheckoutHandledRef = useRef<string | null>(null);

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
      setListenProof(typeof data.listenProof === 'string' ? data.listenProof : '');
      setEligibleDurationSec(Math.max(1, Number(data.eligibleDurationSec) || 30));
      setPlaybackStartSec(Math.max(0, Number(data.playbackStartSec) || 0));
      reportedMilestonesRef.current = new Set();
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : undefined;
      toast({
        variant: 'destructive',
        title: 'Audio unavailable',
        description:
          raw && /iam\.|signBlob|Permission/i.test(raw)
            ? 'Could not open this stream. Refresh and try again.'
            : raw,
      });
    } finally {
      setLoading(false);
      setStreamReady(true);
    }
  }, [effectiveReferralPostId, effectiveTrackId, featuredByUserId, firstDropsOn, hasAudio, shareId, toast]);

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
        toast({ title: 'Added to Library', description: 'Full stream is ready to play.' });
      } catch {
        /* webhook may already have fulfilled */
      }
    })();
  }, [searchParams, user?.id, loadStream, toast]);

  const startCheckout = useCallback(async (amountCents?: number) => {
    if (!user) {
      router.push(buildDropBuyLoginPath(shareId, {
        amountCents,
        trackId: effectiveTrackId,
        referralPostId: effectiveReferralPostId,
      }));
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
  }, [authReady, effectiveReferralPostId, effectiveTrackId, router, shareId, toast, user]);

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

  const buy = () => {
    if (normalized.mode === 'pwyw') {
      const entered = parseUsdToCents(pwyw);
      const cents = resolveCheckoutCents(normalized, entered ?? undefined);
      void startCheckout(cents);
      return;
    }
    void startCheckout(resolveCheckoutCents(normalized));
  };

  if (!firstDropsOn) return null;
  if (!hasAudio && !isCommerceLive(normalized)) return null;

  const previewCapped = !full && !isOwner;

  return (
    <div className={presentation === 'song'
      ? 'space-y-3 rounded-2xl border border-fuchsia-300/45 bg-black/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_18px_55px_rgba(0,0,0,.35)] sm:p-5'
      : presentation === 'playlist'
        ? 'space-y-3 rounded-2xl border border-fuchsia-400/40 bg-gradient-to-r from-fuchsia-500/15 via-black/65 to-blue-500/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.07),0_14px_38px_rgba(0,0,0,.28)] transition-colors hover:border-fuchsia-300/60 sm:p-5'
      : 'min-w-0 rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 p-3 space-y-3 sm:p-4'}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-200">
          {full || isOwner ? 'Full stream' : hasAudio ? 'Play preview · 30 seconds' : 'On sale'}
        </p>
        {dropPriceSummary(normalized) ? (
          <span className="max-w-full break-words text-right font-code text-[10px] leading-relaxed text-muted-foreground">{dropPriceSummary(normalized)}</span>
        ) : null}
      </div>

      {hasAudio && (
        <div className="flex min-w-0 items-center gap-2">
          <Button
            type="button"
            size="icon"
            className="h-11 w-11 rounded-full"
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
          <div className="min-w-0 flex-1">
            <Link
              href={pressedSongHref(shareId, { referralPostId: effectiveReferralPostId })}
              className="block truncate text-sm font-headline font-bold uppercase transition-colors hover:text-fuchsia-300 hover:underline"
            >
              {title}
            </Link>
            <p className="text-[10px] text-muted-foreground">
              {previewCapped
                ? `Featured 30-second excerpt${excerptStartSec > 0 ? ` from ${Math.floor(excerptStartSec / 60)}:${Math.floor(excerptStartSec % 60).toString().padStart(2, '0')}` : ''}. Buy once to unlock.`
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
                if (playbackStartSec > 0 && event.currentTarget.currentTime < playbackStartSec) {
                  event.currentTarget.currentTime = playbackStartSec;
                }
              }}
              onEnded={(event) => {
                setPlaying(false);
                onPlaybackStateChange?.({ playing: false, currentTime: event.currentTarget.currentTime, duration: event.currentTarget.duration || eligibleDurationSec });
              }}
              onPause={(event) => {
                setPlaying(false);
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

      {hasAudio ? (
        <AudioVolumeControl
          volume={volume}
          onVolumeChange={setVolume}
          onToggleMute={toggleMute}
          className={presentation === 'playlist' ? 'ml-[52px] w-[calc(100%-52px)] max-w-sm' : 'ml-[52px] w-[calc(100%-52px)] max-w-56'}
        />
      ) : null}

      {!full && !isOwner && isCommerceLive(normalized) && (
        <div className="space-y-2 border-t border-white/10 pt-3">
          {normalized.mode === 'pwyw' && (
            <Input
              value={pwyw}
              onChange={(e) => setPwyw(e.target.value)}
              placeholder={`Suggested ${centsToUsdLabel(Math.max(DROP_PAID_MIN_CENTS, normalized.suggestedCents ?? 777))}`}
              className="h-9 font-code text-xs"
            />
          )}
          <Button
            className="w-full h-11 font-bold uppercase bg-fuchsia-400 text-black hover:bg-fuchsia-300"
            disabled={busy || (Boolean(user) && !authReady)}
            onClick={buy}
          >
            {busy ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
            {normalized.mode === 'fixed' || normalized.mode === 'free'
                ? user
                  ? `Buy · ${centsToUsdLabel(Math.max(DROP_PAID_MIN_CENTS, normalized.amountCents ?? DROP_PAID_MIN_CENTS))}`
                  : `Sign up · Buy · ${centsToUsdLabel(Math.max(DROP_PAID_MIN_CENTS, normalized.amountCents ?? DROP_PAID_MIN_CENTS))}`
                : user
                    ? `Pay · ${centsToUsdLabel(pwywCheckoutCents)}`
                    : `Sign up · Pay · ${centsToUsdLabel(pwywCheckoutCents)}`}
          </Button>
          <p className="text-[9px] text-muted-foreground text-center">
            Buy once. Stream in the app. Not on Spotify unless the artist goes wide later.
          </p>
        </div>
      )}
    </div>
  );
}
