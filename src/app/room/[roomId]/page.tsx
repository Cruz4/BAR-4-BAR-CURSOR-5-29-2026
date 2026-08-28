'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useProductSurfaces } from '@/hooks/use-product-surfaces';
import { auth } from '@/lib/firebase/client/firebase';
import { buildLoginUrl } from '@/lib/login-links';
import type { ReleaseRoomPublic, ReleaseRoomReport } from '@/lib/release-room';
import { cn } from '@/lib/utils';
import {
  Disc3,
  Flame,
  Heart,
  Loader,
  Pause,
  Play,
  Radio,
  Users,
  LogIn,
} from 'lucide-react';

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (!user) return headers;
  return { ...headers, Authorization: `Bearer ${await user.getIdToken()}` };
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export default function ReleaseRoomPage() {
  const params = useParams();
  const roomId = typeof params?.roomId === 'string' ? params.roomId : '';
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { releaseRoom: releaseRoomMode, loading: surfacesLoading } = useProductSurfaces();
  const { toast } = useToast();

  const [room, setRoom] = useState<ReleaseRoomPublic | null>(null);
  const [report, setReport] = useState<ReleaseRoomReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);

  const loadRoom = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/release-rooms/${encodeURIComponent(roomId)}`, {
        headers: await authHeaders(),
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({}))) as {
        room?: ReleaseRoomPublic;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || 'Room not found');
        setRoom(null);
        return;
      }
      setRoom(data.room || null);
      setError(null);
    } catch {
      setError('Could not load room');
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    void loadRoom();
    const poll = window.setInterval(() => void loadRoom(), 8_000);
    return () => window.clearInterval(poll);
  }, [loadRoom]);

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!room?.isHost || !user) {
      setReport(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/release-rooms/${encodeURIComponent(roomId)}/report`, {
          headers: await authHeaders(),
          cache: 'no-store',
        });
        const data = (await res.json().catch(() => ({}))) as { report?: ReleaseRoomReport };
        if (!cancelled && res.ok && data.report) setReport(data.report);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [room?.isHost, room?.status, room?.rsvpCount, room?.attendCount, user, roomId]);

  const countdownMs = useMemo(() => {
    if (!room || room.status !== 'scheduled') return 0;
    return Math.max(0, Date.parse(room.scheduledAt) - now);
  }, [room, now]);

  const songHref = room ? `/song/${encodeURIComponent(room.shareId)}` : '#';
  const shareHref = room ? `/share/${encodeURIComponent(room.shareId)}` : '#';

  const runControl = async (action: 'start' | 'end' | 'playhead', extra?: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/release-rooms/${encodeURIComponent(roomId)}/control`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ action, ...extra }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        room?: ReleaseRoomPublic;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Control failed');
      if (data.room) setRoom(data.room);
      else await loadRoom();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: err instanceof Error ? err.message : 'Control failed',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRsvp = async () => {
    if (!user) {
      router.push(buildLoginUrl({ mode: 'signin', next: `/room/${roomId}` }));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/release-rooms/${encodeURIComponent(roomId)}/rsvp`, {
        method: 'POST',
        headers: await authHeaders(),
      });
      const data = (await res.json().catch(() => ({}))) as {
        room?: ReleaseRoomPublic;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'RSVP failed');
      if (data.room) setRoom(data.room);
      toast({ title: "You're on the list" });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: err instanceof Error ? err.message : 'RSVP failed',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleReact = async (react: 'fire' | 'heart' | 'headnod') => {
    if (!user) {
      router.push(buildLoginUrl({ mode: 'signin', next: `/room/${roomId}` }));
      return;
    }
    try {
      const res = await fetch(`/api/release-rooms/${encodeURIComponent(roomId)}/react`, {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ react }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reactCounts?: Record<string, number>;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'React failed');
      if (data.reactCounts) {
        setRoom((prev) => (prev ? { ...prev, reactCounts: data.reactCounts! } : prev));
      }
    } catch (err) {
      toast({
        variant: 'destructive',
        title: err instanceof Error ? err.message : 'React failed',
      });
    }
  };

  if (surfacesLoading || loading || authLoading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    );
  }

  if (releaseRoomMode !== 'v1') {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <Radio className="h-10 w-10 text-muted-foreground" />
        <p className="font-headline text-xl uppercase">Listening rooms are offline</p>
        <Button asChild variant="outline">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="font-headline text-xl uppercase">{error || 'Room not found'}</p>
        <Button asChild variant="outline">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    );
  }

  const cover = room.coverUrl?.trim() || '/Logo.png';

  return (
    <div
      data-dark-surface
      className="relative min-h-[100dvh] overflow-hidden bg-black text-white"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url(${cover})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(28px) saturate(1.2)',
          transform: 'scale(1.12)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/50 via-black/80 to-black" />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col gap-5 px-4 pb-10 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <header className="space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-sky-300">
            Release Room
          </p>
          <h1 className="font-headline text-3xl font-bold uppercase leading-none tracking-tight">
            {room.title}
          </h1>
          {room.artistName ? (
            <p className="text-sm text-white/70">{room.artistName}</p>
          ) : null}
        </header>

        <div className="relative mx-auto aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl border border-white/15 shadow-[0_0_60px_-20px_hsl(199_89%_48%/0.55)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="h-full w-full object-cover" />
          {room.status === 'live' ? (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
              Live
            </span>
          ) : null}
        </div>

        {room.status === 'scheduled' ? (
          <div className="rounded-2xl border border-sky-400/25 bg-sky-500/10 px-4 py-5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200/80">
              Starts in
            </p>
            <p className="mt-1 font-headline text-4xl font-bold tabular-nums tracking-wide text-white">
              {formatCountdown(countdownMs)}
            </p>
            <p className="mt-2 text-[11px] text-white/60">
              {new Date(room.scheduledAt).toLocaleString()}
            </p>
          </div>
        ) : null}

        {room.status === 'ended' ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center text-sm text-white/70">
            This listening room has ended. Thanks for showing up.
          </div>
        ) : null}

        <div className="flex items-center justify-center gap-4 text-[11px] text-white/70">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-sky-300" />
            {room.rsvpCount} RSVP
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-fuchsia-300" />
            {room.attendCount} attended
          </span>
        </div>

        {room.status !== 'ended' ? (
          <div className="flex flex-col gap-2">
            {!room.hasRsvp ? (
              <Button
                type="button"
                className="h-12 w-full bg-sky-500 font-bold uppercase tracking-wide text-black hover:bg-sky-400"
                disabled={busy}
                onClick={() => void handleRsvp()}
              >
                {busy ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                {user ? 'RSVP' : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" /> Sign in to RSVP
                  </>
                )}
              </Button>
            ) : (
              <p className="text-center text-[11px] font-bold uppercase tracking-wider text-sky-300">
                You&apos;re RSVP&apos;d
              </p>
            )}
          </div>
        ) : null}

        {room.status === 'live' ? (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/40 p-4">
            <p className="text-[11px] leading-relaxed text-white/75">
              Listeners without a purchase get a time-limited stream on the release page.
              Open the song to play — house / entitlement rules still apply.
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button asChild className="h-11 font-bold uppercase">
                <Link href={songHref}>
                  <Disc3 className="mr-2 h-4 w-4" /> Open song
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-11 border-white/20 font-bold uppercase text-white hover:bg-white/10">
                <Link href={shareHref}>Open share page</Link>
              </Button>
            </div>
            <div className="flex justify-center gap-2 pt-1">
              {(
                [
                  { key: 'fire' as const, icon: Flame, label: 'Fire' },
                  { key: 'heart' as const, icon: Heart, label: 'Heart' },
                  { key: 'headnod' as const, icon: Radio, label: 'Nod' },
                ] as const
              ).map((item) => (
                <Button
                  key={item.key}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 border-white/15 text-[10px] font-bold uppercase"
                  onClick={() => void handleReact(item.key)}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                  {room.reactCounts?.[item.key] ? (
                    <span className="text-white/50">{room.reactCounts[item.key]}</span>
                  ) : null}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {room.isHost ? (
          <div className="space-y-3 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-200">
              Host controls
            </p>
            <div className="grid grid-cols-2 gap-2">
              {room.status === 'scheduled' || room.status === 'live' ? (
                <Button
                  type="button"
                  className={cn(
                    'h-11 font-bold uppercase',
                    room.status === 'live'
                      ? 'bg-white/10 text-white'
                      : 'bg-fuchsia-400 text-black hover:bg-fuchsia-300'
                  )}
                  disabled={busy || room.status === 'live'}
                  onClick={() => void runControl('start')}
                >
                  <Play className="mr-2 h-4 w-4" />
                  {room.status === 'live' ? 'Live' : 'Start room'}
                </Button>
              ) : null}
              {room.status !== 'ended' ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-red-400/40 font-bold uppercase text-red-200 hover:bg-red-500/15"
                  disabled={busy}
                  onClick={() => void runControl('end')}
                >
                  <Pause className="mr-2 h-4 w-4" /> End
                </Button>
              ) : null}
            </div>
            {room.status === 'live' ? (
              <Button
                type="button"
                variant="ghost"
                className="h-9 w-full text-[10px] font-bold uppercase text-white/70"
                disabled={busy}
                onClick={() =>
                  void runControl('playhead', {
                    atMs: room.playhead?.atMs ?? 0,
                    playing: !(room.playhead?.playing ?? false),
                    trackId: room.playhead?.trackId,
                  })
                }
              >
                Sync playhead · {room.playhead?.playing ? 'Pause signal' : 'Play signal'}
              </Button>
            ) : null}
            {report ? (
              <p className="text-[10px] leading-relaxed text-white/55">
                Report: {report.rsvpCount} RSVP · {report.attendCount} attended
                {report.durationMs != null
                  ? ` · ${Math.round(report.durationMs / 60000)} min`
                  : ''}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
