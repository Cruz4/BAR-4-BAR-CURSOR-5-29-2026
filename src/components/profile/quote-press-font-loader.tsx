'use client';

import { useEffect } from 'react';
import {
  getQuotePressGoogleFontsStylesheetHref,
  QUOTE_PRESS_GOOGLE_FONTS_LINK_ID,
} from '@/lib/profile/quote-press-google-fonts';

/** Loads Google Fonts for Quote Press / Imprint on demand (idempotent). */
export function QuotePressFontLoader() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (document.getElementById(QUOTE_PRESS_GOOGLE_FONTS_LINK_ID)) return;

    const href = getQuotePressGoogleFontsStylesheetHref();
    const link = document.createElement('link');
    link.id = QUOTE_PRESS_GOOGLE_FONTS_LINK_ID;
    link.rel = 'stylesheet';
    link.href = href;
    link.media = 'print';
    link.onload = () => {
      link.media = 'all';
    };
    document.head.appendChild(link);
  }, []);

  return null;
}
