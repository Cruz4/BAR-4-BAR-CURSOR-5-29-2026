'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BrainCircuit,
  Dna,
  Loader2,
  Music2,
  Palette,
  Shield,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useSongGenerationWorkbenchLive } from '@/hooks/use-song-generation-live';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/client/firebase';
import type { Album, StyleProfile, Track } from '@/lib/types';
import {
  isGuardrailsActive,
  isIntentsActive,
  isStyleActive,
  isTrackDnaActive,
  isVibeActive,
  isInheritFromAlbumOn,
} from '@/lib/co-writer-rules';
import {
  compileSongRenderRecipe,
  minimumLyricsForSongRender,
} from '@/lib/song-generation/prompt-compiler';
import { computeFullRenderInkCost } from '@/lib/song-generation/costs';
import { isStudioMaxUser } from '@/lib/subscription-products';
import { GENERATED_IN_APP_LABEL } from '@/lib/song-generation/provenance';
import { buildStudioMaxCheckoutPath } from '@/lib/checkout-intent';
import { cn } from '@/lib/utils';
import { RenderJobLiveStatus } from '@/components/render/render-job-live-status';
import { rememberRenderJobForTrack } from '@/lib/render-track-job-storage';

function RailChip({
  label,
  active,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide',
        active
          ? 'border-violet-400/40 bg-violet-500/15 text-violet-100'
          : 'border-white/10 bg-muted/30 text-muted-foreground'
      )}
    >
      <Icon className="h-2.5 w-2.5 shrink-0" />
      {label}
      <span className="font-code normal-case text-[8px]">{active ? 'on' : 'off'}</span>
    </span>
  );
}

