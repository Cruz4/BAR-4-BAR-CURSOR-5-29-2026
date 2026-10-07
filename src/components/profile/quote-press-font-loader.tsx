'use client';

import { quotePressFontCss } from '@/lib/fonts/quote-press-fonts';

/** Mounts the self-hosted Imprint fonts. No request to Google. */
export function QuotePressFontLoader() {
  void quotePressFontCss;
  return null;
}
