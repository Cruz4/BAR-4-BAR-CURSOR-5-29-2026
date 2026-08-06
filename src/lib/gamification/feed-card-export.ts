/** Capture a DOM node to a Firestore-safe JPEG data URL for wall/feed posts. */

import {
  captureFoilNodeToCanvas,
  canvasToFeedJpegDataUrl,
  downloadCanvasPng,
  FOIL_EXPORT_MATTE_COLOR,
} from '@/lib/gamification/capture-foil-node';

export async function domNodeToFeedImageDataUrl(
  node: HTMLElement,
  backgroundColor = FOIL_EXPORT_MATTE_COLOR
): Promise<string> {
  const canvas = await captureFoilNodeToCanvas(node, { backgroundColor });
  return canvasToFeedJpegDataUrl(canvas);
}

export async function downloadDomNodePng(
  node: HTMLElement,
  filename: string,
  backgroundColor = FOIL_EXPORT_MATTE_COLOR
): Promise<void> {
  const canvas = await captureFoilNodeToCanvas(node, { backgroundColor });
  downloadCanvasPng(canvas, filename);
}
