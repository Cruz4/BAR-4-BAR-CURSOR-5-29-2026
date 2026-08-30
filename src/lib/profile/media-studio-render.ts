import {
  MEDIA_ASPECTS,
  mediaFilterCss,
  type MediaAspectId,
} from '@/lib/profile/media-filters';
import {
  IMAGE_TO_VIDEO_SECONDS,
  WALL_CLIP_MAX_BYTES,
  WALL_CLIP_MAX_SECONDS,
  type PendingWallClip,
} from '@/lib/profile/wall-clips';
import { processPostImageFile, type PendingPostImage } from '@/lib/profile/post-images';

export type StudioSource =
  | { kind: 'image'; url: string; width: number; height: number }
  | { kind: 'video'; url: string; durationSec: number; width: number; height: number };

function pickRecorderMime(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  if (typeof MediaRecorder === 'undefined') return '';
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
}

function cropRect(
  width: number,
  height: number,
  aspect: MediaAspectId
): { sx: number; sy: number; sw: number; sh: number } {
  const ratio = MEDIA_ASPECTS.find((a) => a.id === aspect)?.ratio;
  if (!ratio) return { sx: 0, sy: 0, sw: width, sh: height };
  const src = width / height;
  if (src > ratio) {
    const sw = height * ratio;
    return { sx: (width - sw) / 2, sy: 0, sw, sh: height };
  }
  const sh = width / ratio;
  return { sx: 0, sy: (height - sh) / 2, sw: width, sh };
}

function outputSize(sw: number, sh: number): { w: number; h: number } {
  const maxEdge = 720;
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  return {
    w: Math.max(16, Math.round((sw * scale) / 2) * 2),
    h: Math.max(16, Math.round((sh * scale) / 2) * 2),
  };
}

function loadVideo(url: string, muted = true): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = muted;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = url;
    video.onloadedmetadata = () => resolve(video);
    video.onerror = () => reject(new Error('Could not read that video.'));
  });
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = url;
  });
}

async function decodeAudio(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not load that music.');
  const buf = await res.arrayBuffer();
  return ctx.decodeAudioData(buf.slice(0));
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error('Could not export photo.'))),
      'image/jpeg',
      quality
    );
  });
}

export async function applyStillFilter(
  imageUrl: string,
  filterId: string,
  aspect: MediaAspectId
): Promise<PendingPostImage> {
  const img = await loadImage(imageUrl);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const crop = cropRect(srcW, srcH, aspect);
  const { w, h } = outputSize(crop.sw, crop.sh);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process that image.');
  ctx.filter = mediaFilterCss(filterId);
  ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
  return processPostImageFile(await canvasToJpeg(canvas, 0.86));
}

