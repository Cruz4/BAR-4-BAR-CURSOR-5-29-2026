/**
 * Neomaiya Sol — auto-friend for every artist (guestbook welcome is Jordie Cruz).
 *
 * Canonical Auth account is {@link NEOMAIYA_SOL.email} only.
 * Never treat another account as Neo just because the display name matched.
 */

export const NEOMAIYA_SOL = {
  /** Live founder account (also master admin). */
  email: 'plotformaiplan@gmail.com',
  displayName: 'Neomaiya Sol',
  /** Canonical live Artist Home slug (bar4bar.ink/profile/neomaiya_sol). */
  slug: 'neomaiya_sol',
} as const;

/**
 * Former mistaken Neo emails — still in Firestore as friendship / guestbook authors.
 * Repair paths strip these so "Mike Hills" never appears as Neo's welcome.
 */
export const NEOMAIYA_SOL_LEGACY_EMAILS = ['neomaiyasol@gmail.com'] as const;

export function isNeomaiyaSolEmail(email?: string | null): boolean {
  const e = (email || '').trim().toLowerCase();
  return Boolean(e) && e === NEOMAIYA_SOL.email.toLowerCase();
}

export function isLegacyNeomaiyaSolEmail(email?: string | null): boolean {
  const e = (email || '').trim().toLowerCase();
  if (!e) return false;
  return (NEOMAIYA_SOL_LEGACY_EMAILS as readonly string[]).some((x) => x.toLowerCase() === e);
}

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

/**
 * Fallback chip id when `/api/profile/neomaiya` has no Auth uid yet.
 * Prefer the live `userId` from that API so sandbox Friends/Guestbook are her
 * real account (not a second fake Neo in anyone's circle).
 */
export const NEOMAIYA_PLAYGROUND_FRIEND = {
  userId: 'neomaiya-sol-playground',
  name: NEOMAIYA_SOL.displayName,
  slug: NEOMAIYA_SOL.slug,
} as const;

/** Build the sandbox Friends chip — real Auth uid when known. */
export function neomaiyaFriendChip(opts?: {
  userId?: string | null;
  slug?: string | null;
  name?: string | null;
}): { userId: string; name: string; slug: string } {
  const userId =
    typeof opts?.userId === 'string' && opts.userId.trim()
      ? opts.userId.trim()
      : NEOMAIYA_PLAYGROUND_FRIEND.userId;
  const slug =
    typeof opts?.slug === 'string' && opts.slug.trim()
      ? opts.slug.trim()
      : NEOMAIYA_SOL.slug;
  const name =
    typeof opts?.name === 'string' && opts.name.trim()
      ? opts.name.trim()
      : NEOMAIYA_SOL.displayName;
  return { userId, name, slug };
}

/** Name/slug heuristics for Neo (and stale Neo clone chips). */
export function looksLikeNeomaiyaSol(name?: string, slug?: string): boolean {
  const n = (name || '').trim().toLowerCase();
  const s = (slug || '').trim().toLowerCase();
  return (
    n === 'neomaiya sol' ||
    s === 'neomaiya_sol' ||
    s === 'neomaiya-sol' ||
    s.startsWith('neomaiya_sol_') ||
    s.startsWith('neomaiya-sol-')
  );
}

/** True only for the canonical Neo Auth email — never display-name alone. */
export function isNeomaiyaSolViewer(viewer?: {
  email?: string | null;
  displayName?: string | null;
}): boolean {
  if (!viewer) return false;
  return isNeomaiyaSolEmail(viewer.email);
}

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

export function neomaiyaPlaygroundGuestbookEntry(
  now = new Date(),
  seed?: string,
  author?: { userId?: string | null; slug?: string | null; name?: string | null }
) {
  const chip = neomaiyaFriendChip(author);
  return {
    id: chip.userId,
    authorId: chip.userId,
    authorName: chip.name,
    authorSlug: chip.slug,
    text: pickNeomaiyaGuestbookWelcome(seed),
    createdAt: now.toISOString(),
  };
}
