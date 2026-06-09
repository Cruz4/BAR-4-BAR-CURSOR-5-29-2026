import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { marketingRefLabel } from '@/lib/marketing-attribution';
import type { AdminAlert, AdminAlertKind } from '@/lib/admin-alerts';

const COLLECTION = 'studio_admin_alerts';

type EnqueueInput = {
  kind: AdminAlertKind;
  ref?: string | null;
  path?: string | null;
  userEmail?: string | null;
  userId?: string | null;
  method?: string | null;
};

function buildMessage(input: EnqueueInput): string {
  const refLabel = input.ref ? marketingRefLabel(input.ref) : null;
  if (input.kind === 'signup') {
    const who = input.userEmail || 'New artist';
    const via = refLabel ? ` via ${refLabel}` : '';
    const method = input.method ? ` (${input.method})` : '';
    return `${who} signed up${via}${method}`;
  }
  const page = input.path || '/';
  const via = refLabel ? ` from ${refLabel}` : '';
  return `Landing hit${via} on ${page}`;
}

export async function enqueueAdminAlert(input: EnqueueInput): Promise<void> {
  if (!hasAdminFirestoreCredentials()) return;
  try {
    const db = await getDb();
    const timestamp = new Date().toISOString();
    await db.collection(COLLECTION).add({
      kind: input.kind,
      message: buildMessage(input),
      ref: input.ref || null,
      path: input.path || null,
      userEmail: input.userEmail || null,
      userId: input.userId || null,
      method: input.method || null,
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
    .limit(25)
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
    };
  });
}
