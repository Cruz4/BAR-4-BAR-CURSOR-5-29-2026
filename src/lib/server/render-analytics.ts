import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';

export async function recordRenderEvent(
  uid: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!hasAdminFirestoreCredentials()) return;
  try {
    const db = await getDb();
    await db.collection('system').doc('logs').collection('entries').add({
      type: 'render_analytics',
      event,
      userId: uid,
      timestamp: new Date().toISOString(),
      ...payload,
    });
  } catch (err) {
    console.warn('[render-analytics]', (err as Error).message);
  }
}
