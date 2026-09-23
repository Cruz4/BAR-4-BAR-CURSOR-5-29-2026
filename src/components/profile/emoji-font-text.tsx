import type { CSSProperties } from 'react';
import {
  EMOJI_FONT_FAMILY,
  isEmojiGrapheme,
  segmentGraphemes,
} from '@/lib/text/emoji-display';

/** Renders plain text with emoji graphemes forced onto the system emoji stack. */
export function EmojiFontText({
  text,
  style,
  emojiStyle,
}: {
  text: string;
  style?: CSSProperties;
  emojiStyle?: CSSProperties;
}) {
  const segments = segmentGraphemes(text);
  if (segments.length <= 1 && !isEmojiGrapheme(text)) {
    return <span style={style}>{text}</span>;
  }
  return (
    <>
      {segments.map((segment, index) => {
        const emoji = isEmojiGrapheme(segment);
        return (
          <span
            key={`${index}-${segment.codePointAt(0) ?? index}`}
            style={emoji ? { ...style, ...emojiStyle, fontFamily: EMOJI_FONT_FAMILY } : style}
          >
            {segment}
          </span>
        );
      })}
    </>
  );
}
