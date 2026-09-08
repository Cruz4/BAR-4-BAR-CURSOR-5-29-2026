/**
 * Imprint export — PNG + animated clip via persistent capture host.
 * Captures at the live on-screen width and frozen computed typography
 * so line breaks match the posted card.
 */

import { domToCanvas } from 'modern-screenshot';

export const IMPRINT_EXPORT_WIDTH_PX = 576;
export const IMPRINT_EXPORT_MATTE_PX = 10;
export const IMPRINT_EXPORT_MATTE_COLOR = '#0b1220';

export type CaptureImprintOptions = {
  width?: number;
  mattePx?: number;
  backgroundColor?: string;
  scale?: number;
};

function exportScale(): number {
  if (typeof window === 'undefined') return 2;
  return Math.min(3, Math.max(2, window.devicePixelRatio || 2));
}

function pickImprintRecorderMime(): string {
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  if (typeof MediaRecorder === 'undefined') return '';
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) || '';
}

function measureImprintWidth(source: HTMLElement): number {
  const card = source.querySelector<HTMLElement>('[data-imprint-card]');
  const el = card ?? source;
  const width = Math.round(el.getBoundingClientRect().width);
  return width > 0 ? width : IMPRINT_EXPORT_WIDTH_PX;
}

function prepareImprintClone(source: HTMLElement, clone: HTMLElement, width: number) {
  const srcCard = source.querySelector<HTMLElement>('[data-imprint-card]') ?? source;
  const cloneCard = clone.querySelector<HTMLElement>('[data-imprint-card]') ?? clone;

  clone.style.width = `${width}px`;
  clone.style.maxWidth = `${width}px`;
  clone.style.minWidth = `${width}px`;
  clone.style.margin = '0';
  clone.style.boxSizing = 'border-box';
  clone.style.overflow = 'visible';

  cloneCard.style.width = `${width}px`;
  cloneCard.style.maxWidth = `${width}px`;
  cloneCard.style.minWidth = `${width}px`;
  cloneCard.style.margin = '0';
  cloneCard.style.boxSizing = 'border-box';
  cloneCard.style.overflow = 'hidden';
  cloneCard.style.height = 'auto';
  cloneCard.style.maxHeight = 'none';
  cloneCard.style.transform = 'none';
  cloneCard.style.boxShadow = 'none';
  cloneCard.style.filter = 'none';

  const cardCs = getComputedStyle(srcCard);
  cloneCard.style.padding = cardCs.padding;
  cloneCard.style.borderRadius = cardCs.borderRadius;

  const srcQuote = srcCard.querySelector<HTMLElement>('blockquote');
  const cloneQuote = cloneCard.querySelector<HTMLElement>('blockquote');
  if (srcQuote && cloneQuote) {
    const cs = getComputedStyle(srcQuote);
    cloneQuote.style.fontSize = cs.fontSize;
    cloneQuote.style.lineHeight = cs.lineHeight;
    cloneQuote.style.letterSpacing = cs.letterSpacing;
    cloneQuote.style.fontFamily = cs.fontFamily;
    cloneQuote.style.fontWeight = cs.fontWeight;
    cloneQuote.style.fontStyle = cs.fontStyle;
    cloneQuote.style.textAlign = cs.textAlign;
    cloneQuote.style.color = cs.color;
    cloneQuote.style.width = `${Math.round(srcQuote.getBoundingClientRect().width)}px`;
    cloneQuote.style.maxWidth = `${Math.round(srcQuote.getBoundingClientRect().width)}px`;
  }

  const srcSig = srcCard.querySelector<HTMLElement>('[data-imprint-signature]');
  const cloneSig = cloneCard.querySelector<HTMLElement>('[data-imprint-signature]');
  if (srcSig && cloneSig) {
    const cs = getComputedStyle(srcSig);
    cloneSig.style.fontSize = cs.fontSize;
    cloneSig.style.letterSpacing = cs.letterSpacing;
    const sigLink = cloneSig.querySelector<HTMLElement>('a, span');
    if (sigLink) {
      const linkCs = getComputedStyle(srcSig.querySelector('a, span') || srcSig);
      sigLink.style.fontSize = linkCs.fontSize;
      sigLink.style.letterSpacing = linkCs.letterSpacing;
    }
  }

  clone.querySelectorAll<HTMLElement>('*').forEach((el) => {
    el.style.maxHeight = 'none';
  });
}

