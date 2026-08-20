export type EmojiPaletteGroup = {
  label: string;
  emojis: string[];
};

/** Curated palette for posts, comments, and messages — music / studio / reaction friendly. */
export const EMOJI_PALETTE: EmojiPaletteGroup[] = [
  {
    label: 'Vibes',
    emojis: ['😀', '😂', '😊', '😍', '😎', '🤩', '😭', '😢', '😤', '😮', '🙃', '😏'],
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
    emojis: ['👍', '👎', '👏', '🙌', '🤝', '🙏', '👊', '✊', '🤙', '✌️', '🤘', '👋'],
  },
  {
    label: 'Hearts',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '❣️', '💕', '💗', '💖', '💘'],
  },
];

export const EMOJI_PALETTE_FLAT = EMOJI_PALETTE.flatMap((group) => group.emojis);

const EMOJI_KEYWORDS: Record<string, string[]> = {
  '😀': ['happy', 'smile', 'grin'],
  '😂': ['laugh', 'lol'],
  '😊': ['smile', 'blush'],
  '😍': ['love', 'heart eyes'],
  '😎': ['cool', 'shades'],
  '🤩': ['star', 'excited'],
  '😭': ['cry', 'sad'],
  '😢': ['tear', 'sad'],
  '😤': ['mad', 'angry'],
  '😮': ['wow', 'surprised'],
  '🙃': ['silly'],
  '😏': ['smirk'],
  '🔥': ['fire', 'lit'],
  '💯': ['100', 'perfect'],
  '⚡': ['bolt', 'energy'],
  '✨': ['sparkle', 'shine'],
  '🚀': ['rocket', 'launch'],
  '💥': ['boom'],
  '🎯': ['target', 'bullseye'],
  '👑': ['crown', 'king'],
  '💎': ['diamond', 'gem'],
  '🖤': ['black heart'],
  '💜': ['purple heart'],
  '💙': ['blue heart'],
  '🎤': ['mic', 'vocal'],
  '🎵': ['music', 'note'],
  '🎶': ['notes', 'song'],
  '🎧': ['headphones'],
  '📀': ['cd', 'disc'],
  '🎹': ['keys', 'piano'],
  '🥁': ['drum'],
  '🎸': ['guitar'],
  '🎷': ['sax'],
  '🎺': ['trumpet'],
  '🎻': ['violin'],
  '🎼': ['sheet music'],
  '👍': ['like', 'thumbs up'],
  '👎': ['thumbs down'],
  '👏': ['clap', 'applause'],
  '🙌': ['celebrate'],
  '🤝': ['deal', 'handshake'],
  '🙏': ['pray', 'thanks'],
  '👊': ['fist'],
  '✊': ['raise fist'],
  '🤙': ['call me'],
  '✌️': ['peace'],
  '🤘': ['rock'],
  '👋': ['wave', 'hello'],
  '❤️': ['heart', 'love'],
  '🧡': ['orange heart'],
  '💛': ['yellow heart'],
  '💚': ['green heart'],
  '❣️': ['heart exclamation'],
  '💕': ['two hearts'],
  '💗': ['growing heart'],
  '💖': ['sparkling heart'],
  '💘': ['cupid'],
};

export function emojiMatchesQuery(emoji: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (emoji.includes(q)) return true;
  const tags = EMOJI_KEYWORDS[emoji] || [];
  return tags.some((tag) => tag.includes(q));
}
