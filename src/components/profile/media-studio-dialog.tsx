'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, FlipHorizontal, ImagePlus, Music2, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MEDIA_ASPECTS, MEDIA_FILTERS, mediaFilterCss, type MediaAspectId } from '@/lib/profile/media-filters';
import {
  fetchStudioLibraryTracks,
  resolveStudioTrackUrl,
} from '@/lib/profile/media-studio-music';
import {
  applyStillFilter,
  inspectImageFile,
  inspectVideoFile,
  pickRecorderMimeType,
  renderStudioClip,
  type StudioSource,
} from '@/lib/profile/media-studio-render';
import { IMAGE_TO_VIDEO_SECONDS, WALL_CLIP_MAX_SECONDS, type PendingWallClip } from '@/lib/profile/wall-clips';
import type { PendingPostImage } from '@/lib/profile/post-images';
import type { DeckPlayable } from '@/lib/drop-library';
import { cn } from '@/lib/utils';

export type MediaStudioMode = 'camera' | 'library';

type MediaStudioDialogProps = {
  open: boolean;
  mode: MediaStudioMode;
  onOpenChange: (open: boolean) => void;
  onExportImage: (image: PendingPostImage) => void;
  onExportClip: (clip: PendingWallClip) => void;
  onError?: (message: string) => void;
};

type MusicPick =
  | { kind: 'library'; label: string; shareId: string; trackId?: string }
  | { kind: 'device'; label: string; url: string };

function revokeUrl(url: string | undefined) {
  if (!url?.startsWith('blob:')) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

async function openCamera(facing: 'user' | 'environment'): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
  } catch {
    return navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  }
}

