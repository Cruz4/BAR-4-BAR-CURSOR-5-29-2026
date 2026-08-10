import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { normalizeMarketingRef } from '@/lib/marketing-attribution';
import {
  LOCK_FUNNEL_EVENTS,
  type LockFunnelEventName,
  type LockFunnelMetadata,
} from '@/lib/lock-funnel-events';
import { guestAliasFromId, normalizeGuestAlias, normalizeGuestId } from '@/lib/guest-identity';
import { enqueueAdminAlert } from '@/lib/server/admin-alerts';

const COLLECTION = 'studio_lock_funnel_events';

/** High-signal → Telegram / in-app admin feed (skip typed — drop-off signal only in metrics). */
const TELEGRAM_ALERT_EVENTS = new Set<LockFunnelEventName>([
  LOCK_FUNNEL_EVENTS.OPEN,
  LOCK_FUNNEL_EVENTS.SUBMIT,
  LOCK_FUNNEL_EVENTS.BRANCH,
  LOCK_FUNNEL_EVENTS.SHARE_CARD,
  LOCK_FUNNEL_EVENTS.NAME_CTA,
  LOCK_FUNNEL_EVENTS.WHERE_NEXT,
  LOCK_FUNNEL_EVENTS.STUDIO,
  LOCK_FUNNEL_EVENTS.WRITE_ANOTHER,
  LOCK_FUNNEL_EVENTS.BLOODLINE,
  LOCK_FUNNEL_EVENTS.SIGNUP_CTA,
]);

function sanitizeMetadata(meta: LockFunnelMetadata | undefined): LockFunnelMetadata {
  if (!meta || typeof meta !== 'object') return {};
  const out: LockFunnelMetadata = {};
  for (const [key, value] of Object.entries(meta).slice(0, 20)) {
    const k = key.slice(0, 40);
    if (typeof value === 'string') out[k] = value.slice(0, 120);
    else if (typeof value === 'number' && Number.isFinite(value)) out[k] = value;
    else if (typeof value === 'boolean') out[k] = value;
    else if (value === null) out[k] = null;
  }
  return out;
}

function resolveRef(raw?: string | null): string {
  const rawRef = raw?.trim().toLowerCase();
  if (!rawRef || rawRef === 'organic') return 'organic';
  return normalizeMarketingRef(rawRef) || 'organic';
}

function resolveGuestLabel(metadata: LockFunnelMetadata): {
  guestId: string | null;
  guestAlias: string | null;
} {
  const guestId = normalizeGuestId(metadata.guestId);
  const guestAlias =
    normalizeGuestAlias(metadata.guestAlias) || (guestId ? guestAliasFromId(guestId) : null);
  return { guestId, guestAlias };
}

function lockAlertCopy(
  event: LockFunnelEventName,
  metadata: LockFunnelMetadata
): { method: string; detail: string | null } {
  const lockId = typeof metadata.lockId === 'string' ? metadata.lockId : 'lock';
  const score =
    typeof metadata.lockScore === 'number' ? `LOCK ${metadata.lockScore}` : null;

  switch (event) {
    case LOCK_FUNNEL_EVENTS.OPEN:
      return {
        method: 'Opened LOCK',
        detail: metadata.isHouse === true ? 'house dare' : lockId.slice(0, 12),
      };
    case LOCK_FUNNEL_EVENTS.SUBMIT:
      return {
        method: 'Locked a bar',
        detail: [score, metadata.branched === true ? 'branched' : 'on seed']
          .filter(Boolean)
          .join(' · ') || null,
      };
    case LOCK_FUNNEL_EVENTS.BRANCH:
      return {
        method: 'Answered after someone else',
        detail: score,
      };
    case LOCK_FUNNEL_EVENTS.SHARE_CARD:
      return { method: 'Shared reply card', detail: score };
    case LOCK_FUNNEL_EVENTS.NAME_CTA:
      return {
        method: 'Tapped save name on reply',
        detail: typeof metadata.source === 'string' ? metadata.source : null,
      };
    case LOCK_FUNNEL_EVENTS.WHERE_NEXT:
      return {
        method: 'Chose next step',
        detail: typeof metadata.destination === 'string' ? metadata.destination : null,
      };
    case LOCK_FUNNEL_EVENTS.STUDIO:
      return { method: 'Opened Studio from finish-the-bar', detail: lockId.slice(0, 12) };
    case LOCK_FUNNEL_EVENTS.WRITE_ANOTHER:
      return { method: 'Writing another reply', detail: lockId.slice(0, 12) };
    case LOCK_FUNNEL_EVENTS.BLOODLINE:
      return { method: 'Opened all replies', detail: lockId.slice(0, 12) };
    case LOCK_FUNNEL_EVENTS.SIGNUP_CTA:
      return {
        method: 'Finish-the-bar signup CTA',
        detail: typeof metadata.source === 'string' ? metadata.source : null,
      };
    case LOCK_FUNNEL_EVENTS.TYPED:
      return { method: 'Started typing a reply', detail: null };
    default:
      return { method: event, detail: null };
  }
}

/** Persist a LOCK funnel step + Telegram for high-signal actions. */
export async function recordLockFunnelEvent(
  event: LockFunnelEventName,
  options?: { ref?: string | null; metadata?: LockFunnelMetadata }
): Promise<void> {
  const ref = resolveRef(options?.ref);
  const metadata = sanitizeMetadata(options?.metadata);
  const { guestId, guestAlias } = resolveGuestLabel(metadata);
  if (guestId) metadata.guestId = guestId;
  if (guestAlias) metadata.guestAlias = guestAlias;

  const lockId = typeof metadata.lockId === 'string' ? metadata.lockId : 'house';
  const path = `/lock/${encodeURIComponent(lockId)}`;

  if (TELEGRAM_ALERT_EVENTS.has(event)) {
    const { method, detail } = lockAlertCopy(event, metadata);
    const who =
      (typeof metadata.authorName === 'string' && metadata.authorName) ||
      guestAlias ||
      (typeof metadata.userName === 'string' && metadata.userName) ||
      'Visitor';
    await enqueueAdminAlert({
      kind: 'lock_funnel',
      ref,
      method: `${who} · ${method}`,
      detail,
      path,
      guestId,
      guestAlias,
      userId: typeof metadata.userId === 'string' ? metadata.userId : null,
      userName: typeof metadata.userName === 'string' ? metadata.userName : null,
    });
  }

  if (!hasAdminFirestoreCredentials()) return;

  try {
    const db = await getDb();
    await db.collection(COLLECTION).add({
      event,
      ref,
      lockId: typeof metadata.lockId === 'string' ? metadata.lockId : null,
      guestId: guestId || null,
      guestAlias: guestAlias || null,
      metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[recordLockFunnelEvent] skipped:', (error as Error).message);
  }
}