/** Song render controls — lives in the Co-Writer toggles column with Vibe, DNA, etc. */
export function GenerateSongCoWriterPanel({
  active,
  track,
  album,
  styleProfile,
  onGuestLocked,
}: {
  active: boolean;
  track: Track;
  album: Album;
  styleProfile: StyleProfile | null;
  onGuestLocked?: () => void;
}) {
  const { user } = useAuth();
  const workbenchLive = useSongGenerationWorkbenchLive();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [studioAutoRender, setStudioAutoRender] = useState(false);
  const [aceConfigured, setAceConfigured] = useState(true);

  const surfaceOn = workbenchLive;
  const maxOk = isStudioMaxUser(user);
  const inkCost = computeFullRenderInkCost(240);

  const lyricLineCount = useMemo(
    () =>
      track.sections.reduce((acc, s) => acc + s.bars.filter((b) => b.text?.trim()).length, 0),
    [track.sections]
  );

  const rails = useMemo(
    () => ({
      vibe: isVibeActive(track),
      styleDna: isStyleActive(track),
      dna:
        isTrackDnaActive(track) ||
        (isInheritFromAlbumOn(track, album) && Boolean(album.direction?.enabled)),
      intents: isIntentsActive(track),
      guardrails: isGuardrailsActive(track),
    }),
    [track, album]
  );

  const railsLit = Object.values(rails).some(Boolean);

  const recipePreview = useMemo(() => {
    if (!minimumLyricsForSongRender(track)) return null;
    try {
      return compileSongRenderRecipe({
        track,
        album,
        styleProfile,
        durationSec: 240,
      });
    } catch {
      return null;
    }
  }, [track, album, styleProfile]);

  const authHeaders = useCallback(async (): Promise<HeadersInit | null> => {
    const current = auth.currentUser;
    if (!current) return null;
    const token = await current.getIdToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }, [user?.id]);

  useEffect(() => {
    if (!active || !user) return;
    let cancelled = false;
    void (async () => {
      try {
        const headers = await authHeaders();
        if (!headers || cancelled) return;
        const res = await fetch('/api/render/status', { headers });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) {
          setStudioAutoRender(Boolean(data.studioAutoRender));
          setAceConfigured(data.aceConfigured !== false);
        }
      } catch {
        if (!cancelled) setStudioAutoRender(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, user, authHeaders]);

  const startRender = async () => {
    if (onGuestLocked) {
      onGuestLocked();
      return;
    }
    setLoading(true);
    try {
      const headers = await authHeaders();
      if (!headers) {
        throw new Error('Sign in again to generate a song.');
      }

      const res = await fetch('/api/render/jobs', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          albumId: track.albumId,
          trackId: track.id,
          route: 'local',
          workKind: 'song',
          durationSec: 240,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not start render');
      const id = data.job.id as string;
      rememberRenderJobForTrack(track.albumId, track.id, id);
      setJobId(id);
      toast({
        title: 'Generating full song',
        description: 'ACE-Step is singing this sheet’s lyrics. Usually 2–4 minutes — not a preview.',
      });
    } catch (e) {
      const raw = e instanceof Error ? e.message : 'Could not start render';
      const message =
        raw === 'Failed to fetch'
          ? 'Could not reach the server. Check your connection and try again.'
          : raw;
      toast({ variant: 'destructive', title: 'Generate failed', description: message });
    } finally {
      setLoading(false);
    }
  };

  const canGenerate =
    surfaceOn && maxOk && minimumLyricsForSongRender(track) && recipePreview && aceConfigured;

  return (
    <div className="space-y-3 px-4 pb-4 font-code" data-tour="generate-song-sheet">
      <p className="text-[10px] leading-snug text-muted-foreground">
        Generate is the <strong className="text-foreground/90">full song</strong> — ACE-Step sings{' '}
        <strong className="text-foreground/90">this sheet&apos;s lyrics</strong> with whichever rails are{' '}
        <strong className="text-violet-200/90">on</strong> (Vibe, Style DNA, DNA, Intents, Guardrails).
        About 4 minutes. One tap.
      </p>

      <div className="flex flex-wrap gap-1.5">
        <RailChip label="Vibe" active={rails.vibe} icon={Palette} />
        <RailChip label="Style" active={rails.styleDna} icon={BrainCircuit} />
        <RailChip label="DNA" active={rails.dna} icon={Dna} />
        <RailChip label="Intents" active={rails.intents} icon={Target} />
        <RailChip label="Guard" active={rails.guardrails} icon={Shield} />
      </div>

      <p className="text-[10px] text-muted-foreground">
        {lyricLineCount} lyric line{lyricLineCount === 1 ? '' : 's'}
        {!minimumLyricsForSongRender(track)
          ? ' — add more bars (about a verse) before generating.'
          : railsLit
            ? ' · rails active'
            : ' · turn rails on above to shape the render'}
      </p>

      {surfaceOn && !aceConfigured && (
        <p className="rounded-md border border-red-500/35 bg-red-500/10 px-2.5 py-2 text-[10px] text-red-100/90 leading-snug">
          Song engine is not running. One-time{' '}
          <span className="font-code">npm run render:install-local-ace</span>, then{' '}
          <span className="font-code">npm run render:local-ace</span> in another terminal (free local
          GPU). Restart dev if needed, then Generate again.
        </p>
      )}
      {!surfaceOn && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-[10px] text-amber-100/90 leading-snug">
          Song generation is off for this studio. Admin → Product Surfaces →{' '}
          <strong className="text-amber-50">Song generation</strong> (beta or on).
        </p>
      )}
      {surfaceOn && !maxOk && (
        <div className="rounded-md border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-2 text-[10px] text-fuchsia-100/90 leading-snug space-y-2">
          <p>
            <strong className="text-fuchsia-50">Studio Max</strong> unlocks sheet-to-song rendering. Pro
            Writer keeps lyrics + Generation Workstation.
          </p>
          <Button variant="outline" size="sm" className="h-7 text-[9px] font-bold uppercase w-full" asChild>
            <Link href={buildStudioMaxCheckoutPath(false)}>View Studio Max</Link>
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[10px] text-muted-foreground">
        <strong>{inkCost} Ink</strong>
        <span>· ~4:00 studio render</span>
        <Badge variant="outline" className="text-[8px] px-1.5 py-0">{GENERATED_IN_APP_LABEL}</Badge>
      </div>

      <RenderJobLiveStatus
        jobId={jobId}
        albumId={track.albumId}
        trackId={track.id}
        studioAutoRender={studioAutoRender}
      />

      <Button
        className="w-full h-10 font-bold uppercase tracking-wider text-[10px]"
        disabled={!canGenerate || loading}
        onClick={() => void startRender()}
      >
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Music2 className="mr-2 h-4 w-4" />}
        Generate from sheet
      </Button>

      <Button variant="ghost" size="sm" className="w-full h-8 text-[9px]" asChild>
        <Link href={`/albums/${track.albumId}/tracks/${track.id}/render`}>
          Render Studio — takes & history
        </Link>
      </Button>
    </div>
  );
}