function formatSec(value: number): string {
  const s = Math.max(0, Math.floor(value));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function MediaStudioDialog({
  open,
  mode,
  onOpenChange,
  onExportImage,
  onExportClip,
  onError,
}: MediaStudioDialogProps) {
  const liveRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordTimerRef = useRef<number | null>(null);

  const [step, setStep] = useState<'capture' | 'edit'>('capture');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [liveReady, setLiveReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [source, setSource] = useState<StudioSource | null>(null);
  const [filterId, setFilterId] = useState('none');
  const [aspect, setAspect] = useState<MediaAspectId>('original');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(WALL_CLIP_MAX_SECONDS);
  const [music, setMusic] = useState<MusicPick | null>(null);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicTab, setMusicTab] = useState<'library' | 'mine' | 'device'>('library');
  const [tracks, setTracks] = useState<{ library: DeckPlayable[]; mine: DeckPlayable[] }>({
    library: [],
    mine: [],
  });
  const [tracksBusy, setTracksBusy] = useState(false);
  const [trackQuery, setTrackQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [camError, setCamError] = useState<string | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setLiveReady(false);
  };

  const stopRecorder = () => {
    if (recordTimerRef.current) {
      window.clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    setRecording(false);
    setRecordSec(0);
  };

  const reset = () => {
    stopRecorder();
    stopCamera();
    if (source) revokeUrl(source.url);
    if (music?.kind === 'device') revokeUrl(music.url);
    setSource(null);
    setStep('capture');
    setFilterId('none');
    setAspect('original');
    setTrimStart(0);
    setTrimEnd(WALL_CLIP_MAX_SECONDS);
    setMusic(null);
    setMusicOpen(false);
    setExporting(false);
    setProgress(0);
    setCamError(null);
  };

  const applySource = (next: StudioSource) => {
    if (source) revokeUrl(source.url);
    setSource(next);
    setTrimStart(0);
    setTrimEnd(next.kind === 'video' ? next.durationSec : WALL_CLIP_MAX_SECONDS);
    setStep('edit');
    stopCamera();
  };

  const startCamera = async (nextFacing = facing) => {
    setCamError(null);
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('This browser cannot open a camera.');
      return;
    }
    try {
      const stream = await openCamera(nextFacing);
      streamRef.current = stream;
      const el = liveRef.current;
      if (el) {
        el.srcObject = stream;
        await el.play().catch(() => undefined);
      }
      setLiveReady(true);
    } catch {
      setCamError('Allow camera and mic to take a photo or clip.');
    }
  };

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    setStep('capture');
    if (mode === 'camera') void startCamera();
    if (mode === 'library') {
      window.setTimeout(() => fileRef.current?.click(), 80);
    }
    return () => {
      stopRecorder();
      stopCamera();
    };
    // Reset only when the dialog opens or the entry mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode]);

  useEffect(() => {
    if (!open || !musicOpen || tracks.library.length || tracksBusy) return;
    setTracksBusy(true);
    void fetchStudioLibraryTracks()
      .then(setTracks)
      .catch((err) => onError?.(err instanceof Error ? err.message : 'Could not open your library.'))
      .finally(() => setTracksBusy(false));
  }, [open, musicOpen, tracks.library.length, tracksBusy, onError]);

  const takePhoto = async () => {
    const el = liveRef.current;
    if (!el || !el.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = el.videoWidth;
    canvas.height = el.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(el, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) return;
    try {
      applySource(await inspectImageFile(blob));
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not keep that photo.');
    }
  };

  const startRecording = () => {
    const stream = streamRef.current;
    if (!stream || recording) return;
    const mime = pickRecorderMimeType();
    if (!mime) {
      onError?.('This browser cannot record video. Try Chrome or Safari.');
      return;
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mime.split(';')[0] });
      void inspectVideoFile(blob)
        .then(applySource)
        .catch((err) => onError?.(err instanceof Error ? err.message : 'Could not keep that clip.'));
    };
    recorderRef.current = recorder;
    recorder.start(200);
    setRecording(true);
    setRecordSec(0);
    recordTimerRef.current = window.setInterval(() => {
      setRecordSec((prev) => {
        const next = prev + 1;
        if (next >= WALL_CLIP_MAX_SECONDS) {
          stopRecorder();
          return WALL_CLIP_MAX_SECONDS;
        }
        return next;
      });
    }, 1000);
  };

  const pickFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      applySource(file.type.startsWith('video/') ? await inspectVideoFile(file) : await inspectImageFile(file));
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not open that file.');
    }
  };

  const pickDeviceMusic = (file: File | undefined) => {
    if (!file || !file.type.startsWith('audio/')) return;
    if (music?.kind === 'device') revokeUrl(music.url);
    setMusic({ kind: 'device', label: file.name, url: URL.createObjectURL(file) });
    setMusicOpen(false);
  };

  const exportMedia = async () => {
    if (!source || exporting) return;
    setExporting(true);
    setProgress(4);
    try {
      const musicUrl =
        music?.kind === 'device'
          ? music.url
          : music?.kind === 'library'
            ? await resolveStudioTrackUrl(music.shareId, music.trackId)
            : undefined;
      if (source.kind === 'image' && !musicUrl) {
        onExportImage(await applyStillFilter(source.url, filterId, aspect));
      } else {
        onExportClip(
          await renderStudioClip({
            source,
            filterId,
            aspect,
            trimStart: source.kind === 'video' ? trimStart : undefined,
            trimEnd: source.kind === 'video' ? trimEnd : undefined,
            musicUrl,
            onProgress: setProgress,
          })
        );
      }
      onOpenChange(false);
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Could not export that clip.');
    } finally {
      setExporting(false);
      setProgress(0);
    }
  };

  const visibleTracks = (musicTab === 'mine' ? tracks.mine : tracks.library).filter((item) => {
    if (!trackQuery.trim()) return true;
    const q = trackQuery.trim().toLowerCase();
    return item.title.toLowerCase().includes(q) || item.artistName.toLowerCase().includes(q);
  });

  const previewRatio = MEDIA_ASPECTS.find((item) => item.id === aspect)?.ratio;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && exporting) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        hideClose={exporting}
        className="max-h-[92dvh] w-[min(100vw,28rem)] overflow-y-auto border-white/10 bg-[#0b0f14] p-4 text-white sm:rounded-2xl"
      >
        <DialogHeader>
          <DialogTitle className="text-sm font-bold uppercase tracking-widest text-cyan-200">
            {step === 'edit' ? 'Edit clip' : 'Camera'}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/55">
            Take a photo or clip, crop it, add a filter, and layer music from your library or device.
          </DialogDescription>
        </DialogHeader>

        {step === 'capture' ? (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl bg-black">
              <video
                ref={liveRef}
                muted
                playsInline
                autoPlay
                className={cn('aspect-[3/4] w-full object-cover', !liveReady && 'opacity-40')}
              />
              {recording ? (
                <p className="absolute left-2 top-2 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                  Rec {formatSec(recordSec)}
                </p>
              ) : null}
            </div>
            {camError ? <p className="text-xs text-rose-300">{camError}</p> : null}
            <div className="flex items-center justify-center gap-2">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-10 w-10 text-cyan-200"
                onClick={() => {
                  const next = facing === 'user' ? 'environment' : 'user';
                  setFacing(next);
                  void startCamera(next);
                }}
                title="Flip camera"
              >
                <FlipHorizontal className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                className="h-14 w-14 rounded-full bg-white text-black hover:bg-cyan-100"
                disabled={!liveReady || recording}
                onClick={() => void takePhoto()}
                title="Take photo"
              >
                <Camera className="h-6 w-6" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className={cn('h-10 w-10', recording ? 'text-red-400' : 'text-fuchsia-300')}
                disabled={!liveReady && !recording}
                onClick={() => (recording ? stopRecorder() : startRecording())}
                title={recording ? 'Stop clip' : 'Record clip'}
              >
                {recording ? <Square className="h-4 w-4" /> : <span className="h-3.5 w-3.5 rounded-full bg-red-500" />}
              </Button>
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/70"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="h-3.5 w-3.5" /> Library
              </Button>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Photo or {WALL_CLIP_MAX_SECONDS}s clip</p>
            </div>
          </div>
        ) : source ? (
          <div className="space-y-3">
            <div
              className="mx-auto overflow-hidden rounded-xl bg-black"
              style={previewRatio ? { aspectRatio: String(previewRatio), maxHeight: '42dvh' } : undefined}
            >
              {source.kind === 'video' ? (
                <video
                  src={source.url}
                  muted
                  playsInline
                  autoPlay
                  loop
                  className="h-full max-h-[42dvh] w-full object-cover"
                  style={{ filter: mediaFilterCss(filterId) }}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={source.url}
                  alt="Preview"
                  className="h-full max-h-[42dvh] w-full object-cover"
                  style={{ filter: mediaFilterCss(filterId) }}
                />
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {MEDIA_ASPECTS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setAspect(item.id)}
                  className={cn(
                    'rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest',
                    aspect === item.id ? 'bg-cyan-400/20 text-cyan-200' : 'bg-white/5 text-white/55'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {source.kind === 'video' ? (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                  Crop {formatSec(trimStart)}–{formatSec(trimEnd)}
                </p>
                <input
                  type="range"
                  min={0}
                  max={source.durationSec}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setTrimStart(Math.min(next, trimEnd - 0.6));
                  }}
                  className="w-full accent-cyan-300"
                />
                <input
                  type="range"
                  min={0}
                  max={source.durationSec}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setTrimEnd(Math.max(next, trimStart + 0.6));
                  }}
                  className="w-full accent-fuchsia-300"
                />
              </div>
            ) : (
              <p className="text-[10px] uppercase tracking-widest text-white/40">
                Add music to turn this photo into a {IMAGE_TO_VIDEO_SECONDS}-second clip.
              </p>
            )}

            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {MEDIA_FILTERS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setFilterId(item.id)}
                  className={cn(
                    'shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-widest',
                    filterId === item.id ? 'bg-fuchsia-400/20 text-fuchsia-200' : 'bg-white/5 text-white/55'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 text-[10px] font-bold uppercase tracking-widest text-fuchsia-200"
                onClick={() => setMusicOpen((value) => !value)}
              >
                <Music2 className="h-3.5 w-3.5" />
                {music ? music.label.slice(0, 22) : 'Add music'}
              </Button>
              {music ? (
                <button
                  type="button"
                  className="text-[10px] uppercase tracking-widest text-white/45 hover:text-rose-300"
                  onClick={() => {
                    if (music.kind === 'device') revokeUrl(music.url);
                    setMusic(null);
                  }}
                >
                  <Trash2 className="mr-1 inline h-3 w-3" />
                  Clear
                </button>
              ) : null}
            </div>

            {musicOpen ? (
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/40 p-2">
                <div className="flex gap-1">
                  {(['library', 'mine', 'device'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setMusicTab(tab)}
                      className={cn(
                        'rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-widest',
                        musicTab === tab ? 'bg-cyan-400/20 text-cyan-200' : 'text-white/45'
                      )}
                    >
                      {tab === 'mine' ? 'Released' : tab === 'device' ? 'Device' : 'Library'}
                    </button>
                  ))}
                </div>
                {musicTab === 'device' ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 text-[10px] font-bold uppercase tracking-widest"
                    onClick={() => audioRef.current?.click()}
                  >
                    Choose audio file
                  </Button>
                ) : (
                  <>
                    <input
                      value={trackQuery}
                      onChange={(e) => setTrackQuery(e.target.value)}
                      placeholder="Search songs…"
                      className="h-8 w-full rounded-md border border-white/10 bg-black/40 px-2 text-xs"
                    />
                    <div className="max-h-36 space-y-1 overflow-y-auto">
                      {tracksBusy ? (
                        <p className="text-xs text-white/45">Opening library…</p>
                      ) : visibleTracks.length === 0 ? (
                        <p className="text-xs text-white/45">
                          {musicTab === 'mine' ? 'No released songs yet.' : 'Nothing in your library yet.'}
                        </p>
                      ) : (
                        visibleTracks.slice(0, 40).map((item) => (
                          <button
                            key={item.key}
                            type="button"
                            className="block w-full truncate rounded-md px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/10"
                            onClick={() => {
                              setMusic({
                                kind: 'library',
                                label: item.title,
                                shareId: item.shareId,
                                trackId: item.trackId,
                              });
                              setMusicOpen(false);
                            }}
                          >
                            {item.title}
                            <span className="ml-1 text-white/40">{item.artistName}</span>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={exporting}
                className="h-8 text-[10px] font-bold uppercase tracking-widest text-white/60"
                onClick={() => {
                  if (source) revokeUrl(source.url);
                  setSource(null);
                  setStep('capture');
                  if (mode === 'camera') void startCamera();
                }}
              >
                Retake
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={exporting}
                className="h-8 px-4 font-bold uppercase"
                onClick={() => void exportMedia()}
              >
                {exporting ? `Export ${Math.round(progress)}%` : source.kind === 'image' && !music ? 'Use photo' : 'Use clip'}
              </Button>
            </div>
          </div>
        ) : null}

        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            void pickFile(file);
          }}
        />
        <input
          ref={audioRef}
          type="file"
          accept="audio/*"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            pickDeviceMusic(file);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
