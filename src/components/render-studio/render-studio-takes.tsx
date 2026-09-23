'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, CheckCircle2, Loader2, Music2, Pause, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/client/firebase';
import { useToast } from '@/hooks/use-toast';
import type { GeneratedTakeRecord } from '@/lib/song-generation/types';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

type TakeSortKey = 'createdAt' | 'durationSec' | 'approvedAt' | 'takeId';
type SortDir = 'asc' | 'desc';

function formatPlayerClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const mm = Math.floor(total / 60);
  const ss = String(total % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

function TakeNowPlayingBar({
  audioRef,
  sourceUrl,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
  sourceUrl: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setElapsed(el.duration || 0);
    };
    const onTime = () => setElapsed(el.currentTime || 0);
    const onMeta = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) setDuration(el.duration);
    };
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('durationchange', onMeta);
    el.addEventListener('loadedmetadata', onMeta);
    setPlaying(!el.paused);
    onMeta();
    onTime();
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('durationchange', onMeta);
      el.removeEventListener('loadedmetadata', onMeta);
    };
  }, [audioRef, sourceUrl]);

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  };

  return (
    <div
      className="relative z-20 pointer-events-auto rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Now playing</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 shrink-0"
          onClick={togglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 0.01)}
          step={0.1}
          value={Math.min(elapsed, duration || 0)}
          onChange={(event) => {
            const el = audioRef.current;
            const next = Number(event.target.value);
            if (el) el.currentTime = next;
            setElapsed(next);
          }}
          className="h-1.5 min-w-0 flex-1 cursor-pointer accent-cyan-400"
          aria-label="Seek"
        />
        <span className="font-code text-[10px] text-muted-foreground tabular-nums shrink-0">
          {formatPlayerClock(elapsed)} / {formatPlayerClock(duration)}
        </span>
      </div>
    </div>
  );
}

