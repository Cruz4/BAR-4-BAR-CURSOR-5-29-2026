import 'server-only';

import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { getSupportDashboard } from '@/lib/server/relationships';
import type { SupportAnalyticsWindow, SupportRelationshipRow } from '@/lib/relationships';
import {
  supportCrmRecommendedActionLabel,
  type ArtistIntelligencePerson,
  type ArtistIntelligenceSummary,
  type SupportCrmOverlay,
  type SupportCrmOverlayPatch,
  type SupportCrmRecommendedAction,
  type SupporterPriority,
} from '@/lib/support-crm';

function overlayPath(ownerId: string, peerId: string): string {
  return `users/${ownerId}/supportCrm/${peerId}`;
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const out: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const cleaned = tag.trim().slice(0, 32);
    if (!cleaned || out.includes(cleaned)) continue;
    out.push(cleaned);
    if (out.length >= 12) break;
  }
  return out;
}

function normalizeOverlay(
  peerId: string,
  ownerId: string,
  raw: DocumentData | undefined
): SupportCrmOverlay | null {
  if (!raw || typeof raw !== 'object') return null;
  const notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 2000) : '';
  const snoozedUntil =
    typeof raw.snoozedUntil === 'string' && raw.snoozedUntil.trim() ? raw.snoozedUntil : null;
  const updatedAt =
    typeof raw.updatedAt === 'string' && raw.updatedAt ? raw.updatedAt : new Date(0).toISOString();
  const updatedBy = typeof raw.updatedBy === 'string' && raw.updatedBy ? raw.updatedBy : ownerId;
  return {
    peerId,
    notes,
    tags: normalizeTags(raw.tags),
    snoozedUntil,
    updatedAt,
    updatedBy,
  };
}

/** Load a single overlay — only for the authenticated owner. */
export async function getSupportCrmOverlay(
  db: Firestore,
  ownerId: string,
  peerId: string
): Promise<SupportCrmOverlay | null> {
  const snap = await db.doc(overlayPath(ownerId, peerId)).get();
  if (!snap.exists) return null;
  return normalizeOverlay(peerId, ownerId, snap.data());
}

/** Load overlays for many peers in one owner's CRM only. Never cross-user. */
export async function loadSupportCrmOverlays(
  db: Firestore,
  ownerId: string,
  peerIds: string[]
): Promise<Map<string, SupportCrmOverlay>> {
  const unique = [...new Set(peerIds.filter(Boolean))].slice(0, 500);
  const map = new Map<string, SupportCrmOverlay>();
  if (!unique.length) return map;

  const chunkSize = 40;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const snaps = await Promise.all(chunk.map((peerId) => db.doc(overlayPath(ownerId, peerId)).get()));
    snaps.forEach((snap, index) => {
      if (!snap.exists) return;
      const overlay = normalizeOverlay(chunk[index], ownerId, snap.data());
      if (overlay) map.set(chunk[index], overlay);
    });
  }
  return map;
}

export async function patchSupportCrmOverlay(
  db: Firestore,
  ownerId: string,
  peerId: string,
  patch: SupportCrmOverlayPatch
): Promise<SupportCrmOverlay> {
  if (!ownerId || !peerId || ownerId === peerId) {
    throw new Error('Invalid CRM peer.');
  }
  const ref = db.doc(overlayPath(ownerId, peerId));
  const existing = await ref.get();
  const prev = normalizeOverlay(peerId, ownerId, existing.data()) || {
    peerId,
    notes: '',
    tags: [] as string[],
    snoozedUntil: null as string | null,
    updatedAt: new Date(0).toISOString(),
    updatedBy: ownerId,
  };

  const next: SupportCrmOverlay = {
    peerId,
    notes: typeof patch.notes === 'string' ? patch.notes.slice(0, 2000) : prev.notes,
    tags: patch.tags !== undefined ? normalizeTags(patch.tags) : prev.tags,
    snoozedUntil:
      patch.snoozedUntil === undefined
        ? prev.snoozedUntil
        : patch.snoozedUntil === null || patch.snoozedUntil === ''
          ? null
          : patch.snoozedUntil,
    updatedAt: new Date().toISOString(),
    updatedBy: ownerId,
  };

  await ref.set(
    {
      notes: next.notes,
      tags: next.tags,
      snoozedUntil: next.snoozedUntil,
      updatedAt: next.updatedAt,
      updatedBy: next.updatedBy,
      peerId,
    },
    { merge: true }
  );

  return next;
}

