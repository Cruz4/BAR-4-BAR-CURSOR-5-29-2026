import 'server-only';

import type { Firestore } from 'firebase-admin/firestore';
import { resolveShareLandingCount } from '@/lib/server/reach-analytics';
import {
  readLegacyProfilePageLoads,
  resolveProfileViewCount,
  sumWallPostOpensForOwner,
} from '@/lib/server/profile-views';

/** Pre–unique-tracking page loads on share docs (`share.views`). */
export function readLegacySharePageLoads(data: Record<string, unknown> | undefined): number {
  const n = Number(data?.views);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/** Public header number: unique landings plus historical page-load counter. */
export function displayReachFromParts(unique: number, legacyPageLoads: number): number {
  const u = Number.isFinite(unique) && unique >= 0 ? Math.floor(unique) : 0;
  const l = Number.isFinite(legacyPageLoads) && legacyPageLoads >= 0 ? Math.floor(legacyPageLoads) : 0;
  return Math.max(u, l);
}

export async function resolveShareReachDisplay(
  db: Firestore,
  shareId: string,
  data: Record<string, unknown> | undefined
): Promise<{ unique: number; legacy: number; display: number }> {
  const unique = await resolveShareLandingCount(db, shareId, data);
  const legacy = readLegacySharePageLoads(data);
  return { unique, legacy, display: displayReachFromParts(unique, legacy) };
}

export async function resolveProfileReachDisplay(
  db: Firestore,
  slug: string,
  ownerId: string,
  data: Record<string, unknown> | undefined
): Promise<{ unique: number; legacy: number; display: number }> {
  const unique = await resolveProfileViewCount(db, slug, data, ownerId);
  /** Artist Home only — never DNA drop share.views (those belong on /share links). */
  const legacy = readLegacyProfilePageLoads(data);
  const wallOpens = ownerId.trim() ? await sumWallPostOpensForOwner(db, ownerId.trim()) : 0;
  const fromLegacy = legacy > 0 ? displayReachFromParts(unique, legacy) : unique;
  /** Header: unique people, but include total public wall opens when that reflects real repeat engagement. */
  const display = Math.max(fromLegacy, wallOpens);
  return { unique, legacy, display };
}
