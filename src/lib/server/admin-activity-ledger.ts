import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { describeLandingVisit, describeStudioActivity } from '@/lib/admin-activity-detail';

export const ADMIN_ACTIVITY_PAGE_SIZE = 150;

export type AdminActivitySource = 'studio' | 'visits';

export type AdminActivityRow = {
  id: string;
  timestamp: string;
  source: AdminActivitySource;
  event: string;
  summary: string;
  artistName: string | null;
  artistEmail: string | null;
  artistSlug: string | null;
  userId: string | null;
  guestAlias: string | null;
  path: string | null;
  ipHash?: string | null;
  uaFamily?: string | null;
  botLikely?: boolean;
  referrer?: string | null;
};

type ArtistLabel = {
  name: string | null;
  email: string | null;
  slug: string | null;
};

function asIso(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return value;
  }
  return '';
}

function decodeCursor(raw: string | null): { timestamp: string; id: string } | null {
  if (!raw) return null;
  const sep = raw.indexOf('::');
  if (sep <= 0) return null;
  const timestamp = raw.slice(0, sep);
  const id = raw.slice(sep + 2);
  if (!timestamp || !id) return null;
  return { timestamp, id };
}

export function encodeActivityCursor(timestamp: string, id: string): string {
  return `${timestamp}::${id}`;
}

async function loadArtistLabels(
  db: Awaited<ReturnType<typeof getDb>>,
  userIds: string[]
): Promise<Record<string, ArtistLabel>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return {};
  const entries = await Promise.all(
    unique.map(async (userId) => {
      try {
        const [userSnap, gamSnap] = await Promise.all([
          db.doc(`users/${userId}`).get(),
          db.doc(`users/${userId}/gamification/summary`).get(),
        ]);
        const user = userSnap.data() || {};
        const gam = gamSnap.data() || {};
        const name =
          (typeof user.displayName === 'string' && user.displayName.trim()) ||
          (typeof user.email === 'string' && user.email.trim()) ||
          null;
        const email = typeof user.email === 'string' && user.email.trim() ? user.email.trim() : null;
        const slug =
          typeof gam.profileSlug === 'string' && gam.profileSlug.trim()
            ? gam.profileSlug.trim()
            : typeof user.slug === 'string' && user.slug.trim()
              ? user.slug.trim()
              : null;
        return [userId, { name, email, slug }] as const;
      } catch {
        return [userId, { name: null, email: null, slug: null }] as const;
      }
    })
  );
  return Object.fromEntries(entries);
}

export async function listAdminActivity(opts: {
  source: AdminActivitySource;
  cursor?: string | null;
  limit?: number;
}): Promise<{ rows: AdminActivityRow[]; nextCursor: string | null }> {
  if (!hasAdminFirestoreCredentials()) return { rows: [], nextCursor: null };

  const pageSize = Math.min(Math.max(opts.limit ?? ADMIN_ACTIVITY_PAGE_SIZE, 1), 300);
  const db = await getDb();
  const cursor = decodeCursor(opts.cursor ?? null);
  const collection = opts.source === 'visits' ? 'studio_landing_hits' : 'analytics_events';

  let query = db.collection(collection).orderBy('timestamp', 'desc');
  if (cursor) {
    const cursorSnap = await db.collection(collection).doc(cursor.id).get();
    if (cursorSnap.exists) {
      query = query.startAfter(cursorSnap);
    } else {
      query = query.startAfter(cursor.timestamp);
    }
  }

  const snap = await query.limit(pageSize + 1).get();
  const hasMore = snap.docs.length > pageSize;
  const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;

  if (opts.source === 'visits') {
    const rows: AdminActivityRow[] = docs.map((doc) => {
      const data = doc.data() || {};
      const path = typeof data.path === 'string' ? data.path : null;
      const ref = typeof data.ref === 'string' ? data.ref : null;
      const guestAlias = typeof data.guestAlias === 'string' ? data.guestAlias : null;
      const uaFamily = typeof data.uaFamily === 'string' ? data.uaFamily : null;
      const userName = typeof data.userName === 'string' ? data.userName : null;
      const userEmail = typeof data.userEmail === 'string' ? data.userEmail : null;
      const userId = typeof data.userId === 'string' ? data.userId : null;
      const referrer = typeof data.referrer === 'string' ? data.referrer : null;
      const ipHash = typeof data.ipHash === 'string' ? data.ipHash : null;
      return {
        id: doc.id,
        timestamp: asIso(data.timestamp) || new Date(0).toISOString(),
        source: 'visits',
        event: 'landing_hit',
        summary: describeLandingVisit({
          path,
          ref,
          guestAlias,
          uaFamily,
          botLikely: data.botLikely === true,
          userName,
          userEmail,
          referrer,
          ipHash,
        }),
        artistName: userName,
        artistEmail: userEmail,
        artistSlug: null,
        userId,
        guestAlias,
        path,
        ipHash,
        uaFamily,
        botLikely: data.botLikely === true,
        referrer,
      };
    });
    const last = rows[rows.length - 1];
    return {
      rows,
      nextCursor: hasMore && last ? encodeActivityCursor(last.timestamp, last.id) : null,
    };
  }

  const userIds = docs
    .map((doc) => (typeof doc.data()?.userId === 'string' ? String(doc.data().userId) : ''))
    .filter(Boolean);
  const labels = await loadArtistLabels(db, userIds);

  const rows: AdminActivityRow[] = docs.map((doc) => {
    const data = doc.data() || {};
    const userId = typeof data.userId === 'string' ? data.userId : null;
    const storedName = typeof data.userName === 'string' && data.userName.trim() ? data.userName.trim() : null;
    const label = userId ? labels[userId] : undefined;
    const metadata = (data.metadata as Record<string, unknown>) || {};
    const path = typeof metadata.path === 'string' ? metadata.path : typeof data.path === 'string' ? data.path : null;
    return {
      id: doc.id,
      timestamp: asIso(data.timestamp) || new Date(0).toISOString(),
      source: 'studio',
      event: String(data.event || 'event'),
      summary: describeStudioActivity(String(data.event || ''), metadata),
      artistName: label?.name || storedName,
      artistEmail: label?.email || null,
      artistSlug: label?.slug || null,
      userId,
      guestAlias: null,
      path,
    };
  });

  const last = rows[rows.length - 1];
  return {
    rows,
    nextCursor: hasMore && last ? encodeActivityCursor(last.timestamp, last.id) : null,
  };
}
