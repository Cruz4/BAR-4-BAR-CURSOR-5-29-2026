/**
 * Jordie Cruz — sandbox / founder guestbook welcome + auto-friend for every artist.
 *
 * Canonical Auth: {@link JORDIE_CRUZ.email}.
 * Neo stays an auto-friend; guestbook welcome lines are Jordie's (not Neo's).
 */

export const JORDIE_CRUZ = {
  email: 'jordiecruzllc@gmail.com',
  displayName: 'Jordie Cruz',
  /** Preferred Artist Home slug (bar4bar.ink/profile/jordie_cruz). */
  slug: 'jordie_cruz',
} as const;

export function isJordieCruzEmail(email?: string | null): boolean {
  const e = (email || '').trim().toLowerCase();
  return Boolean(e) && e === JORDIE_CRUZ.email.toLowerCase();
}

/** Guestbook lines Jordie leaves on new / guest profiles (no dashes). */
export const JORDIE_GUESTBOOK_WELCOMES = [
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

export const JORDIE_PLAYGROUND_FRIEND = {
  userId: 'jordie-cruz-playground',
  name: JORDIE_CRUZ.displayName,
  slug: JORDIE_CRUZ.slug,
} as const;

export function jordieFriendChip(opts?: {
  userId?: string | null;
  slug?: string | null;
  name?: string | null;
}): { userId: string; name: string; slug: string } {
  const userId =
    typeof opts?.userId === 'string' && opts.userId.trim()
      ? opts.userId.trim()
      : JORDIE_PLAYGROUND_FRIEND.userId;
  const slug =
    typeof opts?.slug === 'string' && opts.slug.trim()
      ? opts.slug.trim()
      : JORDIE_CRUZ.slug;
  const name =
    typeof opts?.name === 'string' && opts.name.trim()
      ? opts.name.trim()
      : JORDIE_CRUZ.displayName;
  return { userId, name, slug };
}

export function looksLikeJordieCruz(name?: string, slug?: string): boolean {
  const n = (name || '').trim().toLowerCase();
  const s = (slug || '').trim().toLowerCase();
  return (
    n === 'jordie cruz' ||
    s === 'jordie_cruz' ||
    s === 'jordie-cruz' ||
    s.startsWith('jordie_cruz_') ||
    s.startsWith('jordie-cruz-')
  );
}

function clampIndex(n: number, len: number): number {
  if (len <= 0) return 0;
  const v = Math.abs(Math.floor(n)) % len;
  return v;
}

export function pickJordieGuestbookWelcome(seed?: string): string {
  const list = JORDIE_GUESTBOOK_WELCOMES;
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

export function jordiePlaygroundGuestbookEntry(
  now = new Date(),
  seed?: string,
  author?: { userId?: string | null; slug?: string | null; name?: string | null }
) {
  const chip = jordieFriendChip(author);
  return {
    id: chip.userId,
    authorId: chip.userId,
    authorName: chip.name,
    authorSlug: chip.slug,
    text: pickJordieGuestbookWelcome(seed),
    createdAt: now.toISOString(),
  };
}