function parseTakeTime(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function sortTakes(takes: GeneratedTakeRecord[], key: TakeSortKey, dir: SortDir): GeneratedTakeRecord[] {
  const mult = dir === 'asc' ? 1 : -1;
  return [...takes].sort((a, b) => {
    let cmp = 0;
    switch (key) {
      case 'createdAt':
        cmp = parseTakeTime(a.createdAt) - parseTakeTime(b.createdAt);
        break;
      case 'approvedAt':
        cmp = parseTakeTime(a.approvedAt) - parseTakeTime(b.approvedAt);
        break;
      case 'durationSec':
        cmp = (a.durationSec ?? 0) - (b.durationSec ?? 0);
        break;
      case 'takeId':
        cmp = a.id.localeCompare(b.id);
        break;
      default:
        cmp = 0;
    }
    return cmp * mult;
  });
}

export function RenderStudioTakes({
  albumId,
  trackId,
  refreshToken,
}: {
  albumId: string;
  trackId: string;
  refreshToken?: number;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [takes, setTakes] = useState<GeneratedTakeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [streamTakeId, setStreamTakeId] = useState<string | null>(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const [sortKey, setSortKey] = useState<TakeSortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  const authHeaders = useCallback(async () => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('Sign in required');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, []);

  const loadTakes = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user) {
      setTakes([]);
      setLoading(false);
      return;
    }
    if (!opts?.silent) setLoading(true);
    try {
      const headers = await authHeaders();
      const qs = new URLSearchParams({ albumId, trackId });
      const res = await fetch(`/api/render/takes?${qs}`, { headers });
      if (!res.ok) throw new Error('Could not load takes');
      const data = await res.json();
      setTakes((data.takes || []) as GeneratedTakeRecord[]);
    } catch {
      if (!opts?.silent) setTakes([]);
    } finally {
      setLoading(false);
    }
  }, [user, albumId, trackId, authHeaders]);

  useEffect(() => {
    void loadTakes({ silent: Boolean(refreshToken) });
  }, [loadTakes, refreshToken]);

  const sortedTakes = useMemo(
    () => sortTakes(takes, sortKey, sortDir),
    [takes, sortKey, sortDir]
  );

  const approveTake = async (takeId: string) => {
    setApprovingId(takeId);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/render/takes/${takeId}/approve`, {
        method: 'POST',
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Approve failed');
      toast({
        title: 'Approved',
        description: 'This take is in your private Approved Studio library.',
      });
      await loadTakes();
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Could not approve',
        description: (e as Error).message,
      });
    } finally {
      setApprovingId(null);
    }
  };

  const stopPlayback = useCallback(() => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
  }, []);

  const tryPlay = async (takeId: string) => {
    setStreamLoading(true);
    setStreamTakeId(takeId);
    try {
      const headers = await authHeaders();
      const res = await fetch(`/api/render/takes/${takeId}/stream?delivery=binary`, { headers });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(errText || `Playback failed (${res.status})`);
      }
      const raw = await res.arrayBuffer();
      if (!raw.byteLength) throw new Error('Empty audio response');
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      const objectUrl = URL.createObjectURL(
        new Blob([raw], { type: res.headers.get('Content-Type') || 'audio/wav' })
      );
      blobUrlRef.current = objectUrl;
      setStreamUrl(objectUrl);
      const el = audioRef.current;
      if (!el) throw new Error('Player is not ready.');
      el.src = objectUrl;
      await el.play();
    } catch (e) {
      stopPlayback();
      setStreamUrl(null);
      toast({
        variant: 'destructive',
        title: 'Playback unavailable',
        description: e instanceof Error ? e.message : 'Could not load audio',
      });
    } finally {
      setStreamLoading(false);
    }
  };

  const sortToolbar = (
    <div className="flex flex-wrap items-end gap-3 border-b border-white/10 pb-3 mb-1">
      <div className="space-y-1 min-w-[140px] flex-1">
        <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Sort by
        </Label>
        <Select value={sortKey} onValueChange={(v) => setSortKey(v as TakeSortKey)}>
          <SelectTrigger className="h-9 text-xs font-code">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Created</SelectItem>
            <SelectItem value="approvedAt">Approved date</SelectItem>
            <SelectItem value="durationSec">Duration</SelectItem>
            <SelectItem value="takeId">Take ID</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          Order
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 text-[10px] font-bold uppercase gap-1.5 min-w-[7.5rem]"
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
        >
          {sortDir === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )}
          {sortDir === 'asc' ? 'Ascending' : 'Descending'}
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground font-code w-full sm:w-auto sm:ml-auto">
        {sortedTakes.length} take{sortedTakes.length === 1 ? '' : 's'}
      </p>
    </div>
  );

  const audioEl = (
    <audio ref={audioRef} className="sr-only" preload="metadata" data-studio-take="1" />
  );

  if (loading) {
    return (
      <Card id="render-takes" className="min-h-[12rem] border-white/10 bg-card/80 backdrop-blur-xl">
        {audioEl}
        <CardContent className="py-12 flex justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!takes.length) {
    return (
      <Card id="render-takes" className="min-h-[12rem] border-white/10 bg-card/80 backdrop-blur-xl">
        {audioEl}
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Music2 className="h-4 w-4 text-primary" />
            Takes
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No takes yet. Use <strong className="text-foreground">New render</strong> on the right — when
          status shows <strong className="text-foreground">ready</strong>, your take appears here.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="render-takes" className="min-h-[12rem] border-white/10 bg-card/80 backdrop-blur-xl">
      {audioEl}
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Music2 className="h-4 w-4 text-primary" />
          Takes for this sheet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortToolbar}
        <ul className="space-y-3 max-h-[min(70vh,42rem)] overflow-y-auto studio-scrollbar pr-1">
          {sortedTakes.map((take) => {
            const approved = Boolean(take.approvedAt);
            const secs = take.durationSec ?? 0;
            const mm = Math.floor(secs / 60);
            const ss = String(secs % 60).padStart(2, '0');
            const previewMix = take.modelFamily !== 'ace-step';
            const created = new Date(take.createdAt);
            const createdValid = !Number.isNaN(created.getTime());
            return (
              <li
                key={take.id}
                className={cn(
                  'rounded-lg border bg-muted/20 p-3 sm:p-4 space-y-2 text-sm',
                  streamTakeId === take.id && streamUrl ? 'border-primary/40' : 'border-white/10'
                )}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <p className="font-code text-[11px] sm:text-xs text-foreground leading-snug">
                      {createdValid
                        ? format(created, 'EEE, MMM d, yyyy · h:mm:ss a')
                        : 'Unknown time'}
                    </p>
                    {createdValid && (
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(created, { addSuffix: true })}
                        <span className="mx-1.5 opacity-40">·</span>
                        <span className="font-code">{created.toISOString()}</span>
                      </p>
                    )}
                    {approved && take.approvedAt && (
                      <p className="text-[10px] text-green-400/90 font-code">
                        Approved {format(new Date(take.approvedAt), 'MMM d, yyyy · h:mm:ss a')}
                      </p>
                    )}
                    <p className="text-[9px] font-code text-muted-foreground/80 truncate" title={take.id}>
                      Take {take.id}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[9px]">
                      {mm}:{ss}
                    </Badge>
                    {previewMix ? (
                      <Badge variant="outline" className="text-[9px] border-red-400/40 text-red-200">
                        Not a song
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] border-cyan-400/40 text-cyan-200">
                        Full song
                      </Badge>
                    )}
                    {approved ? (
                      <Badge className="text-[9px] bg-green-600/80">Approved</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[9px]">Draft</Badge>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-[10px] font-bold uppercase"
                    disabled={previewMix || (streamLoading && streamTakeId === take.id)}
                    onClick={() => void tryPlay(take.id)}
                  >
                    {streamLoading && streamTakeId === take.id ? (
                      <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Play className="mr-1 h-3.5 w-3.5" />
                    )}
                    Listen
                  </Button>
                  {!approved && (
                    <Button
                      type="button"
                      size="sm"
                      className="h-8 text-[10px] font-bold uppercase"
                      disabled={previewMix || approvingId === take.id}
                      onClick={() => void approveTake(take.id)}
                    >
                      {approvingId === take.id ? (
                        <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      )}
                      Approve to library
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {streamUrl ? <TakeNowPlayingBar audioRef={audioRef} sourceUrl={streamUrl} /> : null}
        <p className="text-[10px] text-muted-foreground leading-snug">
          Approved takes show in{' '}
          <Link href="/library" className="text-primary underline font-bold">
            Library → Approved Studio
          </Link>
          .
        </p>
      </CardContent>
    </Card>
  );
}
