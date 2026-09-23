'use client';

/**
 * Compact progressive checklist for guided Release Composer mode.
 * Progress persists in localStorage per album/track. Dummy-proof, mobile-safe.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Circle } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  normalizeReleaseDiscoveryMetadata,
  type ReleaseDiscoveryFormat,
  type ReleaseDiscoveryMetadata,
} from '@/lib/release-discovery';
import { isCommerceLive, normalizeDropAudio, normalizeDropPrice } from '@/lib/drop-commerce';
import type { Album, Track } from '@/lib/types';

export type GuidedChecklistStepId =
  | 'titleLyrics'
  | 'audio'
  | 'cover'
  | 'discovery'
  | 'price'
  | 'rights'
  | 'preview'
  | 'publish';

type PersistedProgress = {
  coverSkipped?: boolean;
  discoverySkipped?: boolean;
  titleMarkedReady?: boolean;
  audioTested?: boolean;
  previewTested?: boolean;
  advancedOpen?: boolean;
};

const STORAGE_PREFIX = 'b4b.guided-release.';

const STEP_COPY: Record<
  GuidedChecklistStepId,
  { label: string; hint: string; optional?: boolean }
> = {
  titleLyrics: {
    label: '1. Title',
    hint: 'Title is required. Lyrics (optional) — you can publish audio-only.',
  },
  audio: {
    label: '2. Audio + test play',
    hint: 'Upload the song, then tap play once so you know it works.',
  },
  cover: {
    label: '3. Cover art',
    hint: 'Optional. Use art from The Vault, or skip for now.',
    optional: true,
  },
  discovery: {
    label: '4. Discovery tags',
    hint: 'Optional. Format, genres, and moods help people find you.',
    optional: true,
  },
  price: {
    label: '5. Price & your cut',
    hint: 'Set what they pay. Your live net preview is under the price box.',
  },
  rights: {
    label: '6. Rights check',
    hint: 'Only publish what you have the rights to sell or share.',
  },
  preview: {
    label: '7. Preview test',
    hint: 'Play the private recording one more time before it goes live.',
  },
  publish: {
    label: '8. Publish',
    hint: 'When the checks above are green, hit Publish Release.',
  },
};

const FORMATS: { id: ReleaseDiscoveryFormat; label: string }[] = [
  { id: 'single', label: 'Single' },
  { id: 'album', label: 'Album' },
  { id: 'ep', label: 'EP' },
  { id: 'other', label: 'Other' },
];

function storageKey(albumId: string, trackId: string | null): string {
  return `${STORAGE_PREFIX}${albumId}:${trackId || 'album'}`;
}

function readProgress(albumId: string, trackId: string | null): PersistedProgress {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(storageKey(albumId, trackId));
    if (!raw) return {};
    return JSON.parse(raw) as PersistedProgress;
  } catch {
    return {};
  }
}

function writeProgress(albumId: string, trackId: string | null, next: PersistedProgress) {
  try {
    localStorage.setItem(storageKey(albumId, trackId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

function listToCsv(values: string[] | undefined): string {
  return (values || []).join(', ');
}

function csvToList(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function scrollToReleaseStep(id: GuidedChecklistStepId) {
  if (typeof document === 'undefined') return;
  document.getElementById(`release-step-${id}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
  });
}

export function GuidedReleaseChecklist({
  kind,
  album,
  track,
  rightsChecked,
  houseRelease,
  hasPrivateAudioUrl,
  onMarkAudioTested,
  onDiscoveryChange,
  onStepActivate,
  children,
  advanced,
}: {
  kind: 'song' | 'album';
  album: Album;
  track?: Track | null;
  rightsChecked: boolean;
  houseRelease: boolean;
  hasPrivateAudioUrl: boolean;
  onMarkAudioTested?: () => void;
  onDiscoveryChange: (next: ReleaseDiscoveryMetadata) => void;
  onStepActivate?: (id: GuidedChecklistStepId) => void;
  children?: React.ReactNode;
  advanced?: React.ReactNode;
}) {
  const trackId = kind === 'song' ? track?.id || null : null;
  const [progress, setProgress] = useState<PersistedProgress>(() =>
    readProgress(album.id, trackId)
  );
  const [discoveryOpen, setDiscoveryOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(() => Boolean(progress.advancedOpen));

  useEffect(() => {
    setProgress(readProgress(album.id, trackId));
  }, [album.id, trackId]);

  const persist = useCallback(
    (patch: PersistedProgress) => {
      setProgress((prev) => {
        const next = { ...prev, ...patch };
        writeProgress(album.id, trackId, next);
        return next;
      });
    },
    [album.id, trackId]
  );

  useEffect(() => {
    if (!hasPrivateAudioUrl) return;
    if (progress.audioTested && progress.previewTested) return;
    const onPlay = () => {
      persist({ audioTested: true, previewTested: true });
      onMarkAudioTested?.();
    };
    window.addEventListener('b4b:inline-audio-play', onPlay);
    return () => window.removeEventListener('b4b:inline-audio-play', onPlay);
  }, [hasPrivateAudioUrl, persist, progress.audioTested, progress.previewTested, onMarkAudioTested]);

  const title = kind === 'song' ? track?.title || '' : album.title || '';
  // Title is required; lyrics are optional for audio-first releases.
  const titleStepDone = Boolean(title.trim()) || Boolean(progress.titleMarkedReady);

  const audioMeta =
    kind === 'song'
      ? normalizeDropAudio(track?.dropAudio)
      : album.tracks.some((row) => normalizeDropAudio(row.dropAudio));
  const audioDone = Boolean(audioMeta) && Boolean(progress.audioTested);

  const coverUrl =
    kind === 'song'
      ? track?.coverArtUrl || album.coverArtUrl
      : album.coverArtUrl;
  const coverDone = Boolean(coverUrl?.trim()) || Boolean(progress.coverSkipped);

  const discoverySource =
    kind === 'song'
      ? track?.releaseDiscovery || album.releaseDiscovery
      : album.releaseDiscovery;
  const discovery = normalizeReleaseDiscoveryMetadata(discoverySource);
  const discoveryDone =
    Boolean(discovery.format || discovery.genres?.length || discovery.moods?.length) ||
    Boolean(progress.discoverySkipped);

  const price = normalizeDropPrice(kind === 'song' ? track?.dropPrice : album.dropPrice);
  const priceDone = houseRelease || isCommerceLive(price);

  const rightsDone = rightsChecked;
  const previewDone = Boolean(progress.previewTested);
  const publishReady =
    titleStepDone && audioDone && coverDone && discoveryDone && priceDone && rightsDone && previewDone;

  const done: Record<GuidedChecklistStepId, boolean> = {
    titleLyrics: titleStepDone,
    audio: audioDone,
    cover: coverDone,
    discovery: discoveryDone,
    price: priceDone,
    rights: rightsDone,
    preview: previewDone,
    publish: publishReady,
  };

  const doneCount = useMemo(
    () => Object.values(done).filter(Boolean).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      titleStepDone,
      audioDone,
      coverDone,
      discoveryDone,
      priceDone,
      rightsDone,
      previewDone,
      publishReady,
    ]
  );

  const genresCsv = listToCsv(discovery.genres);
  const moodsCsv = listToCsv(discovery.moods);
  const [genresDraft, setGenresDraft] = useState(genresCsv);
  const [moodsDraft, setMoodsDraft] = useState(moodsCsv);
  const genresFocusedRef = useRef(false);
  const moodsFocusedRef = useRef(false);

  useEffect(() => {
    if (!genresFocusedRef.current) setGenresDraft(genresCsv);
  }, [album.id, trackId, genresCsv]);

  useEffect(() => {
    if (!moodsFocusedRef.current) setMoodsDraft(moodsCsv);
  }, [album.id, trackId, moodsCsv]);

  const commitDiscovery = (patch: Partial<ReleaseDiscoveryMetadata>) => {
    const next = normalizeReleaseDiscoveryMetadata({ ...discovery, ...patch });
    onDiscoveryChange(next);
  };

  const activateStep = (id: GuidedChecklistStepId) => {
    if (id === 'discovery') setDiscoveryOpen(true);
    onStepActivate?.(id);
    window.setTimeout(() => scrollToReleaseStep(id), id === 'discovery' ? 60 : 0);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-fuchsia-400/25 bg-fuchsia-500/[0.06] p-3">
        <div className="mb-2 flex items-end justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">
              Release checklist
            </p>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Walk these in order. Optional steps can be skipped. Nothing goes live until you publish.
            </p>
          </div>
          <span className="shrink-0 font-code text-[10px] text-muted-foreground">
            {doneCount}/8
          </span>
        </div>
        <ol className="space-y-1.5">
          {(Object.keys(STEP_COPY) as GuidedChecklistStepId[]).map((id) => {
            const meta = STEP_COPY[id];
            const isDone = done[id];
            return (
              <li key={id}>
                <div
                  role="button"
                  tabIndex={0}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors hover:border-fuchsia-400/40',
                    isDone
                      ? 'border-emerald-400/30 bg-emerald-500/10'
                      : 'border-white/10 bg-black/20'
                  )}
                  onClick={() => activateStep(id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      activateStep(id);
                    }
                  }}
                >
                <span className="mt-0.5 shrink-0 text-emerald-300" aria-hidden>
                  {isDone ? <Check className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5 opacity-40" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-bold leading-tight">{meta.label}</span>
                  <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                    {meta.hint}
                  </span>
                  {id === 'cover' && !coverUrl?.trim() ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="mt-1.5 h-7 px-2 text-[9px] font-bold uppercase text-muted-foreground"
                      onClick={(event) => {
                        event.stopPropagation();
                        persist({ coverSkipped: true });
                      }}
                    >
                      Skip cover for now
                    </Button>
                  ) : null}
                  {id === 'discovery' ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-7 text-[9px] font-bold uppercase"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDiscoveryOpen((open) => !open);
                        }}
                      >
                        {discoveryOpen ? 'Hide tags' : 'Edit tags'}
                      </Button>
                      {!discoveryDone ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[9px] font-bold uppercase text-muted-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            persist({ discoverySkipped: true });
                          }}
                        >
                          Skip for now
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  {id === 'audio' && Boolean(audioMeta) && !progress.audioTested ? (
                    <p className="mt-1 text-[9px] text-amber-200/80">
                      Play the recording below once to check this off.
                    </p>
                  ) : null}
                  {id === 'preview' && Boolean(audioMeta) && !previewDone ? (
                    <p className="mt-1 text-[9px] text-amber-200/80">
                      Hit play on the private preview before publishing.
                    </p>
                  ) : null}
                </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {discoveryOpen ? (
        <div
          id="release-step-discovery"
          className="scroll-mt-4 space-y-2 rounded-xl border border-white/10 bg-black/25 p-3"
        >
          <Label className="text-[10px] font-bold uppercase tracking-widest text-fuchsia-300">
            Discovery essentials
          </Label>
          <p className="text-[10px] text-muted-foreground">
            Keep it simple — a few tags go further than a novel.
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {FORMATS.map((format) => (
              <Button
                key={format.id}
                type="button"
                size="sm"
                variant={discovery.format === format.id ? 'default' : 'outline'}
                className="h-8 text-[10px] font-bold uppercase"
                onClick={() => {
                  persist({ discoverySkipped: false });
                  commitDiscovery({ format: format.id });
                }}
              >
                {format.label}
              </Button>
            ))}
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] uppercase text-muted-foreground">Genres (comma-separated)</Label>
            <Input
              value={genresDraft}
              onChange={(e) => setGenresDraft(e.target.value)}
              onFocus={() => {
                genresFocusedRef.current = true;
              }}
              onBlur={() => {
                genresFocusedRef.current = false;
                persist({ discoverySkipped: false });
                commitDiscovery({ genres: csvToList(genresDraft) });
              }}
              placeholder="Hip-hop, R&B"
              autoComplete="off"
              className="h-9 font-code text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-[9px] uppercase text-muted-foreground">Moods (comma-separated)</Label>
            <Input
              value={moodsDraft}
              onChange={(e) => setMoodsDraft(e.target.value)}
              onFocus={() => {
                moodsFocusedRef.current = true;
              }}
              onBlur={() => {
                moodsFocusedRef.current = false;
                persist({ discoverySkipped: false });
                commitDiscovery({ moods: csvToList(moodsDraft) });
              }}
              placeholder="Late night, confident"
              autoComplete="off"
              className="h-9 font-code text-sm"
            />
          </div>
        </div>
      ) : null}

      {children}

      {advanced ? (
        <Collapsible
          open={advancedOpen}
          onOpenChange={(open) => {
            setAdvancedOpen(open);
            persist({ advancedOpen: open });
          }}
        >
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-9 w-full justify-between px-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
            >
              Advanced settings
              <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', advancedOpen && 'rotate-180')} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pt-1">{advanced}</CollapsibleContent>
        </Collapsible>
      ) : null}

      {!publishReady ? (
        <p className="text-center text-[10px] leading-relaxed text-muted-foreground">
          Finish the checklist (or skip optional steps) before publish lights up.
        </p>
      ) : null}
    </div>
  );
}

/** True when guided checklist still blocks publish. */
export function guidedPublishBlocked(input: {
  album: Album;
  track?: Track | null;
  kind: 'song' | 'album';
  rightsChecked: boolean;
  houseRelease: boolean;
  hasPrivateAudioUrl: boolean;
}): boolean {
  const trackId = input.kind === 'song' ? input.track?.id || null : null;
  const progress = readProgress(input.album.id, trackId);
  const title =
    input.kind === 'song' ? input.track?.title || '' : input.album.title || '';
  if (!title.trim()) return true;
  const audioOk =
    input.kind === 'song'
      ? Boolean(normalizeDropAudio(input.track?.dropAudio))
      : input.album.tracks.some((row) => normalizeDropAudio(row.dropAudio));
  if (!audioOk) return true;
  const coverUrl =
    input.kind === 'song'
      ? input.track?.coverArtUrl || input.album.coverArtUrl
      : input.album.coverArtUrl;
  if (!coverUrl?.trim() && !progress.coverSkipped) return true;
  const discovery = normalizeReleaseDiscoveryMetadata(
    input.kind === 'song'
      ? input.track?.releaseDiscovery || input.album.releaseDiscovery
      : input.album.releaseDiscovery
  );
  const discoveryOk =
    Boolean(discovery.format || discovery.genres?.length || discovery.moods?.length) ||
    Boolean(progress.discoverySkipped);
  if (!discoveryOk) return true;
  if (!input.houseRelease) {
    const price = normalizeDropPrice(
      input.kind === 'song' ? input.track?.dropPrice : input.album.dropPrice
    );
    if (!isCommerceLive(price)) return true;
  }
  if (!input.rightsChecked) return true;
  if (!progress.previewTested || !progress.audioTested) return true;
  return false;
}
