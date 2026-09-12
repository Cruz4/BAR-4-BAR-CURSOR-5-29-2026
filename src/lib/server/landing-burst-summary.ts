import 'server-only';

import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import { BURST_WINDOW_MS } from '@/lib/server/landing-hit-guard';

export type LandingBurstScope = 'network' | 'global';

export type LandingBurstSummary = {
  scope: LandingBurstScope;
  seen: number;
  recorded: number;
  uniqueNetworks: number;
  networkId: string | null;
  pages: string;
  who: string;
  signedIn: string;
  guests: string;
  browsers: string;
  refs: string;
  bots: number;
  cameFrom: string;
};

function countMap(values: Array<string | null | undefined>): string {
  const map = new Map<string, number>();
  for (const raw of values) {
    const key = (raw || '').trim() || 'unknown';
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([key, count]) => `${key}×${count}`)
    .join(', ');
}

function uniqueList(values: Array<string | null | undefined>, empty: string): string {
  const items = [...new Set(values.map((v) => (v || '').trim()).filter(Boolean))];
  return items.length ? items.slice(0, 8).join(', ') : empty;
}

export function formatLandingBurstDetail(summary: LandingBurstSummary): string {
  const lines = [
    `hits: ${summary.seen} from this ${summary.scope === 'network' ? 'IP cluster' : '10m window'} (${summary.recorded} saved)`,
    `pages: ${summary.pages || 'none saved'}`,
    `signed-in: ${summary.signedIn}`,
    `guests: ${summary.guests}`,
    `browsers: ${summary.browsers || 'unknown'}`,
    `refs: ${summary.refs || 'organic'}`,
    `bots in log: ${summary.bots}`,
  ];
  if (summary.networkId) lines.push(`same-IP id: ${summary.networkId}`);
  if (summary.scope === 'global') lines.push(`unique networks: ${summary.uniqueNetworks}`);
  if (summary.cameFrom) lines.push(`came from: ${summary.cameFrom}`);
  lines.push('These are public page loads (/, /pricing, /login, /welcome, /discover) — not in-app clicks.');
  lines.push('Investigate: CEO Deck → Activity sheet → Visitor clusters.');
  return lines.join('\n');
}

export function landingBurstHeadline(summary: LandingBurstSummary): string {
  const who =
    summary.signedIn !== 'none'
      ? summary.signedIn
      : summary.guests !== 'none'
        ? summary.guests
        : 'Anonymous visitors';
  if (summary.scope === 'network') {
    return `${who} — ${summary.seen} loads from the same IP cluster in 10m. ${summary.recorded} saved on Activity sheet → Landing visits.`;
  }
  return `${who} — ${summary.seen}+ public page loads in 10m (Telegram cap hit). ${summary.recorded} saved on Activity sheet → Landing visits.`;
}

/** Recent landing hits for a Visit Burst Telegram/CEO rundown. */
export async function summarizeRecentLandingHits(opts: {
  ipHash?: string | null;
  seen?: number;
  windowMs?: number;
}): Promise<LandingBurstSummary> {
  const windowMs = opts.windowMs ?? BURST_WINDOW_MS;
  const empty: LandingBurstSummary = {
    scope: opts.ipHash ? 'network' : 'global',
    seen: opts.seen ?? 0,
    recorded: 0,
    uniqueNetworks: 0,
    networkId: opts.ipHash || null,
    pages: '',
    who: 'Anonymous visitors',
    signedIn: 'none',
    guests: 'none',
    browsers: '',
    refs: '',
    bots: 0,
    cameFrom: '',
  };

  if (!hasAdminFirestoreCredentials()) return empty;

  try {
    const db = await getDb();
    const since = new Date(Date.now() - windowMs).toISOString();
    const snap = await db.collection('studio_landing_hits').orderBy('timestamp', 'desc').limit(250).get();
    const rows = snap.docs
      .map((doc) => doc.data() || {})
      .filter((data) => {
        const ts = typeof data.timestamp === 'string' ? data.timestamp : '';
        if (ts < since) return false;
        if (opts.ipHash && data.ipHash !== opts.ipHash) return false;
        return true;
      });

    const networks = new Set(rows.map((row) => String(row.ipHash || '')).filter(Boolean));
    const signedIn = uniqueList(
      rows.map((row) => {
        const name = typeof row.userName === 'string' ? row.userName.trim() : '';
        const email = typeof row.userEmail === 'string' ? row.userEmail.trim() : '';
        if (name && email) return `${name} <${email}>`;
        return name || email;
      }),
      'none'
    );
    const guests = uniqueList(
      rows.map((row) => (typeof row.guestAlias === 'string' ? row.guestAlias : null)),
      'none'
    );

    return {
      scope: opts.ipHash ? 'network' : 'global',
      seen: Math.max(opts.seen ?? 0, rows.length),
      recorded: rows.length,
      uniqueNetworks: networks.size,
      networkId: opts.ipHash || (networks.size === 1 ? [...networks][0] : null),
      pages: countMap(rows.map((row) => (typeof row.path === 'string' ? row.path : '/'))),
      who: signedIn !== 'none' ? signedIn : guests,
      signedIn,
      guests,
      browsers: countMap(rows.map((row) => (typeof row.uaFamily === 'string' ? row.uaFamily : null))),
      refs: countMap(rows.map((row) => (typeof row.ref === 'string' ? row.ref : 'organic'))),
      bots: rows.filter((row) => row.botLikely === true).length,
      cameFrom: uniqueList(
        rows.map((row) => (typeof row.referrer === 'string' ? row.referrer.slice(0, 80) : null)),
        ''
      ),
    };
  } catch (error) {
    console.warn('[landing-burst-summary] skipped', (error as Error).message);
    return empty;
  }
}
