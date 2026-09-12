import { NextResponse } from 'next/server';
import { normalizeMarketingRef } from '@/lib/marketing-attribution';
import { guestAliasFromId, normalizeGuestAlias, normalizeGuestId } from '@/lib/guest-identity';
import { enqueueAdminAlert } from '@/lib/server/admin-alerts';
import { recordLandingHit } from '@/lib/server/record-landing-hit';
import {
  BURST_WINDOW_MS,
  allowOnce,
  gateLandingHitRecord,
  gateLandingHitVisitAlert,
} from '@/lib/server/landing-hit-guard';
import {
  classifyUserAgent,
  clientIpFromRequest,
  hashVisitorIp,
  isSameOriginRequest,
} from '@/lib/server/visit-fingerprint';
import {
  formatLandingBurstDetail,
  landingBurstHeadline,
  summarizeRecentLandingHits,
} from '@/lib/server/landing-burst-summary';
import { getAuth } from '@/lib/firebase/server';

export const runtime = 'nodejs';

const VISIT_ALERT_PATHS = new Set(['/', '/pricing', '/login', '/welcome', '/discover']);
const VOLUME_WINDOW_MS = 10 * 60_000;

async function resolveSignedInVisitor(req: Request): Promise<{
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
}> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return { userId: null, userName: null, userEmail: null };
  }
  try {
    const auth = await getAuth();
    const decoded = await auth.verifyIdToken(header.slice('Bearer '.length).trim());
    const record = await auth.getUser(decoded.uid).catch(() => null);
    return {
      userId: decoded.uid,
      userName: record?.displayName?.trim() || decoded.name?.trim() || null,
      userEmail: record?.email?.trim() || decoded.email?.trim() || null,
    };
  } catch {
    return { userId: null, userName: null, userEmail: null };
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const path =
      typeof body?.path === 'string' && body.path.startsWith('/')
        ? body.path.slice(0, 120)
        : '/';

    if (!VISIT_ALERT_PATHS.has(path)) {
      return NextResponse.json({ error: 'Unsupported path' }, { status: 400 });
    }

    const rawRef = typeof body?.ref === 'string' ? body.ref.trim().toLowerCase() : '';
    let ref =
      rawRef === 'organic'
        ? 'organic'
        : normalizeMarketingRef(typeof body?.ref === 'string' ? body.ref : null);
    if (!ref) ref = 'organic';

    const guestId = normalizeGuestId(body?.guestId);
    const guestAlias =
      normalizeGuestAlias(body?.guestAlias) || (guestId ? guestAliasFromId(guestId) : null);
    const referrer = typeof body?.referrer === 'string' ? body.referrer.trim().slice(0, 240) : null;

    const ip = clientIpFromRequest(req);
    const ipHash = hashVisitorIp(ip);
    const ua = classifyUserAgent(req.headers.get('user-agent'));
    const sameOrigin = isSameOriginRequest(req);
    const visitor = await resolveSignedInVisitor(req);

    const guestRateKey = guestId
      ? `landing-hit:${guestId}:${ref}:${path}`
      : `landing-hit:${ipHash}:${ref}:${path}`;

    const gate = await gateLandingHitRecord({ ipHash, guestRateKey });

    if (gate.burst && (await allowOnce(`landing-burst-notify:${ipHash}`, BURST_WINDOW_MS))) {
      const summary = await summarizeRecentLandingHits({ ipHash, seen: gate.seen });
      await enqueueAdminAlert({
        kind: 'landing_burst',
        ref,
        path,
        method: ua.family,
        guestId,
        guestAlias,
        userId: visitor.userId,
        userName: visitor.userName,
        userEmail: visitor.userEmail,
        detail: formatLandingBurstDetail(summary),
        burstHeadline: landingBurstHeadline(summary),
        ipHash,
      });
    }

    if (!gate.record) {
      return NextResponse.json({ ok: true, throttled: true });
    }

    await recordLandingHit(ref, path, {
      guestId,
      guestAlias,
      ipHash,
      uaFamily: ua.family,
      botLikely: ua.botLikely,
      sameOrigin,
      userId: visitor.userId,
      userName: visitor.userName,
      userEmail: visitor.userEmail,
      referrer,
    });

    const memberQuiet =
      Boolean(visitor.userId) &&
      ref === 'organic' &&
      (path === '/' || path === '/discover' || path === '/pricing');

    const alerts = await gateLandingHitVisitAlert({
      ipHash,
      path,
      ref,
      botLikely: ua.botLikely,
    });

    if (alerts.visit && !memberQuiet) {
      await enqueueAdminAlert({
        kind: 'landing_hit',
        ref,
        path,
        guestId,
        guestAlias,
        userId: visitor.userId,
        userName: visitor.userName,
        userEmail: visitor.userEmail,
      });
    } else if (
      alerts.volume &&
      !gate.burst &&
      !memberQuiet &&
      (await allowOnce('landing-hit-volume:global', VOLUME_WINDOW_MS))
    ) {
      const summary = await summarizeRecentLandingHits({ seen: gate.seen });
      await enqueueAdminAlert({
        kind: 'landing_burst',
        path,
        ref,
        method: ua.family,
        guestId,
        guestAlias,
        userId: visitor.userId,
        userName: visitor.userName,
        userEmail: visitor.userEmail,
        detail: formatLandingBurstDetail(summary),
        burstHeadline: landingBurstHeadline(summary),
        ipHash,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[analytics/landing-hit]', err);
    return NextResponse.json({ error: 'Failed to record landing hit' }, { status: 500 });
  }
}
