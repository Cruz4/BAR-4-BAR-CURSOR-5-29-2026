import { NextResponse } from 'next/server';
import { matchSecurityCanaryPath } from '@/lib/security-canary-paths';
import { enqueueAdminAlert } from '@/lib/server/admin-alerts';
import { allowOnce } from '@/lib/server/landing-hit-guard';
import { checkRateLimit } from '@/lib/server/rate-limit';
import {
  classifyUserAgent,
  clientIpFromRequest,
  hashVisitorIp,
} from '@/lib/server/visit-fingerprint';

export const runtime = 'nodejs';

const PROBE_NOTIFY_WINDOW_MS = 60 * 60_000;
const PROBE_COUNT_WINDOW_MS = 60 * 60_000;

async function handleCanary(req: Request) {
  const url = new URL(req.url);
  const rawPath = url.searchParams.get('p') || '';
  const path = matchSecurityCanaryPath(rawPath.startsWith('/') ? rawPath : `/${rawPath}`);
  if (!path) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const ipHash = hashVisitorIp(clientIpFromRequest(req));
    const ua = classifyUserAgent(req.headers.get('user-agent'));

    await checkRateLimit(`probe-count:${ipHash}`, 40, PROBE_COUNT_WINDOW_MS);

    if (await allowOnce(`probe-notify:${ipHash}`, PROBE_NOTIFY_WINDOW_MS)) {
      await enqueueAdminAlert({
        kind: 'probe',
        path,
        method: ua.family,
        ipHash,
        detail: ua.botLikely
          ? 'bot-like client probing a bait path (WordPress/php/.env). That hole does not exist here.'
          : 'browser-like client probing a bait path (WordPress/php/.env). That hole does not exist here.',
      });
    }
  } catch (err) {
    console.warn('[security/canary]', err);
  }

  return new NextResponse(null, { status: 404 });
}

export async function GET(req: Request) {
  return handleCanary(req);
}

export async function POST(req: Request) {
  return handleCanary(req);
}
