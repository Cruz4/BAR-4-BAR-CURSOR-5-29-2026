import 'server-only';

import { getMessaging } from 'firebase-admin/messaging';
import { getPublicAppUrl } from '@/lib/app-url';

const MAX_DEVICES = 8;

export function listPushTokensFromDoc(data: Record<string, unknown> | undefined): string[] {
  const tokens = new Set<string>();
  const legacy = typeof data?.fcmToken === 'string' ? data.fcmToken.trim() : '';
  if (legacy) tokens.add(legacy);
  const devices = data?.devices;
  if (Array.isArray(devices)) {
    for (const row of devices) {
      const token =
        row && typeof row === 'object' && typeof (row as { token?: unknown }).token === 'string'
          ? (row as { token: string }).token.trim()
          : '';
      if (token) tokens.add(token);
    }
  }
  return [...tokens].slice(-MAX_DEVICES);
}

export async function sendWebPushToTokens(opts: {
  tokens: string[];
  title: string;
  body: string;
  href: string;
  type: string;
  unread?: number;
}): Promise<void> {
  if (!opts.tokens.length) return;
  const origin = getPublicAppUrl();
  const absoluteLink = opts.href.startsWith('http')
    ? opts.href
    : `${origin}${opts.href.startsWith('/') ? '' : '/'}${opts.href}`;
  const unread = Math.max(0, Math.floor(opts.unread ?? 1));
  const messaging = getMessaging();
  await Promise.all(
    opts.tokens.map((token) =>
      messaging
        .send({
          token,
          notification: { title: opts.title, body: opts.body },
          webpush: {
            fcmOptions: { link: absoluteLink },
            notification: {
              icon: `${origin}/Logo.png`,
              badge: `${origin}/Logo.png`,
            },
          },
          data: {
            href: absoluteLink,
            type: opts.type,
            unread: String(unread || 1),
          },
        })
        .catch((err) => {
          console.warn('[activity/push]', err);
        })
    )
  );
}
