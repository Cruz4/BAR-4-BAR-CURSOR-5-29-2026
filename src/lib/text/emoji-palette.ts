export type EmojiPaletteGroup = {
  label: string;
  emojis: string[];
};

/** Curated palette for posts, comments, and messages — music / studio / reaction friendly. */
export const EMOJI_PALETTE: EmojiPaletteGroup[] = [
  {
    label: 'Vibes',
    emojis: ['😀', '😂', '🥹', '😍', '😎', '🤩', '😭', '🥲', '😤', '😮‍💨', '🙃', '😏'],
  },
  {
    label: 'Fire',
    emojis: ['🔥', '💯', '⚡', '✨', '🚀', '💥', '🎯', '👑', '💎', '🖤', '💜', '💙'],
  },
  {
    label: 'Music',
    emojis: ['🎤', '🎵', '🎶', '🎧', '📀', '🎹', '🥁', '🎸', '🎷', '🎺', '🎻', '🎼'],
  },
  {
    label: 'Hands',
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '🙏', '👊', '✊', '🤙', '✌️', '🫡', '👋'],
  },
  {
    label: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💕', '💗', '💖', '💘'],
  },
];

export const EMOJI_PALETTE_FLAT = EMOJI_PALETTE.flatMap((group) => group.emojis);
