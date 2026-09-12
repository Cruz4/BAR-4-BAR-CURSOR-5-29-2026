import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { marketingRefLabel } from '@/lib/marketing-attribution';
import type { AdminAlert, AdminAlertKind } from '@/lib/admin-alerts';
import { sendTelegramAdminAlert } from '@/lib/server/telegram-alerts';

const COLLECTION = 'studio_admin_alerts';

type EnqueueInput = {
  kind: AdminAlertKind;
  ref?: string | null;
  path?: string | null;
  userEmail?: string | null;
  userId?: string | null;
  userName?: string | null;
  method?: string | null;
  detail?: string | null;
  guestId?: string | null;
  guestAlias?: string | null;
  burstHeadline?: string | null;
  ipHash?: string | null;
};

type RefPresentation = {
  label: string | null;
  referralName: string | null;
};

async function resolveRefPresentation(ref: string | null | undefined): Promise<RefPresentation> {
  if (!ref?.trim()) return { label: null, referralName: null };

  const fallback = marketingRefLabel(ref);
  // Known campaign tags already have a human label and are not member referrals.
  if (fallback !== ref) return { label: fallback, referralName: null };
  const possibleReferralCode = ref.trim().toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(possibleReferralCode) || !hasAdminFirestoreCredentials()) {
    return { label: fallback, referralName: null };
  }

  try {
    const db = await getDb();
    const match = await db
      .collection('users')
      .where('referralCode', '==', possibleReferralCode)
      .limit(1)
      .get();
    const data = match.docs[0]?.data();
    const referralName =
      typeof data?.displayName === 'string' && data.displayName.trim()
        ? data.displayName.trim().slice(0, 120)
        : null;
    if (referralName) return { label: `${referralName} referral`, referralName };
  } catch (error) {
    console.warn('[enqueueAdminAlert] referral label lookup skipped:', (error as Error).message);
  }

  return { label: fallback, referralName: null };
}

function buildMessage(input: EnqueueInput, refLabel: string | null): string {
  if (input.kind === 'signup') {
    const who =
      input.userName && input.userEmail
        ? `${input.userName} <${input.userEmail}>`
        : input.userEmail || input.userName || 'New artist';
    const via = refLabel ? ` via ${refLabel}` : '';
    const method = input.method ? ` (${input.method})` : '';
    if (input.guestAlias) {
      return `${input.guestAlias} converted → ${who} signed up${via}${method}`;
    }
    return `${who} signed up${via}${method}`;
  }
  if (input.kind === 'pricing_view') {
    const who = input.userEmail || input.guestAlias || 'Visitor';
    const via = refLabel ? ` (${refLabel})` : '';
    return `${who} opened Pricing${via}`;
  }
  if (input.kind === 'checkout_started') {
    const who = input.userEmail || 'Artist';
    const detail = input.detail ? ` — ${input.detail}` : '';
    return `${who} started checkout${detail}`;
  }
  if (input.kind === 'guest_try') {
    const via = refLabel && input.ref !== 'organic' ? ` · ${refLabel}` : '';
    const detail = input.detail ? ` — ${input.detail}` : '';
    return `${input.method || 'Try sheet activity'}${via}${detail}`;
  }
  if (input.kind === 'guest_pressing') {
    const via = refLabel && input.ref !== 'organic' ? ` · ${refLabel}` : '';
    const detail = input.detail ? ` — ${input.detail}` : '';
    return `${input.method || 'Profile sandbox'}${via}${detail}`;
  }
  if (input.kind === 'lock_funnel') {
    const via = refLabel && input.ref !== 'organic' ? ` · ${refLabel}` : '';
    const detail = input.detail ? ` — ${input.detail}` : '';
    return `${input.method || 'Finish this bar activity'}${via}${detail}`;
  }
  if (input.kind === 'landing_burst') {
    return input.burstHeadline || input.detail || 'Many public page loads in a short window.';
  }
  if (input.kind === 'probe') {
    return `Scanner requested ${input.path || 'a bait path'}`;
  }
  if (input.kind === 'admin_denied') {
    const who = input.userEmail ? ` (${input.userEmail})` : '';
    return `Admin API denied on ${input.path || '/api/admin'}${who}`;
  }
  if (input.kind === 'admin_role') {
    return input.detail || `${input.userEmail || 'Admin'} changed a studio role`;
  }
  if (input.kind === 'admin_action') {
    if (input.method === 'eradicate') {
      return `${input.userEmail || 'Admin'} eradicated an account${input.detail ? ` — ${input.detail}` : ''}`;
    }
    return `${input.userEmail || 'Admin'} adjusted Ink${input.detail ? ` — ${input.detail}` : ''}`;
  }
  if (input.kind === 'admin_device') {
    return input.detail || `New device on an admin account${input.method ? ` (${input.method})` : ''}`;
  }
  if (input.kind === 'ink_spike') {
    return input.detail || 'Ink spend spiked';
  }
  if (input.kind === 'signup_burst') {
    return input.detail || 'Many new accounts from one network';
  }
  if (input.kind === 'stripe_risk') {
    return input.detail || `Stripe ${input.method || 'risk'} event`;
  }
  if (input.kind === 'blocked_ai') {
    return input.detail || 'A blocked account hit AI';
  }
  if (input.kind === 'landing_hit') {
    const page = input.path || '/';
    const via = refLabel ? ` from ${refLabel}` : '';
    if (input.userName || input.userEmail) {
      const who =
        input.userName && input.userEmail
          ? `${input.userName} <${input.userEmail}>`
          : input.userEmail || input.userName || 'Signed-in artist';
      return `${who} visited${via} on ${page}`;
    }
    const who = input.guestAlias || 'Anonymous visitor';
    return `${who} visited${via} on ${page}`;
  }
  return input.detail || `Alert ${input.kind}`;
}

