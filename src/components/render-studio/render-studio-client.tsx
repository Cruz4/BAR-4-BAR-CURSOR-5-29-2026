'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/client/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Loader2, Music2 } from 'lucide-react';
import { GENERATED_IN_APP_LABEL } from '@/lib/song-generation/provenance';
import { computeFullRenderInkCost } from '@/lib/song-generation/costs';
import { minimumLyricsForSongRender } from '@/lib/song-generation/prompt-compiler';
import { isStudioMaxUser } from '@/lib/subscription-products';
import type { Track } from '@/lib/types';
import type { RenderJobRecord } from '@/lib/song-generation/types';
import { useToast } from '@/hooks/use-toast';
import { RenderJobLiveStatus } from '@/components/render/render-job-live-status';
import { RenderStudioTakes } from '@/components/render-studio/render-studio-takes';
import { RenderStudioAtmosphere } from '@/components/render-studio/render-studio-atmosphere';
import {
  readRememberedRenderJob,
  rememberRenderJobForTrack,
} from '@/lib/render-track-job-storage';

type RenderStatus = {
  surfaces: { songGeneration: string; cloudRendering: string };
  studioAutoRender?: boolean;
  aceConfigured?: boolean;
};

const TERMINAL_JOB = new Set(['ready', 'failed', 'canceled', 'expired']);

function pickJobId(jobs: RenderJobRecord[], remembered: string | null): string | null {
  if (remembered && jobs.some((j) => j.id === remembered)) return remembered;
  const active = jobs.find((j) => !TERMINAL_JOB.has(j.status));
  if (active) return active.id;
  const latestReady = jobs.find((j) => j.status === 'ready');
  return latestReady?.id ?? jobs[0]?.id ?? null;
}

export function RenderStudioClient({
  albumId,
  trackId,
  track,
}: {
  albumId: string;
  trackId: string;
  track: Track;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<RenderStatus | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [takesRefresh, setTakesRefresh] = useState(0);
  const bumpTakes = useCallback(() => setTakesRefresh((n) => n + 1), []);
  const inkCost = computeFullRenderInkCost(240);
  const workKind = track.workKind === 'instrumental' ? 'instrumental' : 'song';

  const authHeaders = useCallback(async (): Promise<HeadersInit | null> => {
    const current = auth.currentUser;
    if (!current) return null;
    const token = await current.getIdToken();
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }, [user?.id]);

  const loadJobs = useCallback(async () => {
    const headers = await authHeaders();
    if (!headers) return;
    const qs = new URLSearchParams({ albumId, trackId });
    const res = await fetch(`/api/render/jobs?${qs}`, { headers });
    if (!res.ok) return;
    const data = await res.json();
    const jobs = (data.jobs || []) as RenderJobRecord[];
    const remembered = readRememberedRenderJob(albumId, trackId);
    setJobId(pickJobId(jobs, remembered));
  }, [albumId, trackId, authHeaders]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      try {
        const headers = await authHeaders();
        if (!headers || cancelled) return;
        const res = await fetch('/api/render/status', { headers });
        if (res.ok && !cancelled) setStatus(await res.json());
        if (!cancelled) await loadJobs();
      } catch {
        if (!cancelled) setStatus(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authHeaders, loadJobs]);

  const startRender = async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      if (!headers) throw new Error('Sign in again to start a render.');
      const res = await fetch('/api/render/jobs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          albumId,
          trackId,
          route: 'local',
          workKind,
          durationSec: 240,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Render failed');
      const id = data.job.id as string;
      rememberRenderJobForTrack(albumId, trackId, id);
      setJobId(id);
      toast({
        title: 'Generating full song',
        description: 'ACE-Step is singing this sheet’s lyrics. Usually 2–4 minutes.',
      });
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Render failed',
        description: (e as Error).message,
      });
    } finally {
      setLoading(false);
    }
  };

  const enabled = status?.surfaces?.songGeneration !== 'off';
  const aceOk = status?.aceConfigured !== false;
  const maxOk = isStudioMaxUser(user);
  const lyricsOk = workKind === 'instrumental' || minimumLyricsForSongRender(track);
  const canGenerate = enabled && maxOk && lyricsOk && aceOk;

  return (
    <div className="relative min-h-[calc(100vh-3.5rem)]">
      <RenderStudioAtmosphere />
      <div className="relative z-10 mx-auto w-full max-w-[min(88rem,100%)] space-y-6 px-4 sm:px-6 lg:px-8 py-4 pb-24">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/albums/${albumId}/tracks/${trackId}`}>
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Render Studio</p>
          <h1 className="font-headline text-2xl">{track.title}</h1>
        </div>
        <Badge variant="outline" className="ml-auto text-[10px]">{GENERATED_IN_APP_LABEL}</Badge>
      </div>

      {!enabled && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Song generation is not enabled for your studio yet.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(280px,1fr)] xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] items-start">
        <RenderStudioTakes albumId={albumId} trackId={trackId} refreshToken={takesRefresh} />

        <Card className="lg:sticky lg:top-4 border-white/10 bg-card/80 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music2 className="h-5 w-5 text-primary" />
            New render
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p>
            {workKind === 'instrumental'
              ? 'Full ACE-Step instrumental from your vibe rails (~4:00).'
              : 'Full ACE-Step song from this sheet’s lyrics (~4:00). Not a preview — real vocals of the bars you wrote.'}
          </p>
          {status && !aceOk && (
            <p className="text-xs text-red-200/90 rounded-md border border-red-500/35 bg-red-500/10 px-3 py-2">
              Song engine is not running. One-time install, then start the local GPU server (free — no fal.ai):
              <span className="font-code block mt-1">npm run render:install-local-ace</span>
              <span className="font-code block mt-1">npm run render:local-ace</span>
              Keep that terminal open, restart dev if needed, then Generate again.
            </p>
          )}
          <p className="text-muted-foreground">
            Charge: <strong>{inkCost} Ink</strong>
          </p>
          {!lyricsOk && workKind === 'song' && (
            <p className="text-xs text-amber-200/90 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2">
              Add more lyrics on the sheet before rendering.
            </p>
          )}
          {enabled && !maxOk && (
            <p className="text-xs text-fuchsia-200/90 rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2">
              Studio Max is required to start renders.
            </p>
          )}
          <Button disabled={!canGenerate || loading} onClick={startRender} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate another take
          </Button>
          <RenderJobLiveStatus
            jobId={jobId}
            albumId={albumId}
            trackId={trackId}
            studioAutoRender={status?.studioAutoRender}
            onRenderStudioPage
            onJobReady={bumpTakes}
          />
        </CardContent>
      </Card>
      </div>
      </div>
    </div>
  );
}
