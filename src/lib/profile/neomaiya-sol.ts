/**
 * Neomaiya Sol — default first friend + guestbook welcome for every artist.
 */

export const NEOMAIYA_SOL = {
  email: 'neomaiyasol@gmail.com',
  displayName: 'Neomaiya Sol',
  /** Best-effort public slug when live profile isn't resolved yet. */
  slug: 'neomaiya-sol',
} as const;

/** Guestbook lines Neo leaves on new / guest profiles (no dashes). */
export const NEOMAIYA_GUESTBOOK_WELCOMES = [
  'Yoo this is how the guestbook looks. Finish signup and claim your page!',
  'Ayyyy welcome!! Finish the signup and make this page yours.',
  'This is dope! Lock in your free profile and keep building.',
  'Hey you made it. Sign up and finish your Artist Home when you are ready.',
  'Welcome in. Claim your page so this booth stays yours.',
  'Real talk: finish signup and your wall, Pressing, and this book stay with you.',
  'Glad you stopped by. Hit claim free and keep editing anytime.',
  'This guestbook is yours once you claim. Go finish that profile!',
  'First line from me. Sign up and press your page into something live.',
  'You are peeking at a real Artist Home. Claim it and make it yours.',
  'Nice energy. Finish signup and keep building on this page.',
  'Drop in, look around, then claim your free profile and keep going.',
  'This is the guestbook vibe. Sign up and write the rest of your story here.',
  'Welcome to the booth. Claim your page before you bounce.',
  'You found the book. Finish signup and we will keep the lights on for you.',
  'Ayy new face! Claim free and polish this page whenever you want.',
  'Live preview energy. Sign up and save what you already pressed.',
  'Come through. Finish your profile and own this wall for real.',
  'This is how visitors leave a line. Claim your page and invite your own.',
  'You are early. Finish signup and turn this demo into your home.',
] as const;

export const NEOMAIYA_PLAYGROUND_FRIEND = {
  userId: 'neomaiya-sol-playground',
  name: NEOMAIYA_SOL.displayName,
  slug: NEOMAIYA_SOL.slug,
} as const;

function clampIndex(n: number, len: number): number {
  if (len <= 0) return 0;
  const v = Math.abs(Math.floor(n)) % len;
  return v;
}

/** Stable pick from a seed string (user id, session, etc.). */
export function pickNeomaiyaGuestbookWelcome(seed?: string): string {
  const list = NEOMAIYA_GUESTBOOK_WELCOMES;
  if (!seed) {
    return list[clampIndex(Math.floor(Math.random() * list.length), list.length)];
  }
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return list[clampIndex(hash >>> 0, list.length)];
}

export function neomaiyaPlaygroundGuestbookEntry(now = new Date(), seed?: string) {
  return {
    id: NEOMAIYA_PLAYGROUND_FRIEND.userId,
    authorId: NEOMAIYA_PLAYGROUND_FRIEND.userId,
    authorName: NEOMAIYA_SOL.displayName,
    authorSlug: NEOMAIYA_SOL.slug,
    text: pickNeomaiyaGuestbookWelcome(seed),
    createdAt: now.toISOString(),
  };
}
