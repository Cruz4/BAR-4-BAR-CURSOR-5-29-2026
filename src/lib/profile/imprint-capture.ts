'use client';

/**
 * Imprint export — PNG still only.
 * Tries html2canvas → html-to-image → modern-screenshot clone (foil pattern).
 */

import html2canvas from 'html2canvas';
import { toCanvas } from 'html-to-image';
import { domToCanvas } from 'modern-screenshot';
import { ensureImprintKeyframesInjected } from '@/lib/profile/imprint-keyframes';
import type { QuotePressConfig } from '@/lib/profile/quote-press';
import {
  mountImprintForExport,
  unmountImprintExport,
  type ImprintExportMountParams,
} from '@/components/profile/imprint-export-mount';

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

function resolveImprintCard(source: HTMLElement): HTMLElement {
  const card = source.matches('[data-imprint-card]')
    ? source
    : source.querySelector<HTMLElement>('[data-imprint-card]');
  if (!card) throw new Error('Imprint card not found for export.');
  return card;
}

function resolveMotionRoot(source: HTMLElement): HTMLElement {
  if (source.matches('[data-imprint-root]')) return source;
  return source.closest<HTMLElement>('[data-imprint-root]') ?? source;
}

function ensureMotionLive(root: HTMLElement | null | undefined) {
  if (!root) return;
  root.setAttribute('data-imprint-motion', 'live');
  root.querySelectorAll<HTMLElement>('.qp-anim').forEach((el) => {
    el.style.animationPlayState = 'running';
  });
}

async function waitForCapturePaint() {
  void document.body.offsetHeight;
  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );
  await new Promise((r) => setTimeout(r, 250));
}

function canvasHasVisibleContent(canvas: HTMLCanvasElement): boolean {
  if (canvas.width < 8 || canvas.height < 8) return false;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;

  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let minL = 255;
  let maxL = 0;
  let opaque = 0;

  for (let i = 0; i < data.length; i += 16) {
    const a = data[i + 3];
    if (a < 12) continue;
    opaque += 1;
    const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    minL = Math.min(minL, l);
    maxL = Math.max(maxL, l);
  }

  return opaque > 24 && maxL - minL > 14;
}

function assertCanvasHasContent(canvas: HTMLCanvasElement) {
  if (!canvasHasVisibleContent(canvas)) {
    throw new Error('Imprint export was blank — card did not rasterize.');
  }
}

function compositeWithMatte(
  cardCanvas: HTMLCanvasElement,
  mattePx: number,
  backgroundColor: string,
  scale: number
): HTMLCanvasElement {
  const pad = Math.max(1, Math.round(mattePx * scale));
  const out = document.createElement('canvas');
  out.width = cardCanvas.width + pad * 2;
  out.height = cardCanvas.height + pad * 2;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Could not compose export matte.');
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(cardCanvas, pad, pad);
  return out;
}

function prepareCloneLayout(liveCard: HTMLElement, cloneRoot: HTMLElement) {
  const cloneCard = cloneRoot.querySelector<HTMLElement>('[data-imprint-card]');
  if (!cloneCard) return;

  const width = Math.round(liveCard.getBoundingClientRect().width) || IMPRINT_EXPORT_WIDTH_PX;
  cloneRoot.style.width = `${width}px`;
  cloneRoot.style.maxWidth = `${width}px`;
  cloneRoot.style.margin = '0';
  cloneRoot.style.boxSizing = 'border-box';

  cloneCard.style.width = `${width}px`;
  cloneCard.style.maxWidth = `${width}px`;
  cloneCard.style.minWidth = `${width}px`;
  cloneCard.style.margin = '0';
  cloneCard.style.boxSizing = 'border-box';
  cloneCard.style.overflow = 'hidden';
  cloneCard.style.height = 'auto';
  cloneCard.style.maxHeight = 'none';
  cloneCard.style.transform = 'none';

  const figureCs = getComputedStyle(liveCard);
  cloneCard.style.padding = figureCs.padding;
  cloneCard.style.borderRadius = figureCs.borderRadius;
  cloneCard.style.clipPath = figureCs.clipPath;
  cloneCard.style.borderColor = figureCs.borderColor;
  cloneCard.style.boxShadow = figureCs.boxShadow;

  const liveQuote = liveCard.querySelector<HTMLElement>('blockquote');
  const cloneQuote = cloneCard.querySelector<HTMLElement>('blockquote');
  if (liveQuote && cloneQuote) {
    const cs = getComputedStyle(liveQuote);
    cloneQuote.style.fontSize = cs.fontSize;
    cloneQuote.style.lineHeight = cs.lineHeight;
    cloneQuote.style.letterSpacing = cs.letterSpacing;
    cloneQuote.style.fontFamily = cs.fontFamily;
    cloneQuote.style.fontWeight = cs.fontWeight;
    cloneQuote.style.fontStyle = cs.fontStyle;
    cloneQuote.style.textAlign = cs.textAlign;
    cloneQuote.style.color = cs.color;
    cloneQuote.style.textShadow = cs.textShadow;
  }

  cloneCard.querySelectorAll<HTMLElement>('*').forEach((el) => {
    el.style.maxHeight = 'none';
  });

  ensureMotionLive(cloneRoot);
}