export async function enqueueAdminAlert(input: EnqueueInput): Promise<void> {
  const refPresentation = await resolveRefPresentation(input.ref);
  const message = buildMessage(input, refPresentation.label);

  await sendTelegramAdminAlert({
    kind: input.kind,
    message,
    ref: input.ref,
    path: input.path,
    userEmail: input.userEmail,
    userId: input.userId,
    userName: input.userName,
    method: input.method,
    detail: input.detail,
    guestId: input.guestId,
    guestAlias: input.guestAlias,
    refLabel: refPresentation.label,
    referralName: refPresentation.referralName,
    ipHash: input.ipHash,
  });

  if (!hasAdminFirestoreCredentials()) return;
  try {
    const db = await getDb();
    const timestamp = new Date().toISOString();
    await db.collection(COLLECTION).add({
      kind: input.kind,
      message,
      ref: input.ref || null,
      path: input.path || null,
      userEmail: input.userEmail || null,
      userId: input.userId || null,
      userName: input.userName || null,
      method: input.method || null,
      detail: input.detail || null,
      guestId: input.guestId || null,
      guestAlias: input.guestAlias || null,
      refLabel: refPresentation.label,
      ipHash: input.ipHash || null,
      timestamp,
    });
  } catch (error) {
    console.warn('[enqueueAdminAlert] skipped:', (error as Error).message);
  }
}

export async function listAdminAlertsSince(since: string): Promise<AdminAlert[]> {
  if (!hasAdminFirestoreCredentials()) return [];
  const db = await getDb();
  const sinceDate = new Date(since);
  if (Number.isNaN(sinceDate.getTime())) return [];

  const snap = await db
    .collection(COLLECTION)
    .where('timestamp', '>', since)
    .orderBy('timestamp', 'asc')
    .limit(40)
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      kind: data.kind as AdminAlertKind,
      message: String(data.message || ''),
      timestamp: String(data.timestamp || ''),
      ref: data.ref ?? null,
      path: data.path ?? null,
      userEmail: data.userEmail ?? null,
      userId: data.userId ?? null,
      method: data.method ?? null,
      detail: data.detail ?? null,
      guestId: data.guestId ?? null,
      guestAlias: data.guestAlias ?? null,
    };
  });
}
