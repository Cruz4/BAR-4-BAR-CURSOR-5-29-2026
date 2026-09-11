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

export const runtime = 'nodejs';

const VISIT_ALERT_PATHS = new Set(['/', '/pricing', '/login', '/welcome', '/discover']);
const VOLUME_WINDOW_MS = 10 * 60_000;

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

    const ip = clientIpFromRequest(req);
    const ipHash = hashVisitorIp(ip);
    const ua = classifyUserAgent(req.headers.get('user-agent'));
    const sameOrigin = isSameOriginRequest(req);

    const guestRateKey = guestId
      ? `landing-hit:${guestId}:${ref}:${path}`
      : `landing-hit:${ipHash}:${ref}:${path}`;

    const gate = await gateLandingHitRecord({ ipHash, guestRateKey });

    if (gate.burst && (await allowOnce(`landing-burst-notify:${ipHash}`, BURST_WINDOW_MS))) {
      await enqueueAdminAlert({
        kind: 'landing_burst',
        ref,
        path,
        method: ua.family,
        detail: ua.botLikely ? 'bot-like client' : 'same network, many guest ids',
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
    });

    const alerts = await gateLandingHitVisitAlert({
      ipHash,
      path,
      ref,
      botLikely: ua.botLikely,
    });

    if (alerts.visit) {
      await enqueueAdminAlert({
        kind: 'landing_hit',
        ref,
        path,
        guestId,
        guestAlias,
      });
    } else if (
      alerts.volume &&
      !gate.burst &&
      (await allowOnce('landing-hit-volume:global', VOLUME_WINDOW_MS))
    ) {
      await enqueueAdminAlert({
        kind: 'landing_burst',
        path,
        ref,
        method: ua.family,
        detail: 'lots of page visits — extras are logged, not pinged',
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[analytics/landing-hit]', err);
    return NextResponse.json({ error: 'Failed to record landing hit' }, { status: 500 });
  }
}