async function rasterizeWithCloneHost(
  motionRoot: HTMLElement,
  liveCard: HTMLElement,
  scale: number
): Promise<HTMLCanvasElement> {
  const width = Math.round(liveCard.getBoundingClientRect().width) || IMPRINT_EXPORT_WIDTH_PX;
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.setAttribute('data-imprint-capture-host', 'true');
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    `width:${width}px`,
    'margin:0',
    'padding:0',
    'box-sizing:border-box',
    'pointer-events:none',
    'z-index:2147483646',
    'opacity:0.04',
    'overflow:visible',
  ].join(';');

  const clone = motionRoot.cloneNode(true) as HTMLElement;
  prepareCloneLayout(liveCard, clone);
  host.appendChild(clone);
  document.body.appendChild(host);
  await waitForCapturePaint();

  try {
    return await domToCanvas(host, {
      scale,
      backgroundColor: null,
      style: { opacity: '1', transform: 'none' },
    });
  } finally {
    host.remove();
  }
}

async function rasterizeImprintCard(
  card: HTMLElement,
  scale: number,
  motionRoot?: HTMLElement
): Promise<HTMLCanvasElement> {
  const attempts: Array<() => Promise<HTMLCanvasElement>> = [
    () =>
      html2canvas(card, {
        scale,
        backgroundColor: null,
        logging: false,
        useCORS: true,
        allowTaint: true,
        onclone: (_doc, cloned) => {
          const root =
            cloned.matches('[data-imprint-card]')
              ? cloned
              : cloned.querySelector<HTMLElement>('[data-imprint-card]') ?? cloned;
          ensureMotionLive(root.closest<HTMLElement>('[data-imprint-root]') ?? root);
        },
      }),
    () =>
      toCanvas(card, {
        pixelRatio: scale,
        cacheBust: true,
        skipAutoScale: true,
      }),
  ];

  if (motionRoot) {
    attempts.push(() => rasterizeWithCloneHost(motionRoot, card, scale));
  }

  let lastError: Error | null = null;
  for (const attempt of attempts) {
    try {
      const canvas = await attempt();
      if (canvasHasVisibleContent(canvas)) return canvas;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Capture failed.');
    }
  }

  throw lastError ?? new Error('Imprint export was blank — card did not rasterize.');
}

async function captureLiveCardCanvas(
  source: HTMLElement,
  options: CaptureImprintOptions = {}
): Promise<HTMLCanvasElement> {
  ensureImprintKeyframesInjected();
  await document.fonts.ready;

  const motionRoot = resolveMotionRoot(source);
  const card = resolveImprintCard(source);
  const mattePx = options.mattePx ?? IMPRINT_EXPORT_MATTE_PX;
  const backgroundColor = options.backgroundColor ?? IMPRINT_EXPORT_MATTE_COLOR;
  const scale = options.scale ?? exportScale();

  ensureMotionLive(motionRoot);
  card.setAttribute('data-imprint-exporting', 'true');
  await waitForCapturePaint();

  try {
    const cardCanvas = await rasterizeImprintCard(card, scale, motionRoot);
    assertCanvasHasContent(cardCanvas);
    return compositeWithMatte(cardCanvas, mattePx, backgroundColor, scale);
  } finally {
    card.removeAttribute('data-imprint-exporting');
  }
}

export async function captureImprintNodeToCanvas(
  source: HTMLElement,
  options: CaptureImprintOptions = {}
): Promise<HTMLCanvasElement> {
  return captureLiveCardCanvas(source, options);
}

async function captureMountedImprint(
  params: ImprintExportMountParams,
  options: CaptureImprintOptions = {}
): Promise<HTMLCanvasElement> {
  const session = await mountImprintForExport(params);
  const width = options.width ?? IMPRINT_EXPORT_WIDTH_PX;
  const mattePx = options.mattePx ?? IMPRINT_EXPORT_MATTE_PX;
  const backgroundColor = options.backgroundColor ?? IMPRINT_EXPORT_MATTE_COLOR;
  const scale = options.scale ?? exportScale();

  session.motionRoot.style.width = `${width}px`;
  session.motionRoot.style.maxWidth = `${width}px`;
  session.card.style.width = `${width}px`;
  session.card.style.maxWidth = `${width}px`;

  ensureMotionLive(session.motionRoot);
  session.card.setAttribute('data-imprint-exporting', 'true');
  await waitForCapturePaint();

  try {
    const cardCanvas = await rasterizeImprintCard(session.card, scale, session.motionRoot);
    assertCanvasHasContent(cardCanvas);
    return compositeWithMatte(cardCanvas, mattePx, backgroundColor, scale);
  } finally {
    session.card.removeAttribute('data-imprint-exporting');
    unmountImprintExport(session);
  }
}

export async function captureImprintForExport(
  input: {
    captureRoot?: HTMLElement | null;
    text: string;
    config?: QuotePressConfig | null;
    creatorSlug?: string;
  },
  options: CaptureImprintOptions = {}
): Promise<HTMLCanvasElement> {
  if (input.captureRoot?.isConnected) {
    return captureImprintNodeToCanvas(input.captureRoot, options);
  }
  return captureMountedImprint(
    {
      text: input.text,
      config: input.config,
      creatorSlug: input.creatorSlug,
    },
    options
  );
}

export function downloadImprintPng(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement('a');
  link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function imprintExportFilename(text: string): string {
  const slug = text
    .trim()
    .slice(0, 40)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const stamp = new Date().toISOString().slice(0, 10);
  return `akasheet-imprint${slug ? `-${slug}` : ''}-${stamp}.png`;
}
