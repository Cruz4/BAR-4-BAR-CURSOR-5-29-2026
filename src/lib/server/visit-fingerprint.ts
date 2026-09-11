import 'server-only';

import { createHash } from 'crypto';

const BOT_UA =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|facebot|slurp|duckduckbot|bingbot|googlebot|yandex|baiduspider|bytespider|semrush|ahrefs|mj12|dotbot|gptbot|claudebot|anthropic|perplexity|chatgpt|applebot|twitterbot|linkedinbot|whatsapp|telegram|discordbot|slackbot|pinterest|tiktok|bytedance|headless|phantomjs|puppeteer|playwright|selenium|curl\/|wget|python-requests|go-http-client|java\/|okhttp|libwww|scrapy|httpclient|postman|insomnia|axios\/|node-fetch|httpie|python-urllib/i;

function visitorPepper(): string {
  return (
    process.env.IDENTITY_REGISTRY_SECRET?.trim() ||
    process.env.INVITE_GATE_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim()?.slice(0, 32) ||
    'b4b-dev-visit-fingerprint-secret-change-me'
  );
}

export function clientIpFromRequest(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Short hash for clustering repeat visits. Never send the raw IP to Telegram. */
export function hashVisitorIp(ip: string): string {
  return createHash('sha256')
    .update(`${visitorPepper()}:${ip.trim()}`)
    .digest('hex')
    .slice(0, 16);
}

export function classifyUserAgent(userAgent: string | null): {
  family: string;
  botLikely: boolean;
} {
  const ua = userAgent?.trim() || '';
  if (!ua || ua.length < 12) return { family: 'empty', botLikely: true };
  if (BOT_UA.test(ua)) return { family: botFamily(ua), botLikely: true };
  if (/edg\//i.test(ua)) return { family: 'edge', botLikely: false };
  if (/firefox\//i.test(ua)) return { family: 'firefox', botLikely: false };
  if (/chrome\//i.test(ua)) return { family: 'chrome', botLikely: false };
  if (/safari\//i.test(ua)) return { family: 'safari', botLikely: false };
  return { family: 'other', botLikely: false };
}

function botFamily(ua: string): string {
  const match = ua.match(
    /(googlebot|bingbot|bytespider|gptbot|claudebot|tiktok|facebookexternalhit|curl|wget|python-requests|headless|puppeteer|playwright)/i
  );
  return (match?.[1] || 'bot').toLowerCase();
}

export function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.get('origin')?.trim();
  if (!origin) return false;
  const host = (
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    ''
  )
    .split(',')[0]
    ?.trim()
    .toLowerCase();
  if (!host) return false;
  try {
    return new URL(origin).host.toLowerCase() === host;
  } catch {
    return false;
  }
}
