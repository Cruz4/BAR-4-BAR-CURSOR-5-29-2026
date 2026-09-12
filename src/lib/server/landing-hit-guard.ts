import 'server-only';

import { checkRateLimit, incrementWindowCount } from '@/lib/server/rate-limit';

const IP_RECORD_WINDOW_MS = 5 * 60_000;
const IP_RECORD_MAX = 20;
const GUEST_WINDOW_MS = 5 * 60_000;
const GUEST_MAX = 12;
export const BURST_WINDOW_MS = 10 * 60_000;
const BURST_MAX = 15;
const VISIT_NOTIFY_WINDOW_MS = 30 * 60_000;
const VOLUME_WINDOW_MS = 10 * 60_000;
const ORGANIC_NOTIFY_MAX = 6;
const CAMPAIGN_NOTIFY_MAX = 12;

export async function allowOnce(key: string, windowMs: number): Promise<boolean> {
  const { allowed } = await checkRateLimit(key, 1, windowMs);
  return allowed;
}

export async function gateLandingHitRecord(opts: {
  ipHash: string;
  guestRateKey: string;
}): Promise<{ record: boolean; burst: boolean; seen: number }> {
  const seen = await incrementWindowCount(
    `landing-burst:${opts.ipHash}`,
    1,
    BURST_MAX,
    BURST_WINDOW_MS
  );
  const burst = seen.count > BURST_MAX;

  const ipOk = await checkRateLimit(
    `landing-hit-ip:${opts.ipHash}`,
    IP_RECORD_MAX,
    IP_RECORD_WINDOW_MS
  );
  if (!ipOk.allowed) return { record: false, burst, seen: seen.count };

  const guestOk = await checkRateLimit(opts.guestRateKey, GUEST_MAX, GUEST_WINDOW_MS);
  if (!guestOk.allowed) return { record: false, burst, seen: seen.count };

  return { record: true, burst, seen: seen.count };
}

export async function gateLandingHitVisitAlert(opts: {
  ipHash: string;
  path: string;
  ref: string;
  botLikely: boolean;
}): Promise<{ visit: boolean; volume: boolean }> {
  if (opts.botLikely) return { visit: false, volume: false };

  const perVisitor = await checkRateLimit(
    `landing-hit-notify:${opts.ipHash}:${opts.path}`,
    1,
    VISIT_NOTIFY_WINDOW_MS
  );
  if (!perVisitor.allowed) return { visit: false, volume: false };

  const campaign = opts.ref !== 'organic';
  const budget = await checkRateLimit(
    campaign ? 'landing-hit-notify:campaign' : 'landing-hit-notify:organic',
    campaign ? CAMPAIGN_NOTIFY_MAX : ORGANIC_NOTIFY_MAX,
    VOLUME_WINDOW_MS
  );
  if (!budget.allowed) return { visit: false, volume: true };

  return { visit: true, volume: false };
}