function buildCaptureHost(source: HTMLElement, options: CaptureImprintOptions = {}) {
  const width = options.width ?? measureImprintWidth(source);
  const scale = options.scale ?? exportScale();
  const mattePx = options.mattePx ?? IMPRINT_EXPORT_MATTE_PX;
  const backgroundColor = options.backgroundColor ?? IMPRINT_EXPORT_MATTE_COLOR;
  const frameWidth = width + mattePx * 2;

  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.setAttribute('data-imprint-capture-host', 'true');
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${frameWidth}px`,
    `padding:${mattePx}px`,
    'margin:0',
    'box-sizing:border-box',
    `background:${backgroundColor}`,
    'pointer-events:none',
    'z-index:2147483646',
    'opacity:0.04',
    'overflow:visible',
  ].join(';');

  const clone = source.cloneNode(true) as HTMLElement;
  prepareImprintClone(source, clone, width);
  host.appendChild(clone);
  return { host, backgroundColor, scale };
}

async function waitForCapturePaint() {
  void document.body.offsetHeight;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
  await new Promise((r) => setTimeout(r, 200));
}

function domCaptureOptions(backgroundColor: string, scale: number) {
  return {
    scale,
    backgroundColor,
    style: {
      opacity: '1',
      transform: 'none',
    },
  };
}

/**
 * Capture an imprint root node (`[data-imprint-root]`) to canvas.
 */
export async function captureImprintNodeToCanvas(
  source: HTMLElement,
  options: CaptureImprintOptions = {}
): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const { host, backgroundColor, scale } = buildCaptureHost(source, options);
  document.body.appendChild(host);
  await waitForCapturePaint();

  try {
    return await domToCanvas(host, domCaptureOptions(backgroundColor, scale));
  } finally {
    host.remove();
  }
}

export function downloadImprintPng(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function downloadImprintBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 4000);
}

export function imprintExportFilename(text: string, ext: 'png' | 'webm'): string {
  const slug = text
    .trim()
    .slice(0, 40)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const stamp = new Date().toISOString().slice(0, 10);
  return `akasheet-imprint${slug ? `-${slug}` : ''}-${stamp}.${ext}`;
}

export type CaptureImprintLoopOptions = CaptureImprintOptions & {
  durationSec?: number;
  fps?: number;
  onProgress?: (pct: number) => void;
};

/**
 * Record a short clip while CSS animations run on a persistent off-screen clone.
 */
export async function captureImprintLoop(
  source: HTMLElement,
  options: CaptureImprintLoopOptions = {}
): Promise<Blob> {
  const mime = pickImprintRecorderMime();
  if (!mime) throw new Error('Clip export is not supported in this browser.');

  const durationSec = options.durationSec ?? 4.5;
  const fps = options.fps ?? 15;

  await document.fonts.ready;
  const { host, backgroundColor, scale } = buildCaptureHost(source, options);
  document.body.appendChild(host);
  await waitForCapturePaint();

  const probe = await domToCanvas(host, domCaptureOptions(backgroundColor, scale));

  const canvas = document.createElement('canvas');
  canvas.width = probe.width;
  canvas.height = probe.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    host.remove();
    throw new Error('Could not start clip capture.');
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const stream = canvas.captureStream(fps);
  const chunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: 5_000_000,
  });
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () =>
      resolve(new Blob(chunks, { type: mime.split(';')[0] || 'video/webm' }));
    recorder.onerror = () => reject(new Error('Clip capture failed.'));
  });

  recorder.start(100);
  const intervalMs = 1000 / fps;
  const totalFrames = Math.ceil(durationSec * fps);
  const started = performance.now();

  try {
    for (let frame = 0; frame < totalFrames; frame += 1) {
      const frameCanvas = await domToCanvas(host, domCaptureOptions(backgroundColor, scale));
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(frameCanvas, 0, 0, canvas.width, canvas.height);
      options.onProgress?.(Math.min(99, ((frame + 1) / totalFrames) * 100));
      const elapsed = performance.now() - started;
      const target = (frame + 1) * intervalMs;
      const wait = Math.max(0, target - elapsed);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    }
  } finally {
    if (recorder.state !== 'inactive') recorder.stop();
    host.remove();
    stream.getTracks().forEach((track) => track.stop());
  }

  const blob = await done;
  options.onProgress?.(100);
  if (!blob.size) throw new Error('Clip export produced an empty file.');
  return blob;
}
