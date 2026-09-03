import 'server-only';
import {
  DEFAULT_PUBLIC_APP_URL,
  LEGACY_FIREBASE_HOSTING_URL,
  LEGACY_PUBLIC_APP_URL,
  LEGACY_PUBLIC_WWW_URL,
  PUBLIC_WWW_APP_URL,
} from '@/lib/app-url';

const DEV_ORIGINS = ['http://localhost:9002', 'http://127.0.0.1:9002'];

function normalizeOrigin(value: string): string {
  try {
    const url = new URL(value.trim());
    return `${url.protocol}//${url.host}`;
  } catch {
    return value.trim().replace(/\/$/, '');
  }
}

function buildAllowlist(): string[] {
  const fromEnv = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.APP_URL,
    ...(process.env.TRUSTED_APP_ORIGINS?.split(',') ?? []),
  ]
    .filter((v): v is string => Boolean(v?.trim()))
    .map(normalizeOrigin);

  const list = [...fromEnv];
  if (process.env.NODE_ENV === 'development') {
    list.push(...DEV_ORIGINS);
  }
  const merged = [
    ...list,
    DEFAULT_PUBLIC_APP_URL,
    PUBLIC_WWW_APP_URL,
    LEGACY_PUBLIC_APP_URL,
    LEGACY_PUBLIC_WWW_URL,
    LEGACY_FIREBASE_HOSTING_URL,
  ];
  return [...new Set(merged)];
}

/** Origins allowed for Stripe redirects and referral links — never trusts arbitrary `Origin` headers. */
export function getTrustedAppOrigin(req?: Request): string {
  const allowlist = buildAllowlist();
  const fallback =
    allowlist[0] ||
    (process.env.NODE_ENV === 'development' ? DEV_ORIGINS[0] : DEFAULT_PUBLIC_APP_URL);

  if (!req) return fallback;

  const origin = req.headers.get('origin');
  if (origin) {
    const normalized = normalizeOrigin(origin);
    if (allowlist.includes(normalized)) return normalized;
  }

  const referer = req.headers.get('referer');
  if (referer) {
    try {
      const normalized = normalizeOrigin(new URL(referer).origin);
      if (allowlist.includes(normalized)) return normalized;
    } catch {
      /* ignore malformed referer */
    }
  }

  return fallback;
}