function isSnoozed(overlay: SupportCrmOverlay | null, nowMs: number): boolean {
  if (!overlay?.snoozedUntil) return false;
  const until = Date.parse(overlay.snoozedUntil);
  return Number.isFinite(until) && until > nowMs;
}

function lastActivity(row: SupportRelationshipRow): { at: string | null; label: string } {
  const candidates: Array<{ at: string; label: string }> = [];
  if (row.engagement?.lastPurchaseAt) {
    candidates.push({ at: row.engagement.lastPurchaseAt, label: 'Last purchase' });
  }
  if (row.engagement?.lastQualifiedAt) {
    candidates.push({ at: row.engagement.lastQualifiedAt, label: 'Last qualified listen' });
  }
  if (row.updatedAt) {
    candidates.push({ at: row.updatedAt, label: 'Relationship updated' });
  }
  if (row.createdAt) {
    candidates.push({ at: row.createdAt, label: 'Started supporting' });
  }
  candidates.sort((a, b) => b.at.localeCompare(a.at));
  const top = candidates[0];
  return top ? { at: top.at, label: top.label } : { at: null, label: 'No recent activity yet' };
}

export function deriveSupporterPriority(input: {
  row: SupportRelationshipRow;
  overlay: SupportCrmOverlay | null;
  nowMs?: number;
}): { priority: SupporterPriority; reasons: string[] } {
  const nowMs = input.nowMs ?? Date.now();
  const { row, overlay } = input;
  const reasons: string[] = [];

  if (isSnoozed(overlay, nowMs)) {
    reasons.push('You snoozed this follow-up');
    return { priority: 'snoozed', reasons };
  }

  const paidPeriod = row.engagement?.periodPaidCents || 0;
  const purchases = row.engagement?.purchaseCount || 0;
  const listenDays = row.engagement?.qualifiedListeningDays || 0;
  const lastListen = row.engagement?.lastQualifiedAt;
  const recentListen =
    lastListen && Date.parse(lastListen) > nowMs - 14 * 24 * 60 * 60 * 1000;

  if (paidPeriod > 0) {
    reasons.push('Paid support in this window');
  }
  if (purchases >= 2) {
    reasons.push('Repeat buyer');
  }
  if (recentListen) {
    reasons.push('Qualified listen in the last 14 days');
  }
  if (row.innerCircle) {
    reasons.push('In your Inner Circle');
  }
  if (row.mutual) {
    reasons.push('Mutual support');
  }
  if (listenDays >= 3) {
    reasons.push(`${listenDays} qualified listen days`);
  }
  if (overlay?.notes?.trim()) {
    reasons.push('You left a private note');
  }
  if (overlay?.tags?.length) {
    reasons.push(`Tagged: ${overlay.tags.slice(0, 3).join(', ')}`);
  }

  if (paidPeriod > 0 || purchases >= 2 || (purchases > 0 && recentListen)) {
    if (!reasons.length) reasons.push('Strong purchase signal');
    return { priority: 'hot', reasons };
  }

  if (row.innerCircle || row.mutual || recentListen || listenDays >= 2) {
    if (!reasons.length) reasons.push('Active relationship');
    return { priority: 'warm', reasons };
  }

  if (row.updatedAt || row.createdAt) {
    const unique = [...new Set(reasons.length ? reasons : ['Follows you — room to deepen'])];
    return { priority: 'nurture', reasons: unique };
  }

  return { priority: 'cold', reasons: reasons.length ? reasons : ['Quiet for now'] };
}

