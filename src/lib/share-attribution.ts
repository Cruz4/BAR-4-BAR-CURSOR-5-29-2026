/**
 * Share Studio campaign codes — opaque public refs (never raw UIDs in URLs).
 */

import { getPublicAppUrl } from '@/lib/app-url';

export type ShareCampaignKind = 'release' | 'profile' | 'achievement';

export type ShareAspectRatio = '9:16' | '4:5' | '1:1';

export const SHARE_ASPECT_RATIOS: readonly ShareAspectRatio[] = ['9:16', '4:5', '1:1'] as const;

export type ShareCampaignPublic = {
  code: string;
  kind: ShareCampaignKind;
  /** Canonical app path, e.g. /song/ABC or /u/artist — no UIDs. */
  targetPath: string;
  title?: string;
  channel?: string;
};

export type ShareAspectFrame = {
  ratio: ShareAspectRatio;
  label: string;
  /** CSS aspect-ratio value */
  css: string;
  /** Suggested export pixels for social download guidance */
  width: number;
  height: number;
  platforms: string;
};

export const SHARE_ASPECT_FRAMES: Record<ShareAspectRatio, ShareAspectFrame> = {
  '9:16': {
    ratio: '9:16',
    label: 'Story / Reels',
    css: '9 / 16',
    width: 1080,
    height: 1920,
    platforms: 'TikTok · IG Reels · Stories',
  },
  '4:5': {
    ratio: '4:5',
    label: 'Feed',
    css: '4 / 5',
    width: 1080,
    height: 1350,
    platforms: 'Instagram feed',
  },
  '1:1': {
    ratio: '1:1',
    label: 'Square',
    css: '1 / 1',
    width: 1080,
    height: 1080,
    platforms: 'IG · X · general',
  },
};

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Mint an opaque campaign code (client or server). Collision checks happen server-side. */
export function mintShareCampaignCode(length = 10): string {
  const bytes =
    typeof crypto !== 'undefined' && 'getRandomValues' in crypto
      ? crypto.getRandomValues(new Uint8Array(length))
      : Array.from({ length }, () => Math.floor(Math.random() * 256));
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[(bytes[i] as number) % CODE_ALPHABET.length];
  }
  return out;
}

export function normalizeShareCampaignCode(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const code = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (code.length < 6 || code.length > 16) return null;
  return code;
}

/** Public campaign landing URL — resolves via /api/share/campaign?code= */
export function buildShareCampaignUrl(code: string, origin?: string): string {
  const base = (origin || getPublicAppUrl()).replace(/\/$/, '');
  const normalized = normalizeShareCampaignCode(code);
  return normalized ? `${base}/c/${encodeURIComponent(normalized)}` : base;
}

export function buildShareTargetUrl(targetPath: string, origin?: string): string {
  const base = (origin || getPublicAppUrl()).replace(/\/$/, '');
  const path = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
  return `${base}${path}`;
}

export function isSafeShareTargetPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//')) return false;
  if (path.includes('://') || path.includes('\\')) return false;
  if (path.length > 400) return false;
  return true;
}
