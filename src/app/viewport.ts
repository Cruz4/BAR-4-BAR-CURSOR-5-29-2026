import type { Viewport } from 'next';

/** Shrink layout viewport with the on-screen keyboard so fixed/flex footers stay visible. */
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  interactiveWidget: 'resizes-content',
};