export function deriveRecommendedAction(input: {
  priority: SupporterPriority;
  row: SupportRelationshipRow;
  overlay: SupportCrmOverlay | null;
  hasProfile: boolean;
}): SupportCrmRecommendedAction {
  const { priority, row, overlay, hasProfile } = input;
  if (priority === 'snoozed') return 'none';
  if (priority === 'hot' && !overlay?.notes?.trim()) return 'add_note';
  if (priority === 'hot' && !row.innerCircle) return 'inner_circle_on';
  if (priority === 'warm' && !row.innerCircle && (row.engagement?.qualifiedListeningDays || 0) >= 2) {
    return 'inner_circle_on';
  }
  if (priority === 'nurture') return hasProfile ? 'open_profile' : 'add_note';
  if (priority === 'cold') return 'snooze';
  if (hasProfile) return 'open_profile';
  return 'add_note';
}

function toPerson(
  row: SupportRelationshipRow,
  overlay: SupportCrmOverlay | null,
  nowMs: number
): ArtistIntelligencePerson {
  const { priority, reasons } = deriveSupporterPriority({ row, overlay, nowMs });
  const activity = lastActivity(row);
  const recommendedAction = deriveRecommendedAction({
    priority,
    row,
    overlay,
    hasProfile: Boolean(row.profileSlug),
  });
  return {
    peerId: row.userId,
    displayName: row.displayName,
    profileSlug: row.profileSlug,
    innerCircle: row.innerCircle,
    mutual: row.mutual === true,
    priority,
    reasons: reasons.slice(0, 4),
    lastActivityAt: activity.at,
    lastActivityLabel: activity.label,
    recommendedAction,
    recommendedActionLabel: supportCrmRecommendedActionLabel(recommendedAction),
    overlay,
    engagement: row.engagement
      ? {
          qualifiedListeningDays: row.engagement.qualifiedListeningDays,
          purchaseCount: row.engagement.purchaseCount,
          totalPaidCents: row.engagement.totalPaidCents,
          periodPaidCents: row.engagement.periodPaidCents,
          lastQualifiedAt: row.engagement.lastQualifiedAt,
          lastPurchaseAt: row.engagement.lastPurchaseAt,
        }
      : undefined,
  };
}

const PRIORITY_RANK: Record<SupporterPriority, number> = {
  hot: 0,
  warm: 1,
  nurture: 2,
  cold: 3,
  snoozed: 4,
};

/**
 * Artist Intelligence summary for the authenticated owner only.
 * Overlays from other users are never loaded or returned.
 */
export async function getArtistIntelligenceSummary(
  db: Firestore,
  ownerId: string,
  windowDays: SupportAnalyticsWindow = 30
): Promise<ArtistIntelligenceSummary> {
  const dashboard = await getSupportDashboard(db, ownerId, windowDays);
  const peerIds = dashboard.followers.map((row) => row.userId);
  const overlays = await loadSupportCrmOverlays(db, ownerId, peerIds);
  const nowMs = Date.now();

  const people = dashboard.followers
    .map((row) => toPerson(row, overlays.get(row.userId) || null, nowMs))
    .sort((a, b) => {
      const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (rank !== 0) return rank;
      const aPaid = a.engagement?.periodPaidCents || 0;
      const bPaid = b.engagement?.periodPaidCents || 0;
      if (bPaid !== aPaid) return bPaid - aPaid;
      return (b.lastActivityAt || '').localeCompare(a.lastActivityAt || '');
    });

  const counts = { hot: 0, warm: 0, nurture: 0, snoozed: 0, cold: 0 };
  for (const person of people) {
    counts[person.priority] += 1;
  }

  return {
    windowDays,
    totals: {
      people: people.length,
      ...counts,
      followers: dashboard.totals.followers,
      innerCircle: dashboard.totals.innerCircleSupporters,
      periodGrossCents: dashboard.analytics.periodGrossCents,
      qualifiedListeners: dashboard.analytics.activeFollowerListeners,
    },
    people,
    copy: {
      emptyPeople:
        'No supporters in your circle yet. Share a live profile or release — people who follow you will show up here with a clear next step.',
      privacyNote:
        'Notes, tags, and snoozes stay private on your account. Other artists never see your CRM overlays.',
    },
  };
}
