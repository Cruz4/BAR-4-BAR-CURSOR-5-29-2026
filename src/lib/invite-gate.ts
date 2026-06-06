/** Private beta invite gate — temporary launch control (admin-toggleable). */

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
    'Bar 4 Bar Studio is in private invite-only beta — the rhyme book + AI co-writer for artists who think in bars. Drop your access code to enter before the world does.',
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
  if (pathname.startsWith('/share/')) return true;
  if (pathname.startsWith('/api/')) return true;
  return false;
}
