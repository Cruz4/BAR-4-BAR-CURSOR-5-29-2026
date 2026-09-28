'use client';

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Camera, FlipHorizontal, ImagePlus, Loader, Maximize2, Music2, Pause, Play, Square, Trash2, Volume2, VolumeX, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MEDIA_FILTERS, mediaFilterCss } from '@/lib/profile/media-filters';
import {
  fetchStudioLibraryTracks,
  resolveStudioTrackUrl,
} from '@/lib/profile/media-studio-music';
import {
  applyStillFilter,
  inspectAudioDuration,
  inspectImageFile,
  inspectVideoFile,
  pickRecorderMimeType,
  renderStudioClip,
  type StudioSource,
} from '@/lib/profile/media-studio-render';
import { IMAGE_TO_VIDEO_SECONDS, WALL_CLIP_MAX_SECONDS, type PendingWallClip } from '@/lib/profile/wall-clips';
import type { PendingPostImage } from '@/lib/profile/post-images';
import type { DeckPlayable } from '@/lib/drop-library';
import { ProfileMediaLightbox } from '@/components/profile/profile-media-lightbox';
import { cn } from '@/lib/utils';

export type MediaStudioMode = 'camera' | 'library';

type MediaStudioDialogProps = {
  open: boolean;
  mode: MediaStudioMode;
  /** When set, import this file straight into edit — no camera or file picker. */
  initialFile?: File | null;
  onOpenChange: (open: boolean) => void;
  onExportImage: (image: PendingPostImage) => void;
  onExportClip: (clip: PendingWallClip) => void;
  onError?: (message: string) => void;
};

type MusicPick =
  | { kind: 'library'; label: string; shareId: string; trackId?: string; durationSec?: number }
  | { kind: 'device'; label: string; url: string; durationSec?: number };

function revokeUrl(url: string | undefined) {
  if (!url?.startsWith('blob:')) return;
  try {
    URL.revokeObjectURL(url);
  } catch {
    /* ignore */
  }
}

function cameraErrorMessage(err: unknown): string {
  const name = err instanceof DOMException ? err.name : '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera is blocked. Allow camera in the browser address bar, then try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera found. Use Library to pick a photo or clip.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera is busy in another app. Close it and try again.';
  }
  if (name === 'SecurityError') {
    return 'This page is not allowed to use the camera.';
  }
  return 'Could not open the camera. Use Library to pick a photo or clip.';
}

async function openCamera(facing: 'user' | 'environment'): Promise<MediaStream> {
  const attempts: MediaStreamConstraints[] = [
    {
      video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    },
    { video: { facingMode: { ideal: facing } }, audio: false },
    { video: true, audio: false },
    { video: { facingMode: { ideal: facing } }, audio: true },
    { video: true, audio: true },
  ];
  let last: unknown;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      last = err;
    }
  }
  throw last instanceof Error ? last : new Error('Could not open the camera.');
}

let primedCamera: Promise<MediaStream> | null = null;

/** Start getUserMedia in the same user-gesture turn as the Camera button. */
export function primePostCamera(facing: 'user' | 'environment' = 'user') {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) return;
  primedCamera = openCamera(facing).catch((err) => {
    primedCamera = null;
    throw err;
  });
}

function takePrimedCamera(): Promise<MediaStream> | null {
  const next = primedCamera;
  primedCamera = null;
  return next;
}

