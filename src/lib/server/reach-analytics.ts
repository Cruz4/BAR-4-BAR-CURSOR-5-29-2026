import 'server-only';

import { FieldValue } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import type {
  ReachAnalyticsDay,
  ReachAnalyticsHour,
  ReachAnalyticsPlace,
  ReachAnalyticsRecent,
  ReachAnalyticsReferrer,
  ReachAnalyticsResponse,
} from '@/lib/reach-analytics-types';
import { placeFromIp } from '@/lib/scene/scene-weather-geo';
import {
  classifyUserAgent,
  clientIpFromRequest,
  hashVisitorIp,
} from '@/lib/server/visit-fingerprint';
import { resolveShareReachDisplay } from '@/lib/server/reach-display';

export type VisitorGeo = {
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
};

export type VisitorContext = {
  viewerId?: string | null;
  guestId?: string | null;
  referrer?: string | null;
  uaFamily?: string;
  botLikely?: boolean;
  geo?: VisitorGeo;
  ipHash?: string;
};

function tickIdForVisitor(viewerId?: string | null, guestId?: string | null): string {
  const uid = viewerId?.trim() || '';
  const guest = (guestId || '').trim().toLowerCase().replace(/[^a-f0-9-]/g, '').slice(0, 64);
  return (uid ? `u_${uid}` : guest.length >= 8 ? `g_${guest}` : '').slice(0, 120);
}

function referrerHost(referrer: string | null | undefined): string | undefined {
  if (!referrer?.trim()) return undefined;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./i, '');
    return host.slice(0, 80) || undefined;
  } catch {
    return undefined;
  }
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

async function fetchGeoFromIp(ip: string | null): Promise<VisitorGeo | undefined> {
  if (!ip || ip === 'unknown') return undefined;
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return undefined;
    const who = (await res.json()) as {
      success?: boolean;
      city?: string;
      region?: string;
      country?: string;
      country_code?: string;
    };
    if (who?.success === false) return undefined;
    const city = who.city?.trim();
    const region = who.region?.trim();
    const country = who.country?.trim();
    if (!city && !region && !country) {
      const place = await placeFromIp(ip);
      return place ? { city: place.city } : undefined;
    }
    return {
      ...(city ? { city: city.slice(0, 64) } : {}),
      ...(region ? { region: region.slice(0, 64) } : {}),
      ...(country ? { country: country.slice(0, 64) } : {}),
      ...(who.country_code ? { countryCode: who.country_code.slice(0, 8).toUpperCase() } : {}),
    };
  } catch {
    const place = await placeFromIp(ip);
    return place ? { city: place.city } : undefined;
  }
}

export async function visitorContextFromRequest(req: Request): Promise<VisitorContext> {
  const ip = clientIpFromRequest(req);
  const ua = classifyUserAgent(req.headers.get('user-agent'));
  const geo = await fetchGeoFromIp(ip === 'unknown' ? null : ip);
  return {
    ipHash: hashVisitorIp(ip),
    uaFamily: ua.family,
    botLikely: ua.botLikely,
    geo,
    referrer: req.headers.get('referer')?.trim().slice(0, 240) || null,
  };
}

