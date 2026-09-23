/** System emoji stack — avoids display fonts that ship empty tofu glyphs for pictographs. */
export const EMOJI_FONT_FAMILY =
  '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

const EMOJI_GRAPHEME = /\p{Extended_Pictographic}/u;

export function segmentGraphemes(text: string): string[] {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
    return [...segmenter.segment(text)].map((part) => part.segment);
  }
  return [...text];
}

export function isEmojiGrapheme(segment: string): boolean {
  return EMOJI_GRAPHEME.test(segment);
}