function formatSec(value: number): string {
  const s = Math.max(0, Math.floor(value));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

export function MediaStudioDialog({
  open,
  mode,
  initialFile = null,
  onOpenChange,
  onExportImage,
  onExportClip,
  onError,
}: MediaStudioDialogProps) {
  const liveRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
  const editVideoRef = useRef<HTMLVideoElement>(null);
  const [clipPreviewPlaying, setClipPreviewPlaying] = useState(false);
  const reviewAudioRef = useRef<HTMLAudioElement>(null);
  const inlineAudioRef = useRef<HTMLAudioElement>(null);
  const segmentPreviewEndRef = useRef(0);

  const [step, setStep] = useState<'capture' | 'edit'>('capture');
  const [facing, setFacing] = useState<'user' | 'environment'>('user');
  const [liveReady, setLiveReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSec, setRecordSec] = useState(0);
  const [source, setSource] = useState<StudioSource | null>(null);
  const [filterId, setFilterId] = useState('none');
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(WALL_CLIP_MAX_SECONDS);
  const [music, setMusic] = useState<MusicPick | null>(null);
  const [musicDuration, setMusicDuration] = useState(0);
  const [musicStart, setMusicStart] = useState(0);
  const [musicVol, setMusicVol] = useState(0.72);
  const [musicMuted, setMusicMuted] = useState(false);
  const [videoVol, setVideoVol] = useState(1);
  const [videoMuted, setVideoMuted] = useState(false);
  const [musicOpen, setMusicOpen] = useState(false);
  const [musicTab, setMusicTab] = useState<'library' | 'mine' | 'device'>('library');
  const [tracks, setTracks] = useState<{ library: DeckPlayable[]; mine: DeckPlayable[] }>({
    library: [],
    mine: [],
  });
  const [tracksBusy, setTracksBusy] = useState(false);
  const [trackQuery, setTrackQuery] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewMusicUrl, setReviewMusicUrl] = useState<string | undefined>();
  const [exporting, setExporting] = useState(false);
  const [, setProgress] = useState(0);
  const [camError, setCamError] = useState<string | null>(null);
  const [inlinePreviewKey, setInlinePreviewKey] = useState<string | null>(null);
  const [inlinePreviewPlaying, setInlinePreviewPlaying] = useState(false);
  const [inlinePreviewLoading, setInlinePreviewLoading] = useState(false);
  const [segmentPreviewPlaying, setSegmentPreviewPlaying] = useState(false);
  const [segmentPreviewLoading, setSegmentPreviewLoading] = useState(false);
  const [importingFile, setImportingFile] = useState(false);

  const stopInlinePreview = useCallback(() => {
    const audio = inlineAudioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.onended = null;
      audio.ontimeupdate = null;
    }
    setInlinePreviewKey(null);
    setInlinePreviewPlaying(false);
    setInlinePreviewLoading(false);
    setSegmentPreviewPlaying(false);
    setSegmentPreviewLoading(false);
    segmentPreviewEndRef.current = 0;
  }, []);

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
    setTrimStart(0);
    setTrimEnd(WALL_CLIP_MAX_SECONDS);
    setMusic(null);
    setMusicDuration(0);
    setMusicStart(0);
    setMusicVol(0.72);
    setMusicMuted(false);
    setVideoVol(1);
    setVideoMuted(false);
    setMusicOpen(false);
    setReviewOpen(false);
    setReviewMusicUrl(undefined);
    stopInlinePreview();
    setExporting(false);
    setProgress(0);
    setCamError(null);
    setImportingFile(false);
  };

  const openReview = () => {
    setReviewOpen(true);
    if (!music) {
      setReviewMusicUrl(undefined);
      return;
    }
    if (music.kind === 'device') {
      setReviewMusicUrl(music.url);
      return;
    }
    void resolveStudioTrackUrl(music.shareId, music.trackId)
      .then(setReviewMusicUrl)
      .catch(() => setReviewMusicUrl(undefined));
  };

  const applySource = (next: StudioSource) => {
    if (source) revokeUrl(source.url);
    setSource(next);
    setTrimStart(0);
    setTrimEnd(
      next.kind === 'video' ? Math.min(WALL_CLIP_MAX_SECONDS, next.durationSec) : WALL_CLIP_MAX_SECONDS
    );
    setStep('edit');
    stopCamera();
  };

  const startCamera = async (nextFacing = facing) => {
    setCamError(null);
    setLiveReady(false);
    stopCamera();
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamError('This browser cannot open a camera.');
      return;
    }
    try {
      const primed = nextFacing === facing ? takePrimedCamera() : null;
      const stream = primed ? await primed : await openCamera(nextFacing);
      streamRef.current = stream;
      const el = liveRef.current;
      if (el) {
        el.srcObject = stream;
        el.muted = true;
        el.setAttribute('playsinline', 'true');
        await el.play();
        setLiveReady(true);
      }
    } catch (err) {
      setCamError(cameraErrorMessage(err));
    }
  };

  useLayoutEffect(() => {
    if (!open || step !== 'capture') return;
    let cancelled = false;
    let frames = 0;
    const tryAttach = () => {
      if (cancelled) return;
      const el = liveRef.current;
      const stream = streamRef.current;
      if (!el || !stream) {
        if (frames++ < 120) requestAnimationFrame(tryAttach);
        return;
      }
      if (el.srcObject !== stream) {
        el.srcObject = stream;
        el.muted = true;
        el.setAttribute('playsinline', 'true');
        void el.play()
          .then(() => {
            if (!cancelled) setLiveReady(true);
          })
          .catch((err) => {
            if (!cancelled) setCamError(cameraErrorMessage(err));
          });
      }
    };
    tryAttach();
    return () => {
      cancelled = true;
    };
  }, [open, step]);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }
    if (initialFile) {
      setImportingFile(true);
      void pickFile(initialFile)
        .catch(() => undefined)
        .finally(() => setImportingFile(false));
      return;
    }
    setStep('capture');
    if (mode === 'camera') void startCamera();
    let libraryTimer: number | null = null;
    if (mode === 'library') {
      libraryTimer = window.setTimeout(() => fileRef.current?.click(), 80);
    }
    return () => {
      if (libraryTimer) window.clearTimeout(libraryTimer);
    };
    // Reset only when the dialog opens or the entry mode changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, initialFile]);

  useEffect(() => {
    if (!open || !musicOpen || tracks.library.length || tracksBusy) return;
    setTracksBusy(true);
    void fetchStudioLibraryTracks()
      .then(setTracks)
      .catch((err) => onError?.(err instanceof Error ? err.message : 'Could not open your library.'))
      .finally(() => setTracksBusy(false));
  }, [open, musicOpen, tracks.library.length, tracksBusy, onError]);

  useEffect(() => {
    if (musicDuration <= 0) return;
    const windowSec =
      source?.kind === 'video'
        ? Math.max(0.6, Math.min(WALL_CLIP_MAX_SECONDS, trimEnd - trimStart))
        : IMAGE_TO_VIDEO_SECONDS;
    setMusicStart((prev) => Math.min(prev, Math.max(0, musicDuration - windowSec)));
  }, [musicDuration, source?.kind, trimStart, trimEnd]);

  useEffect(() => {
    if (!reviewOpen) return;
    const video = reviewVideoRef.current;
    if (video && source?.kind === 'video') {
      video.currentTime = trimStart;
      video.volume = videoMuted ? 0 : videoVol;
      void video.play().catch(() => undefined);
    }
    const audio = reviewAudioRef.current;
    if (audio && reviewMusicUrl) {
      audio.currentTime = musicStart;
      audio.volume = musicMuted ? 0 : musicVol;
      void audio.play().catch(() => undefined);
    }
    return () => {
      video?.pause();
      audio?.pause();
    };
  }, [reviewOpen, reviewMusicUrl, source?.kind, trimStart, musicStart, videoVol, videoMuted, musicVol, musicMuted]);

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
      if (initialFile) onOpenChange(false);
    }
  };

  const applyMusicPick = (next: MusicPick, previewUrl?: string) => {
    stopInlinePreview();
    if (music?.kind === 'device') revokeUrl(music.url);
    setMusic(next);
    setMusicStart(0);
    setMusicMuted(false);
    setMusicVol(0.72);
    setMusicOpen(false);
    const known = next.durationSec && next.durationSec > 0 ? next.durationSec : 0;
    setMusicDuration(known);
    if (!known && previewUrl) {
      void inspectAudioDuration(previewUrl).then((sec) => {
        if (sec > 0) setMusicDuration(sec);
      });
    } else if (!known && next.kind === 'library') {
      void resolveStudioTrackUrl(next.shareId, next.trackId)
        .then(inspectAudioDuration)
        .then((sec) => {
          if (sec > 0) setMusicDuration(sec);
        })
        .catch(() => undefined);
    }
  };

  const pickDeviceMusic = (file: File | undefined) => {
    if (!file || !file.type.startsWith('audio/')) return;
    const url = URL.createObjectURL(file);
    applyMusicPick({ kind: 'device', label: file.name, url }, url);
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
        onExportImage(await applyStillFilter(source.url, filterId, 'original'));
      } else {
        onExportClip(
          await renderStudioClip({
            source,
            filterId,
            aspect: 'original',
            trimStart: source.kind === 'video' ? trimStart : undefined,
            trimEnd: source.kind === 'video' ? trimEnd : undefined,
            musicUrl,
            musicOffsetSec: musicStart,
            musicGain: musicMuted ? 0 : musicVol,
            videoGain: source.kind === 'video' ? (videoMuted ? 0 : videoVol) : 0,
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

  const clipDuration = source
    ? source.kind === 'video'
      ? Math.max(0.6, Math.min(WALL_CLIP_MAX_SECONDS, trimEnd - trimStart))
      : IMAGE_TO_VIDEO_SECONDS
    : IMAGE_TO_VIDEO_SECONDS;
  const maxMusicStart = Math.max(0, musicDuration - clipDuration);

  const previewPickerTrack = useCallback(async (item: DeckPlayable) => {
    if (inlinePreviewKey === item.key && inlinePreviewPlaying) {
      stopInlinePreview();
      return;
    }
    stopInlinePreview();
    setInlinePreviewLoading(true);
    setInlinePreviewKey(item.key);
    try {
      const url = await resolveStudioTrackUrl(item.shareId, item.trackId);
      const audio = inlineAudioRef.current;
      if (!audio) return;
      audio.src = url;
      audio.currentTime = 0;
      audio.volume = 1;
      audio.onended = () => {
        setInlinePreviewPlaying(false);
        setInlinePreviewKey(null);
      };
      await audio.play();
      setInlinePreviewPlaying(true);
    } catch {
      onError?.('Could not preview that track.');
      stopInlinePreview();
    } finally {
      setInlinePreviewLoading(false);
    }
  }, [inlinePreviewKey, inlinePreviewPlaying, onError, stopInlinePreview]);

  const toggleSegmentPreview = useCallback(async () => {
    if (!music) return;
    if (segmentPreviewPlaying) {
      stopInlinePreview();
      return;
    }
    stopInlinePreview();
    setSegmentPreviewLoading(true);
    try {
      const url =
        music.kind === 'device'
          ? music.url
          : await resolveStudioTrackUrl(music.shareId, music.trackId);
      const audio = inlineAudioRef.current;
      if (!audio) return;
      const end = Math.min(
        musicDuration > 0 ? musicDuration : musicStart + clipDuration,
        musicStart + clipDuration
      );
      segmentPreviewEndRef.current = end;
      audio.src = url;
      audio.currentTime = musicStart;
      audio.volume = musicMuted ? 0 : musicVol;
      audio.ontimeupdate = () => {
        if (audio.currentTime >= segmentPreviewEndRef.current) {
          audio.pause();
          setSegmentPreviewPlaying(false);
        }
      };
      audio.onended = () => setSegmentPreviewPlaying(false);
      await audio.play();
      setSegmentPreviewPlaying(true);
    } catch {
      onError?.('Could not preview that music clip.');
      stopInlinePreview();
    } finally {
      setSegmentPreviewLoading(false);
    }
  }, [clipDuration, music, musicDuration, musicMuted, musicStart, musicVol, onError, segmentPreviewPlaying, stopInlinePreview]);

  const visibleTracks = (musicTab === 'mine' ? tracks.mine : tracks.library).filter((item) => {
    if (!trackQuery.trim()) return true;
    const q = trackQuery.trim().toLowerCase();
    return item.title.toLowerCase().includes(q) || item.artistName.toLowerCase().includes(q);
  });

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
        className="!fixed z-[60] max-h-[min(94dvh,100svh)] w-[min(calc(100vw-1rem),36rem)] max-w-[min(calc(100vw-1rem),36rem)] min-w-0 overflow-x-hidden overflow-y-auto border-white/10 bg-[#0b0f14] p-4 text-white sm:rounded-2xl"
      >
        <DialogHeader className="min-w-0 space-y-1 pr-8 text-left">
          <DialogTitle className="text-sm font-bold uppercase tracking-widest text-cyan-200">
            {step === 'edit' ? 'Edit clip' : 'Camera'}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/55 break-words">
            Add a filter and layer music. The photo keeps its real shape.
          </DialogDescription>
        </DialogHeader>

        {step === 'capture' ? (
          importingFile || (initialFile && !source) ? (
            <div className="flex min-h-[12rem] flex-col items-center justify-center gap-2 rounded-xl bg-black">
              <Loader className="h-6 w-6 animate-spin text-cyan-300" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/55">
                Opening file…
              </p>
            </div>
          ) : (
          <div className="space-y-3">
            <div className="relative mx-auto flex min-h-[12rem] max-h-[min(42dvh,22rem)] min-w-0 w-full items-center justify-center overflow-hidden rounded-xl bg-black">
              <video
                ref={liveRef}
                muted
                playsInline
                autoPlay
                className={cn(
                  'max-h-[min(42dvh,22rem)] w-full object-contain',
                  !liveReady && 'opacity-40'
                )}
              />
              {!liveReady && !camError ? (
                <p className="pointer-events-none absolute inset-x-3 bottom-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/55">
                  Opening camera…
                </p>
              ) : null}
              {recording ? (
                <p className="absolute left-2 top-2 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                  Rec {formatSec(recordSec)}
                </p>
              ) : null}
            </div>
            {camError ? (
              <div className="space-y-2">
                <p className="text-xs text-rose-300">{camError}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 text-[10px] font-bold uppercase tracking-widest"
                  onClick={() => captureRef.current?.click()}
                >
                  <Camera className="h-3.5 w-3.5" /> Take photo with device camera
                </Button>
              </div>
            ) : null}
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
                onClick={() => {
                  stopCamera();
                  fileRef.current?.click();
                }}
              >
                <ImagePlus className="h-3.5 w-3.5" /> Library
              </Button>
              <p className="text-[10px] uppercase tracking-widest text-white/40">Photo or {WALL_CLIP_MAX_SECONDS}s clip</p>
            </div>
          </div>
          )
        ) : source ? (
          <div className="min-w-0 space-y-3">
            <div className="relative mx-auto flex max-h-[min(48dvh,24rem)] min-w-0 w-full items-center justify-center overflow-hidden rounded-xl bg-black">
              {source.kind === 'video' ? (
                <video
                  ref={editVideoRef}
                  src={source.url}
                  playsInline
                  className="max-h-[min(48dvh,24rem)] max-w-full object-contain"
                  style={{ filter: mediaFilterCss(filterId) }}
                  onClick={openReview}
                  onTimeUpdate={(event) => {
                    const video = event.currentTarget;
                    if (video.currentTime >= trimEnd - 0.05) {
                      video.pause();
                      video.currentTime = trimStart;
                      setClipPreviewPlaying(false);
                    }
                  }}
                  onPause={() => setClipPreviewPlaying(false)}
                  onPlay={() => setClipPreviewPlaying(true)}
                />
              ) : (
                <button
                  type="button"
                  onClick={openReview}
                  className="flex max-h-[min(48dvh,24rem)] w-full cursor-zoom-in items-center justify-center"
                  aria-label="Review fullscreen preview"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={source.url}
                    alt="Preview"
                    className="max-h-[min(48dvh,24rem)] max-w-full object-contain"
                    style={{ filter: mediaFilterCss(filterId) }}
                  />
                </button>
              )}
              {source.kind === 'video' ? (
                <button
                  type="button"
                  className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white"
                  onClick={() => {
                    const video = editVideoRef.current;
                    if (!video) return;
                    if (!video.paused) {
                      video.pause();
                      return;
                    }
                    video.muted = videoMuted || videoVol <= 0;
                    video.volume = videoMuted ? 0 : videoVol;
                    const begin = () => {
                      video.currentTime = trimStart;
                      void video.play().catch(() => setClipPreviewPlaying(false));
                    };
                    if (video.readyState >= 1) begin();
                    else video.addEventListener('loadedmetadata', begin, { once: true });
                  }}
                >
                  {clipPreviewPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {clipPreviewPlaying ? 'Pause' : 'Play crop'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={openReview}
                className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-white/80"
              >
                <Maximize2 className="h-3 w-3" /> Review
              </button>
            </div>
            <p className="text-center text-[10px] uppercase tracking-widest text-white/40">
              {source.kind === 'video'
                ? 'Play the cropped window here with audio. Tap the picture to open it larger.'
                : 'Tap the picture to review it fullscreen before you use it.'}
            </p>

            {source.kind === 'video' ? (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                  Crop {formatSec(trimStart)}–{formatSec(trimEnd)}
                  <span className="ml-1 font-normal text-white/35">
                    ({formatSec(Math.min(WALL_CLIP_MAX_SECONDS, trimEnd - trimStart))} / {WALL_CLIP_MAX_SECONDS}s)
                  </span>
                </p>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, source.durationSec - 0.6)}
                  step={0.1}
                  value={Math.min(trimStart, Math.max(0, source.durationSec - 0.6))}
                  onChange={(e) => {
                    const next = Math.min(Number(e.target.value), Math.max(0, source.durationSec - 0.6));
                    const end = Math.min(source.durationSec, next + WALL_CLIP_MAX_SECONDS);
                    setTrimStart(next);
                    setTrimEnd(Math.max(next + 0.6, end));
                    const video = editVideoRef.current;
                    if (video && video.paused) video.currentTime = next;
                  }}
                  className="w-full accent-cyan-300"
                  aria-label="Crop start"
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
                    setMusicDuration(0);
                    setMusicStart(0);
                  }}
                >
                  <Trash2 className="mr-1 inline h-3 w-3" />
                  Clear
                </button>
              ) : null}
            </div>

            {source.kind === 'video' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="shrink-0 text-white/70 hover:text-white"
                  onClick={() => setVideoMuted((value) => !value)}
                  title={videoMuted ? 'Unmute video' : 'Mute video'}
                >
                  {videoMuted || videoVol <= 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <span className="w-14 shrink-0 text-[10px] font-bold uppercase tracking-widest text-white/45">
                  Video
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={videoMuted ? 0 : videoVol}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setVideoVol(next);
                    setVideoMuted(next <= 0);
                  }}
                  className="min-w-0 flex-1 accent-cyan-300"
                />
              </div>
            ) : null}

            {music ? (
              <div className="space-y-2 rounded-xl border border-white/10 bg-black/30 p-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="shrink-0 text-white/70 hover:text-white"
                    onClick={() => void toggleSegmentPreview()}
                    title={segmentPreviewPlaying ? 'Stop preview' : 'Preview music clip'}
                    disabled={segmentPreviewLoading}
                  >
                    {segmentPreviewLoading ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : segmentPreviewPlaying ? (
                      <Pause className="h-4 w-4" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    className="shrink-0 text-white/70 hover:text-white"
                    onClick={() => setMusicMuted((value) => !value)}
                    title={musicMuted ? 'Unmute music' : 'Mute music'}
                  >
                    {musicMuted || musicVol <= 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <span className="w-14 shrink-0 text-[10px] font-bold uppercase tracking-widest text-white/45">
                    Music
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={musicMuted ? 0 : musicVol}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setMusicVol(next);
                      setMusicMuted(next <= 0);
                    }}
                    className="min-w-0 flex-1 accent-fuchsia-300"
                  />
                </div>
                {musicDuration > 0.6 ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/45">
                      Pick music {formatSec(musicStart)}–{formatSec(Math.min(musicDuration, musicStart + clipDuration))}
                      <span className="ml-1 font-normal text-white/35">
                        of {formatSec(musicDuration)} · same length as this clip
                      </span>
                    </p>
                    <div className="relative h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="absolute inset-y-0 rounded-full bg-fuchsia-400/55"
                        style={{
                          left: `${(musicStart / musicDuration) * 100}%`,
                          width: `${Math.max(4, (clipDuration / musicDuration) * 100)}%`,
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={maxMusicStart || 0}
                      step={0.1}
                      value={Math.min(musicStart, maxMusicStart)}
                      disabled={maxMusicStart <= 0}
                      onChange={(e) => setMusicStart(Number(e.target.value))}
                      className="w-full accent-fuchsia-300"
                    />
                  </div>
                ) : (
                  <p className="text-[10px] text-white/40">
                    Uses the first {formatSec(clipDuration)} of this track.
                  </p>
                )}
              </div>
            ) : null}

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
                          <div key={item.key} className="flex items-center gap-1">
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
                              onClick={() => void previewPickerTrack(item)}
                              title="Preview track"
                              disabled={inlinePreviewLoading && inlinePreviewKey === item.key}
                            >
                              {inlinePreviewLoading && inlinePreviewKey === item.key ? (
                                <Loader className="h-3.5 w-3.5 animate-spin" />
                              ) : inlinePreviewKey === item.key && inlinePreviewPlaying ? (
                                <Pause className="h-3.5 w-3.5" />
                              ) : (
                                <Play className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              className="block min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-left text-xs text-white/80 hover:bg-white/10"
                              onClick={() => {
                                applyMusicPick({
                                  kind: 'library',
                                  label: item.title,
                                  shareId: item.shareId,
                                  trackId: item.trackId,
                                  durationSec: item.durationSec,
                                });
                              }}
                            >
                              {item.title}
                              <span className="ml-1 text-white/40">{item.artistName}</span>
                            </button>
                          </div>
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
                {exporting
                  ? source.kind === 'image' && !music
                    ? 'Attaching photo…'
                    : 'Attaching clip…'
                  : source.kind === 'image' && !music
                    ? 'Use photo'
                    : 'Use clip'}
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
          ref={captureRef}
          type="file"
          accept="image/*"
          capture="environment"
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
        <audio ref={inlineAudioRef} className="sr-only" preload="none" />
      </DialogContent>
      {reviewOpen && source ? (
        <ProfileMediaLightbox
          open
          elevated
          onOpenChange={(next) => {
            if (!next) setReviewOpen(false);
          }}
          title={source.kind === 'video' || music ? 'Review clip' : 'Review photo'}
          src={source.kind === 'image' ? source.url : undefined}
          stageClassName="max-w-none"
          className="!h-auto !max-h-[96dvh] !w-[min(96vw,110rem)] !max-w-[min(96vw,110rem)]"
        >
          {source.kind === 'video' ? (
            <div className="w-full space-y-3">
              <video
                ref={reviewVideoRef}
                src={source.url}
                controls
                playsInline
                className="max-h-[min(72dvh,68rem)] w-full rounded-lg object-contain"
                style={{ filter: mediaFilterCss(filterId) }}
              />
              {reviewMusicUrl ? (
                <audio ref={reviewAudioRef} src={reviewMusicUrl} className="w-full" controls />
              ) : music ? (
                <p className="text-center text-[10px] text-white/40">Opening attached music…</p>
              ) : null}
            </div>
          ) : reviewMusicUrl ? (
            <audio ref={reviewAudioRef} src={reviewMusicUrl} className="w-full" controls />
          ) : null}
        </ProfileMediaLightbox>
      ) : null}
    </Dialog>
  );
}
