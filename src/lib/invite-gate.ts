/** Private beta invite gate — temporary launch control (admin-toggleable). */

import { isPublicArtistHomePath } from '@/lib/profile/profile-slug';

export const INVITE_GATE_COOKIE = 'b4b_invite_unlock';

export type InviteGateCopy = {
  headline: string;
  subheadline: string;
  ctaLabel: string;
  successHeadline: string;
  successSubheadline: string;
  loginBanner: string;
};

export const DEFAULT_INVITE_GATE_COPY: InviteGateCopy = {
  headline: 'THE VAULT IS LOCKED.',
  subheadline:
    'AKAsheet is in private invite-only beta — the rhyme book + AI co-writer for artists who think in bars. Drop your access code to enter before the world does.',
  ctaLabel: 'Unlock the Studio',
  successHeadline: "YOU'RE IN.",
  successSubheadline:
    'Welcome to the private beta. Sign in and chase the next bar.',
  loginBanner: 'Private beta access confirmed — sign in and chase the next bar.',
};

export type InviteGatePublicStatus = {
  enabled: boolean;
  version: number;
  copy: InviteGateCopy;
};

export type InviteGateAdminConfig = InviteGatePublicStatus & {
  hasCode: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '');
}

/** Paths that stay reachable while the gate is on (no unlock cookie required). */
export function isInviteGateExemptPath(pathname: string): boolean {
  if (!pathname || pathname === '/') return false;
  if (pathname.startsWith('/share/') || pathname.startsWith('/song/')) return true;
  if (pathname === '/p' || pathname.startsWith('/p/')) return true;
  if (pathname === '/discover' || pathname.startsWith('/discover/')) return true;
  if (pathname.startsWith('/lock/') || pathname === '/lock') return true;
  if (pathname.startsWith('/marketing/capture')) return true;
  if (pathname.startsWith('/api/')) return true;
  if (isPublicArtistHomePath(pathname)) return true;
  return false;
}