export async function renderStudioClip(opts: {
  source: StudioSource;
  filterId: string;
  aspect: MediaAspectId;
  trimStart?: number;
  trimEnd?: number;
  musicUrl?: string;
  onProgress?: (pct: number) => void;
}): Promise<PendingWallClip> {
  const mime = pickRecorderMime();
  if (!mime) throw new Error('This browser cannot export a clip. Try Chrome or Safari.');

  const filter = mediaFilterCss(opts.filterId);
  const videoEl = opts.source.kind === 'video' ? await loadVideo(opts.source.url, false) : null;
  const imgEl = opts.source.kind === 'image' ? await loadImage(opts.source.url) : null;

  const crop = cropRect(opts.source.width, opts.source.height, opts.aspect);
  const { w, h } = outputSize(crop.sw, crop.sh);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not render that clip.');

  const start = Math.max(0, opts.trimStart || 0);
  const rawEnd =
    opts.source.kind === 'video'
      ? Math.min(opts.source.durationSec, opts.trimEnd ?? opts.source.durationSec)
      : IMAGE_TO_VIDEO_SECONDS;
  const duration = Math.max(
    0.6,
    Math.min(WALL_CLIP_MAX_SECONDS, rawEnd - (opts.source.kind === 'video' ? start : 0))
  );

  const paintFrame = (elapsed: number) => {
    ctx.filter = filter;
    if (videoEl) {
      ctx.drawImage(videoEl, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
      return;
    }
    if (!imgEl) return;
    const zoom = 1 + (elapsed / duration) * 0.08;
    const dw = w * zoom;
    const dh = h * zoom;
    ctx.drawImage(imgEl, crop.sx, crop.sy, crop.sw, crop.sh, (w - dw) / 2, (h - dh) / 2, dw, dh);
  };

  if (videoEl) {
    videoEl.currentTime = start;
    await new Promise<void>((resolve) => {
      const done = () => {
        videoEl.removeEventListener('seeked', done);
        resolve();
      };
      videoEl.addEventListener('seeked', done);
      window.setTimeout(done, 400);
    });
  }
  paintFrame(0);
  const posterBlob = await canvasToJpeg(canvas, 0.78).catch(() => undefined);

  const audioCtx = new AudioContext();
  if (audioCtx.state === 'suspended') await audioCtx.resume();
  const dest = audioCtx.createMediaStreamDestination();
  if (opts.musicUrl) {
    const buffer = await decodeAudio(audioCtx, opts.musicUrl);
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    const gain = audioCtx.createGain();
    gain.gain.value = 0.72;
    src.connect(gain);
    gain.connect(dest);
    src.start(0);
  }
  if (videoEl) {
    try {
      const fromEl = audioCtx.createMediaElementSource(videoEl);
      const gain = audioCtx.createGain();
      gain.gain.value = opts.musicUrl ? 0.28 : 1;
      fromEl.connect(gain);
      gain.connect(dest);
    } catch {
      videoEl.muted = true;
    }
  }
  if (!opts.musicUrl && !videoEl) {
    const osc = audioCtx.createOscillator();
    const silent = audioCtx.createGain();
    silent.gain.value = 0;
    osc.connect(silent);
    silent.connect(dest);
    osc.start();
  }

  const canvasStream = canvas.captureStream(24);
  const mixed = new MediaStream([...canvasStream.getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const chunks: BlobPart[] = [];
  const recorder = new MediaRecorder(mixed, { mimeType: mime, videoBitsPerSecond: 2_400_000 });
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(';')[0] }));
    recorder.onerror = () => reject(new Error('Could not export that clip.'));
  });

  recorder.start(200);
  const started = performance.now();
  let raf = 0;
  const draw = () => {
    const elapsed = (performance.now() - started) / 1000;
    opts.onProgress?.(Math.min(99, (elapsed / duration) * 100));
    paintFrame(elapsed);
    if (elapsed >= duration) {
      cancelAnimationFrame(raf);
      if (recorder.state !== 'inactive') recorder.stop();
      return;
    }
    raf = requestAnimationFrame(draw);
  };

  if (videoEl) {
    videoEl.currentTime = start;
    await videoEl.play().catch(() => undefined);
  }
  raf = requestAnimationFrame(draw);

  const blob = await done;
  cancelAnimationFrame(raf);
  videoEl?.pause();
  void audioCtx.close().catch(() => undefined);
  canvasStream.getTracks().forEach((track) => track.stop());
  dest.stream.getTracks().forEach((track) => track.stop());

  if (blob.size > WALL_CLIP_MAX_BYTES) {
    throw new Error('That clip is still too large. Try a shorter trim or no music.');
  }

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    contentType: blob.type || mime.split(';')[0] || 'video/webm',
    durationSec: duration,
    ...(posterBlob ? { posterBlob } : {}),
  };
}

export async function inspectImageFile(file: File | Blob): Promise<StudioSource> {
  const url = URL.createObjectURL(file);
  const img = await loadImage(url);
  return {
    kind: 'image',
    url,
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
  };
}

export async function inspectVideoFile(file: File | Blob): Promise<StudioSource> {
  if (file.size > 40 * 1024 * 1024) throw new Error('Video is too large (max 40MB).');
  const url = URL.createObjectURL(file);
  const video = await loadVideo(url);
  const durationSec = Number.isFinite(video.duration) ? video.duration : 0;
  if (durationSec < 0.4) throw new Error('That clip is too short.');
  return {
    kind: 'video',
    url,
    durationSec: Math.min(WALL_CLIP_MAX_SECONDS, durationSec),
    width: video.videoWidth || 720,
    height: video.videoHeight || 720,
  };
}

export function pickRecorderMimeType(): string {
  return pickRecorderMime();
}
