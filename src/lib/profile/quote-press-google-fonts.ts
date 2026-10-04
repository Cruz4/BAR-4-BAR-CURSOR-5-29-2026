import { QUOTE_PRESS_FONTS } from '@/lib/profile/quote-press';

/** Injected once by QuotePressFontLoader — keep in sync with QUOTE_PRESS_FONTS. */
export const QUOTE_PRESS_GOOGLE_FONTS_LINK_ID = 'b4b-quote-press-google-fonts';

/**
 * Google Fonts CSS for imprint / quote press families.
 * Core UI fonts (Inter, Roboto Slab, IBM Plex Mono) load from root layout.
 */
const QUOTE_PRESS_FAMILY_QUERY =
  'family=Architects+Daughter' +
  '&family=Bebas+Neue' +
  '&family=Playfair+Display:ital,wght@0,400;0,700;1,400' +
  '&family=Oswald:wght@400;600;700' +
  '&family=Space+Grotesk:wght@400;600;700' +
  '&family=DM+Serif+Display' +
  '&family=Permanent+Marker' +
  '&family=Roboto+Slab:wght@400;700' +
  '&family=IBM+Plex+Mono:wght@400;700' +
  '&family=Inter:wght@400;500;700' +
  '&family=Syne:wght@400;700;800' +
  '&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400' +
  '&family=Anton' +
  '&family=Caveat:wght@400;700' +
  '&family=Outfit:wght@400;600;700' +
  '&family=Bungee' +
  '&family=Rubik:wght@400;600;700' +
  '&family=Fjalla+One' +
  '&family=Merriweather:ital,wght@0,400;0,700;1,400' +
  '&family=Kanit:wght@400;600;700' +
  '&family=Righteous' +
  '&family=Lora:ital,wght@0,400;0,700;1,400' +
  '&family=Montserrat:wght@400;600;700' +
  '&family=Pacifico' +
  '&family=Teko:wght@400;600;700' +
  '&family=Raleway:wght@400;600;700' +
  '&family=Abril+Fatface' +
  '&family=Shadows+Into+Light' +
  '&family=Bangers' +
  '&family=Comfortaa:wght@400;600;700' +
  '&family=Cinzel:wght@400;600;700' +
  '&family=Satisfy' +
  '&display=swap';

export function getQuotePressGoogleFontsStylesheetHref(): string {
  return `https://fonts.googleapis.com/css2?${QUOTE_PRESS_FAMILY_QUERY}`;
}

/** Number of curated quote-press families (sanity check vs QUOTE_PRESS_FONTS). */
export const QUOTE_PRESS_FONT_FAMILY_COUNT = QUOTE_PRESS_FONTS.length;
