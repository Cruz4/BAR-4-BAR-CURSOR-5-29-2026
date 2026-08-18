'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { Pause, Play, Loader } from 'lucide-react';
import { useFirstDropsFeature } from '@/hooks/use-first-drops-feature';
import { recordDropSpinClient } from '@/lib/drop-pulse-client';

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
}: {
  shareId: string;
  title: string;
  ownerId: string;
  price?: DropPrice | null;
  hasAudio: boolean;
  trackId?: string;
}) {
  const { user, authReady } = useAuth();
  const { toast } = useToast();
  const { enabled: firstDropsOn } = useFirstDropsFeature();
  const router = useRouter();
  const searchParams = useSearchParams();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [full, setFull] = useState(false);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pwyw, setPwyw] = useState('');
  const normalized = normalizeDropPrice(price);
  const isOwner = Boolean(user && user.id === ownerId);

  const loadStream = useCallback(async () => {
    if (!firstDropsOn || !hasAudio) return;
    setLoading(true);
    try {
      const headers = await authHeaders();
      const qs = new URLSearchParams({ shareId });
      if (trackId) qs.set('trackId', trackId);
      const res = await fetch(`/api/drops/audio?${qs.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load audio.');
      setSrc(data.url);
      setFull(Boolean(data.full));
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
    }
  }, [firstDropsOn, hasAudio, shareId, trackId, toast]);

  useEffect(() => {
    void loadStream();
  }, [loadStream, user?.id]);

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
        toast({ title: 'Added to your library', description: 'Full stream is on The Deck.' });
      } catch {
        /* webhook may already have fulfilled */
      }
    })();
  }, [searchParams, user?.id, loadStream, toast]);

  const startCheckout = async (amountCents?: number) => {
    if (!authReady) return;
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/share/${shareId}`)}`);
      return;
    }
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
          trackId,
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
  };

  const claimFree = async () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(`/share/${shareId}`)}`);
      return;
    }
    setBusy(true);
    try {
      const headers = await authHeaders();
      const res = await fetch('/api/drops/claim', {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId: user.id, shareId, trackId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not unlock');
      await loadStream();
      toast({ title: 'Unlocked', description: 'Full stream is on The Deck.' });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Unlock failed',
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  const buy = () => {
    if (normalized.mode === 'pwyw') {
      const entered = parseUsdToCents(pwyw);
      const cents = resolveCheckoutCents(normalized, entered ?? undefined);
      if (cents <= 0) {
        void claimFree();
        return;
      }
      void startCheckout(cents);
      return;
    }
    if (normalized.mode === 'free') {
      void claimFree();
      return;
    }
    void startCheckout(resolveCheckoutCents(normalized));
  };

  if (!firstDropsOn) return null;
  if (!hasAudio && !isCommerceLive(normalized)) return null;

  const previewCapped = !full && !isOwner;

  return (
    <div className="rounded-xl border border-fuchsia-500/40 bg-fuchsia-500/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-200">
          {full || isOwner ? 'Full stream' : hasAudio ? 'Play preview · 30 seconds' : 'On sale'}
        </p>
        {dropPriceSummary(normalized) ? (
          <span className="text-[10px] font-code text-muted-foreground">{dropPriceSummary(normalized)}</span>
        ) : null}
      </div>

      {hasAudio && (
        <div className="flex items-center gap-2">
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
            <p className="truncate text-sm font-headline font-bold uppercase">{title}</p>
            <p className="text-[10px] text-muted-foreground">
              {previewCapped ? 'Preview stops at 30 seconds until you unlock the drop.' : 'Streams in your Bar 4 Bar library.'}
            </p>
          </div>
          {src ? (
            <audio
              ref={audioRef}
              src={src}
              preload="none"
              onEnded={() => setPlaying(false)}
              onPause={() => setPlaying(false)}
              onPlay={() => {
                setPlaying(true);
                recordDropSpinClient(shareId, previewCapped ? 'preview' : 'play');
              }}
              onTimeUpdate={(e) => {
                if (!previewCapped) return;
                const el = e.currentTarget;
                if (el.currentTime >= 30) {
                  el.pause();
                  el.currentTime = 30;
                  setPlaying(false);
                }
              }}
            />
          ) : null}
        </div>
      )}

      {!full && !isOwner && isCommerceLive(normalized) && (
        <div className="space-y-2 border-t border-white/10 pt-3">
          {normalized.mode === 'pwyw' && (
            <Input
              value={pwyw}
              onChange={(e) => setPwyw(e.target.value)}
              placeholder={`Suggested ${centsToUsdLabel(normalized.suggestedCents ?? 777)}`}
              className="h-9 font-code text-xs"
            />
          )}
          <Button
            className="w-full h-11 font-bold uppercase bg-fuchsia-400 text-black hover:bg-fuchsia-300"
            disabled={busy}
            onClick={buy}
          >
            {busy ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
            {normalized.mode === 'free'
              ? 'Unlock free stream'
              : normalized.mode === 'fixed'
                ? `Buy · ${centsToUsdLabel(Math.max(DROP_PAID_MIN_CENTS, normalized.amountCents ?? DROP_PAID_MIN_CENTS))}`
                : 'Pay what you want'}
          </Button>
          <p className="text-[9px] text-muted-foreground text-center">
            Buy once. Stream in the app. Not on Spotify unless the artist goes wide later.
          </p>
        </div>
      )}
    </div>
  );
}
