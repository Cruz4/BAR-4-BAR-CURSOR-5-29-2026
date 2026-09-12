import 'server-only';

import { getAuth, hasAdminFirestoreCredentials } from '@/lib/firebase/server';

/** Firebase Auth lastSignInTime by uid — one paginated listUsers pass. */
export async function loadAuthLastSignInMap(): Promise<Record<string, string>> {
  if (!hasAdminFirestoreCredentials()) return {};
  const auth = await getAuth();
  const map: Record<string, string> = {};
  let pageToken: string | undefined;
  try {
    do {
      const page = await auth.listUsers(1000, pageToken);
      for (const record of page.users) {
        const raw = record.metadata.lastSignInTime;
        if (!raw) continue;
        const at = new Date(raw);
        if (!Number.isNaN(at.getTime())) map[record.uid] = at.toISOString();
      }
      pageToken = page.pageToken;
    } while (pageToken);
  } catch (error) {
    console.warn('[auth-last-sign-in] listUsers skipped', (error as Error).message);
  }
  return map;
}
