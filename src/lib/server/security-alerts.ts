import 'server-only';

import { enqueueAdminAlert } from '@/lib/server/admin-alerts';
import { allowOnce } from '@/lib/server/landing-hit-guard';
import { incrementWindowCount } from '@/lib/server/rate-limit';
import { isMasterAdminEmail } from '@/lib/server/master-admin';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  classifyUserAgent,
  clientIpFromRequest,
  hashVisitorIp,
} from '@/lib/server/visit-fingerprint';

const HOUR_MS = 60 * 60_000;
const TEN_MIN_MS = 10 * 60_000;
const INK_SPIKE_USER_MAX = 150;
const INK_SPIKE_GLOBAL_MAX = 500;
const SIGNUP_BURST_MAX = 10;

function safePath(req: Request): string {
  try {
    return new URL(req.url).pathname.slice(0, 120);
  } catch {
    return '/api/admin';
  }
}

export async function notifyAdminDenied(
  req: Request,
  extra?: { email?: string | null; detail?: string | null }
): Promise<void> {
  try {
    const ipHash = hashVisitorIp(clientIpFromRequest(req));
    if (!(await allowOnce(`admin-denied:${ipHash}`, HOUR_MS))) return;
    const ua = classifyUserAgent(req.headers.get('user-agent'));
    await enqueueAdminAlert({
      kind: 'admin_denied',
      path: safePath(req),
      userEmail: extra?.email || null,
      method: ua.family,
      detail: extra?.detail || (ua.botLikely ? 'bot-like client' : 'browser-like client'),
    });
  } catch (error) {
    console.warn('[security-alerts] admin_denied skipped:', (error as Error).message);
  }
}

export async function notifyAdminRoleChange(input: {
  actorEmail: string;
  targetUserId: string;
  targetEmail?: string | null;
  role: 'admin' | 'artist';
}): Promise<void> {
  const target = input.targetEmail || input.targetUserId.slice(0, 12);
  await enqueueAdminAlert({
    kind: 'admin_role',
    userEmail: input.actorEmail,
    userId: input.targetUserId,
    method: input.role,
    detail: `${input.actorEmail} set ${target} to ${input.role}`,
  });
}

export async function notifyAdminEradicate(input: {
  actorEmail: string;
  targetUserId: string;
  detail: string;
}): Promise<void> {
  await enqueueAdminAlert({
    kind: 'admin_action',
    userEmail: input.actorEmail,
    userId: input.targetUserId,
    method: 'eradicate',
    detail: input.detail,
  });
}

export async function notifyAdminInkGrant(input: {
  actorEmail: string;
  targetUserId: string;
  amount: number;
  pool: 'residency' | 'permanent';
}): Promise<void> {
  const signed = input.amount > 0 ? `+${input.amount}` : String(input.amount);
  await enqueueAdminAlert({
    kind: 'admin_action',
    userEmail: input.actorEmail,
    userId: input.targetUserId,
    method: 'ink_grant',
    detail: `${signed} ${input.pool} ink → ${input.targetUserId.slice(0, 12)}…`,
  });
}

export async function notifyAdminNewDevice(input: {
  email?: string | null;
  uid: string;
  browser: string;
  operatingSystem: string;
}): Promise<void> {
  try {
    let adminAccount = isMasterAdminEmail(input.email);
    if (!adminAccount && hasAdminFirestoreCredentials()) {
      const db = await getDb();
      const snap = await db.doc(`users/${input.uid}`).get();
      adminAccount = snap.data()?.role === 'admin';
    }
    if (!adminAccount) return;
    if (!(await allowOnce(`admin-device:${input.uid}`, HOUR_MS))) return;
    await enqueueAdminAlert({
      kind: 'admin_device',
      userEmail: input.email || null,
      userId: input.uid,
      method: `${input.browser} / ${input.operatingSystem}`,
      detail: `${input.email || input.uid.slice(0, 12)} signed in on a new device`,
    });
  } catch (error) {
    console.warn('[security-alerts] admin_device skipped:', (error as Error).message);
  }
}

export async function noteInkSpike(input: {
  userId: string;
  userName?: string | null;
  amount: number;
  actionName: string;
}): Promise<void> {
  try {
    const userWindow = await incrementWindowCount(
      `ink-spike:${input.userId}`,
      input.amount,
      INK_SPIKE_USER_MAX,
      TEN_MIN_MS
    );
    const globalWindow = await incrementWindowCount(
      'ink-spike:global',
      input.amount,
      INK_SPIKE_GLOBAL_MAX,
      TEN_MIN_MS
    );

    if (userWindow.crossed && (await allowOnce(`ink-spike-notify:${input.userId}`, TEN_MIN_MS))) {
      await enqueueAdminAlert({
        kind: 'ink_spike',
        userId: input.userId,
        userName: input.userName || null,
        method: input.actionName,
        detail: `${input.userName || input.userId.slice(0, 12)} spent ${userWindow.count} Ink in 10 min (${input.actionName})`,
      });
    } else if (
      globalWindow.crossed &&
      (await allowOnce('ink-spike-notify:global', TEN_MIN_MS))
    ) {
      await enqueueAdminAlert({
        kind: 'ink_spike',
        method: 'global',
        detail: `Studio burned ${globalWindow.count} Ink in 10 min`,
      });
    }
  } catch (error) {
    console.warn('[security-alerts] ink_spike skipped:', (error as Error).message);
  }
}

export async function noteSignupBurst(ipHash: string): Promise<void> {
  try {
    const window = await incrementWindowCount(
      `signup-burst:${ipHash}`,
      1,
      SIGNUP_BURST_MAX,
      TEN_MIN_MS
    );
    if (!window.crossed) return;
    if (!(await allowOnce(`signup-burst-notify:${ipHash}`, TEN_MIN_MS))) return;
    await enqueueAdminAlert({
      kind: 'signup_burst',
      detail: `${window.count} new accounts from one network in 10 min`,
    });
  } catch (error) {
    console.warn('[security-alerts] signup_burst skipped:', (error as Error).message);
  }
}

export async function notifyStripeRisk(input: {
  eventType: string;
  detail: string;
  userEmail?: string | null;
}): Promise<void> {
  await enqueueAdminAlert({
    kind: 'stripe_risk',
    method: input.eventType,
    userEmail: input.userEmail || null,
    detail: input.detail,
  });
}

export async function notifyBlockedAiHit(input: {
  userId: string;
  email?: string | null;
}): Promise<void> {
  try {
    if (!(await allowOnce(`blocked-ai:${input.userId}`, HOUR_MS))) return;
    await enqueueAdminAlert({
      kind: 'blocked_ai',
      userId: input.userId,
      userEmail: input.email || null,
      detail: `${input.email || input.userId.slice(0, 12)} is blocked and still hit AI`,
    });
  } catch (error) {
    console.warn('[security-alerts] blocked_ai skipped:', (error as Error).message);
  }
}
