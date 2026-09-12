import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { judgeVisitorCluster, type VisitorJudgement } from '@/lib/visitor-investigation';

export type VisitorClusterHit = {
  timestamp: string;
  path: string | null;
  guestAlias: string | null;
  userName: string | null;
  uaFamily: string | null;
  botLikely: boolean;
  ref: string | null;
};

export type VisitorCluster = {
  networkId: string;
  hits: number;
  firstAt: string;
  lastAt: string;
  uniqueGuests: number;
  pages: string[];
  browsers: string[];
  refs: string[];
  guests: string[];
  signedIn: string[];
  botHits: number;
  probePaths: string[];
  judgement: VisitorJudgement;
  recentHits: VisitorClusterHit[];
};

function asIso(value: unknown): string {
  if (typeof value === 'string' && value.trim()) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    return value;
  }
  return '';
}

export async function listVisitorClusters(opts?: {
  limit?: number;
}): Promise<{ clusters: VisitorCluster[] }> {
  if (!hasAdminFirestoreCredentials()) return { clusters: [] };

  const db = await getDb();
  const [hitsSnap, probeSnap] = await Promise.all([
    db.collection('studio_landing_hits').orderBy('timestamp', 'desc').limit(1500).get(),
    db.collection('studio_admin_alerts').orderBy('timestamp', 'desc').limit(400).get(),
  ]);

  const probesByNetwork = new Map<string, string[]>();
  for (const doc of probeSnap.docs) {
    const data = doc.data() || {};
    if (data.kind !== 'probe') continue;
    const networkId = typeof data.ipHash === 'string' ? data.ipHash : '';
    if (!networkId) continue;
    const path = typeof data.path === 'string' ? data.path : 'bait path';
    const list = probesByNetwork.get(networkId) || [];
    if (!list.includes(path)) list.push(path);
    probesByNetwork.set(networkId, list);
  }

  const grouped = new Map<string, Array<Record<string, unknown> & { timestamp: string }>>();
  for (const doc of hitsSnap.docs) {
    const data = doc.data() || {};
    const networkId = typeof data.ipHash === 'string' && data.ipHash.trim() ? data.ipHash.trim() : 'unknown';
    const timestamp = asIso(data.timestamp);
    const list = grouped.get(networkId) || [];
    list.push({ ...data, timestamp });
    grouped.set(networkId, list);
  }

  const clusters: VisitorCluster[] = [...grouped.entries()].map(([networkId, rows]) => {
    const ordered = [...rows].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const firstAt = ordered[0]?.timestamp || '';
    const lastAt = ordered[ordered.length - 1]?.timestamp || '';
    const firstMs = firstAt ? new Date(firstAt).getTime() : 0;
    const lastMs = lastAt ? new Date(lastAt).getTime() : 0;
    const guests = [
      ...new Set(rows.map((row) => (typeof row.guestAlias === 'string' ? row.guestAlias : '')).filter(Boolean)),
    ];
    const pages = [...new Set(rows.map((row) => (typeof row.path === 'string' ? row.path : '/')).filter(Boolean))];
    const browsers = [
      ...new Set(rows.map((row) => (typeof row.uaFamily === 'string' ? row.uaFamily : '')).filter(Boolean)),
    ];
    const refs = [...new Set(rows.map((row) => (typeof row.ref === 'string' ? row.ref : 'organic')))];
    const signedIn = [
      ...new Set(
        rows
          .map((row) => {
            const name = typeof row.userName === 'string' ? row.userName.trim() : '';
            const email = typeof row.userEmail === 'string' ? row.userEmail.trim() : '';
            if (name && email) return `${name} <${email}>`;
            return name || email;
          })
          .filter(Boolean)
      ),
    ];
    const botHits = rows.filter((row) => row.botLikely === true).length;
    const probePaths = probesByNetwork.get(networkId) || [];
    const referrerCount = rows.filter((row) => typeof row.referrer === 'string' && row.referrer.trim()).length;
    const sameOriginHits = rows.filter((row) => row.sameOrigin === true).length;

    const judgement = judgeVisitorCluster({
      hits: rows.length,
      durationMs: Math.max(0, lastMs - firstMs),
      uniqueGuests: guests.length,
      uniquePages: pages.length,
      botHits,
      browsers,
      sameOriginHits,
      referrerCount,
      signedInCount: signedIn.length,
      probeCount: probePaths.length,
    });

    return {
      networkId,
      hits: rows.length,
      firstAt,
      lastAt,
      uniqueGuests: guests.length,
      pages,
      browsers,
      refs,
      guests,
      signedIn,
      botHits,
      probePaths,
      judgement,
      recentHits: ordered
        .slice(-12)
        .reverse()
        .map((row) => ({
          timestamp: row.timestamp,
          path: typeof row.path === 'string' ? row.path : null,
          guestAlias: typeof row.guestAlias === 'string' ? row.guestAlias : null,
          userName: typeof row.userName === 'string' ? row.userName : null,
          uaFamily: typeof row.uaFamily === 'string' ? row.uaFamily : null,
          botLikely: row.botLikely === true,
          ref: typeof row.ref === 'string' ? row.ref : null,
        })),
    };
  });

  clusters.sort((a, b) => b.hits - a.hits || b.lastAt.localeCompare(a.lastAt));
  const limit = Math.min(Math.max(opts?.limit ?? 40, 1), 80);
  return { clusters: clusters.slice(0, limit) };
}
