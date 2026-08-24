import 'server-only';

import { createHmac, randomUUID } from 'crypto';

export const DROP_LISTENER_COOKIE = 'b4b_listener';
const LISTENER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function listenerSecret(): string {
  return (
    process.env.DROP_LISTENER_SECRET?.trim() ||
    process.env.DROP_AUDIO_STREAM_SECRET?.trim() ||
    process.env.INVITE_GATE_SECRET?.trim() ||
    'b4b-dev-listener-secret-change-me'
  );
}

function cookieValue(cookieHeader: string | null, name: string): string {
  if (!cookieHeader) return '';
  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (rawName === name) return decodeURIComponent(rawValue.join('='));
  }
  return '';
}

function validVisitorId(value: string): boolean {
  return /^[a-f0-9-]{20,80}$/i.test(value);
}

function opaqueListenerKey(kind: 'user' | 'guest', value: string): string {
  return createHmac('sha256', listenerSecret())
    .update(`${kind}:${value}`)
    .digest('hex')
    .slice(0, 40);
}

export function dropListenerKeyForUser(userId: string): string {
  return opaqueListenerKey('user', userId.trim());
}

export type DropListenerIdentity = {
  key: string;
  authenticated: boolean;
  setCookie?: string;
};

/** Resolve a stable privacy-safe listener key without exposing UID/IP in metrics. */
export function resolveDropListenerIdentity(
  req: Request,
  userId?: string | null
): DropListenerIdentity {
  if (userId?.trim()) {
    return { key: opaqueListenerKey('user', userId.trim()), authenticated: true };
  }

  const existing = cookieValue(req.headers.get('cookie'), DROP_LISTENER_COOKIE);
  const visitorId = validVisitorId(existing) ? existing : randomUUID();
  const identity: DropListenerIdentity = {
    key: opaqueListenerKey('guest', visitorId),
    authenticated: false,
  };
  if (!validVisitorId(existing)) {
    identity.setCookie = [
      `${DROP_LISTENER_COOKIE}=${encodeURIComponent(visitorId)}`,
      'Path=/',
      `Max-Age=${LISTENER_COOKIE_MAX_AGE}`,
      'HttpOnly',
      'SameSite=Lax',
      ...(process.env.NODE_ENV === 'production' ? ['Secure'] : []),
    ].join('; ');
  }
  return identity;
}