function placeLabel(geo?: VisitorGeo): string {
  if (!geo) return 'Unknown area';
  const parts = [geo.city, geo.region, geo.country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Unknown area';
}

function tickPayload(ctx: VisitorContext, viewerId: string, guestId: string | null) {
  const nowIso = new Date().toISOString();
  return {
    at: nowIso,
    viewerId: viewerId || null,
    guestId: viewerId ? null : guestId || null,
    referrerHost: referrerHost(ctx.referrer) || null,
    uaFamily: ctx.uaFamily || null,
    botLikely: Boolean(ctx.botLikely),
    ipHash: ctx.ipHash || null,
    city: ctx.geo?.city || null,
    region: ctx.geo?.region || null,
    country: ctx.geo?.country || null,
    countryCode: ctx.geo?.countryCode || null,
  };
}

/** Unique people who opened a share / DNA / release page. Owner visits never count. */
export async function recordShareLanding(
  db: Firestore,
  input: {
    shareId: string;
    ownerId: string;
    viewerId?: string | null;
    guestId?: string | null;
    ctx: VisitorContext;
  }
): Promise<{ counted: boolean; landingCount?: number }> {
  const shareId = input.shareId.trim().toUpperCase().slice(0, 200);
  const ownerId = input.ownerId.trim();
  if (!shareId || !ownerId) return { counted: false };
  if (input.ctx.botLikely) return { counted: false };

  const uid = input.viewerId?.trim() || '';
  if (uid && uid === ownerId) return { counted: false };

  const guest = (input.guestId || '').trim().toLowerCase().replace(/[^a-f0-9-]/g, '').slice(0, 64);
  const tickId = tickIdForVisitor(uid, guest);
  if (!tickId) return { counted: false };

  const shareRef = db.doc(`shares/${shareId}`);
  const shareSnap = await shareRef.get();
  if (!shareSnap.exists) return { counted: false };

  const tickRef = shareRef.collection('landingTicks').doc(tickId);
  const tickSnap = await tickRef.get();
  const existing = Number(shareSnap.data()?.landingCount);

  if (tickSnap.exists) {
    return {
      counted: false,
      ...(Number.isFinite(existing) && existing > 0 ? { landingCount: existing } : {}),
    };
  }

  const batch = db.batch();
  batch.set(
    shareRef,
    {
      landingCount: FieldValue.increment(1),
      landingCountUpdatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  batch.set(tickRef, tickPayload(input.ctx, uid, guest || null));
  await batch.commit();

  const after = Number.isFinite(existing) && existing > 0 ? existing : 0;
  return { counted: true, landingCount: after + 1 };
}

/** Unique landings = stored counter vs landingTicks (whichever is higher). */
export async function resolveShareLandingCount(
  db: Firestore,
  shareId: string,
  data: Record<string, unknown> | undefined
): Promise<number> {
  const n = Number(data?.landingCount);
  const fromField = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  const id = shareId.trim().toUpperCase().slice(0, 200);
  if (!id) return fromField;
  try {
    const countSnap = await db.collection(`shares/${id}/landingTicks`).count().get();
    const fromTicks = countSnap.data().count;
    return Math.max(fromField, Number.isFinite(fromTicks) ? fromTicks : 0);
  } catch {
    return fromField;
  }
}

/** `0` = all time (no date cutoff). Otherwise clamp to 7–90 for windowed charts. */
export function parseReachAnalyticsDays(raw: string | null | undefined): number {
  const trimmed = raw?.trim().toLowerCase();
  if (trimmed === '0' || trimmed === 'all' || trimmed === 'alltime') return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 30;
  if (n >= 9999) return 0;
  return Math.min(90, Math.max(7, Math.floor(n)));
}

function aggregateTicks(
  ticks: Array<Record<string, unknown>>,
  days: number
): Omit<
  ReachAnalyticsResponse,
  'kind' | 'legacyPageLoads' | 'imports' | 'note' | 'allTimeWallOpens'
> {
  const allTime = days <= 0;
  const cutoff = allTime ? 0 : Date.now() - days * 86400000;
  const filtered = allTime
    ? ticks
    : ticks.filter((row) => {
        const at = typeof row.at === 'string' ? row.at : '';
        const t = Date.parse(at);
        return Number.isFinite(t) && t >= cutoff;
      });

  const byDay = new Map<string, number>();
  const byPlace = new Map<string, ReachAnalyticsPlace>();
  const byHour = new Map<number, number>();
  const byReferrer = new Map<string, number>();
  const recent: ReachAnalyticsRecent[] = [];

  for (const row of filtered) {
    const at = String(row.at || '');
    byDay.set(dayKey(at), (byDay.get(dayKey(at)) || 0) + 1);
    const hour = new Date(at).getUTCHours();
    byHour.set(hour, (byHour.get(hour) || 0) + 1);

    const geo: VisitorGeo = {
      city: typeof row.city === 'string' ? row.city : undefined,
      region: typeof row.region === 'string' ? row.region : undefined,
      country: typeof row.country === 'string' ? row.country : undefined,
    };
    const label = placeLabel(geo);
    const placeKey = label.toLowerCase();
    const placeRow = byPlace.get(placeKey) || { label, country: geo.country, region: geo.region, count: 0 };
    placeRow.count += 1;
    byPlace.set(placeKey, placeRow);

    const refHost = typeof row.referrerHost === 'string' ? row.referrerHost : undefined;
    if (refHost) byReferrer.set(refHost, (byReferrer.get(refHost) || 0) + 1);

    if (recent.length < 40) {
      recent.push({
        at,
        place: label,
        country: geo.country,
        referrer: refHost,
        device: typeof row.uaFamily === 'string' ? row.uaFamily : undefined,
      });
    }
  }

  const timeline: ReachAnalyticsDay[] = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, count]) => ({ day, count }));

  const places: ReachAnalyticsPlace[] = [...byPlace.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const hoursUtc: ReachAnalyticsHour[] = [...byHour.entries()]
    .sort(([a], [b]) => a - b)
    .map(([hourUtc, count]) => ({ hourUtc, count }));

  const referrers: ReachAnalyticsReferrer[] = [...byReferrer.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([host, count]) => ({ host, count }));

  return {
    days,
    uniqueLandings: filtered.length,
    periodLandings: filtered.length,
    timeline,
    places,
    hoursUtc,
    referrers,
    recent,
  };
}

export async function getShareReachAnalytics(
  db: Firestore,
  shareId: string,
  days: number
): Promise<ReachAnalyticsResponse | null> {
  const id = shareId.trim().toUpperCase();
  const snap = await db.doc(`shares/${id}`).get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const ticksSnap = await db
    .collection(`shares/${id}/landingTicks`)
    .orderBy('at', 'desc')
    .limit(600)
    .get()
    .catch(async () => {
      const fallback = await db.collection(`shares/${id}/landingTicks`).limit(600).get();
      return fallback;
    });

  const ticks = ticksSnap.docs.map((doc) => doc.data() as Record<string, unknown>);
  const agg = aggregateTicks(ticks, days);
  const reach = await resolveShareReachDisplay(db, id, data);
  const legacyViews = reach.legacy;

  return {
    kind: 'share',
    ...agg,
    uniqueLandings: reach.display,
    periodLandings: agg.periodLandings,
    legacyPageLoads: Number.isFinite(legacyViews) && legacyViews > 0 ? Math.floor(legacyViews) : undefined,
    imports: Number.isFinite(Number(data.imports)) ? Math.floor(Number(data.imports)) : undefined,
    note:
      legacyViews > reach.unique + 10
        ? 'Header total includes pre-tracking page loads (share.views). Unique landings count each visitor once.'
        : undefined,
  };
}

export async function getProfileReachAnalytics(
  db: Firestore,
  slug: string,
  days: number
): Promise<ReachAnalyticsResponse | null> {
  const clean = slug.trim().slice(0, 80);
  if (!clean) return null;
  const profileRef = db.doc(`publicProfiles/${clean}`);
  const profileSnap = await profileRef.get();
  if (!profileSnap.exists) return null;
  const data = profileSnap.data() || {};
  const ownerId = typeof data.userId === 'string' ? data.userId.trim() : '';

  const ticksSnap = await profileRef
    .collection('profileViewTicks')
    .orderBy('at', 'desc')
    .limit(600)
    .get()
    .catch(async () => profileRef.collection('profileViewTicks').limit(600).get());

  const ticks = ticksSnap.docs.map((doc) => doc.data() as Record<string, unknown>);
  const agg = aggregateTicks(ticks, days);

  const { resolveProfileViewCountForOwner, sumWallPostOpensForOwner } = await import(
    '@/lib/server/profile-views'
  );
  let total = ownerId
    ? await resolveProfileViewCountForOwner(db, ownerId, clean, data)
    : readProfileViewCountFromData(data);
  if (!ownerId) {
    try {
      const countSnap = await profileRef.collection('profileViewTicks').count().get();
      const fromTicks = countSnap.data().count;
      if (Number.isFinite(fromTicks)) total = Math.max(total, fromTicks);
    } catch {
      /* keep field */
    }
  }

  const allTimeWallOpens = ownerId ? await sumWallPostOpensForOwner(db, ownerId) : 0;
  const periodLandings =
    days <= 0 && allTimeWallOpens > 0 ? allTimeWallOpens : agg.periodLandings;

  return {
    kind: 'profile',
    ...agg,
    days,
    uniqueLandings: total,
    periodLandings,
    allTimeWallOpens,
    note:
      days <= 0
        ? 'All time: unique people counts each visitor once. Total wall opens includes every post read (repeat visits count).'
        : 'Window shows geo-tagged Artist Home landings. Choose All time for total wall opens.',
  };
}

function readProfileViewCountFromData(data: Record<string, unknown>): number {
  const fromField = Number(data.profileViewCount);
  return Number.isFinite(fromField) && fromField >= 0 ? Math.floor(fromField) : 0;
}

export function enrichProfileViewTick(ctx: VisitorContext): Record<string, unknown> {
  return {
    referrerHost: referrerHost(ctx.referrer) || null,
    uaFamily: ctx.uaFamily || null,
    city: ctx.geo?.city || null,
    region: ctx.geo?.region || null,
    country: ctx.geo?.country || null,
    countryCode: ctx.geo?.countryCode || null,
    ipHash: ctx.ipHash || null,
  };
}
