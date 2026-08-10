import { SIGNUP_INK } from '@/lib/subscription';

/**
 * Guest try sheet — new devices open the real track editor before signup.
 *
 * REVERT / DISABLE (no code rollback needed):
 *   Set NEXT_PUBLIC_GUEST_TRY_SHEET=0 in .env / .env.local and redeploy.
 * Full rollback: git revert the commit that introduced guest try.
 */

export const GUEST_TRY_ALBUM_ID = 'try';
export const GUEST_TRY_TRACK_ID = 'guest-sheet';
export const GUEST_TRY_PATH = `/albums/${GUEST_TRY_ALBUM_ID}/tracks/${GUEST_TRY_TRACK_ID}`;

/** Free Generate Next assists per browser before signup (not real Ink). */
export const GUEST_DEMO_MAX_USES = 2;

/** Shown under the pencil while redirecting cold traffic into the try sheet. */
export const GUEST_TRY_HANDOFF_MESSAGE = 'Opening finish this bar';
export const GUEST_TRY_HANDOFF_SUBLINE = 'Deep starter line — drop yours under it.';

/** Toast copy when a guest taps an Ink-gated studio tool. */
export function guestInkFeatureLockedToast(featureLabel: string): {
  title: string;
  description: string;
} {
  return {
    title: 'Sign up to unlock',
    description: `${featureLabel} uses real Ink after signup. On the try sheet, only Generate Next is free (${GUEST_DEMO_MAX_USES} assists / browser) — separate from the ${SIGNUP_INK} Ink you get when you create an account.`,
  };
}

/** Default ON — set NEXT_PUBLIC_GUEST_TRY_SHEET=0 to restore landing-first. */
export function isGuestTrySheetEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_GUEST_TRY_SHEET;
  if (raw === undefined || raw === '') return true;
  return raw !== '0' && raw.toLowerCase() !== 'false' && raw.toLowerCase() !== 'off';
}

export function isGuestTryPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname === GUEST_TRY_PATH ||
    pathname === `/albums/${GUEST_TRY_ALBUM_ID}` ||
    pathname.startsWith(`/albums/${GUEST_TRY_ALBUM_ID}/`) ||
    pathname === '/try'
  );
}

export function isGuestTryAlbumId(albumId: string | null | undefined): boolean {
  return albumId === GUEST_TRY_ALBUM_ID;
}
