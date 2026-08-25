import 'server-only';

import { createHmac, timingSafeEqual } from 'crypto';

const PROOF_TTL_MS = 3 * 60 * 60 * 1000;

export type DropListenProof = {
  v: 1;
  s: string;
  t?: string;
  l: string;
  a: 0 | 1;
  f: 0 | 1;
  d: number;
  i: number;
  e: number;
  /** Server-verified profile whose featured/share surface introduced the listen. */
  r?: string;
};

function proofSecret(): string {
  return (
    process.env.DROP_LISTEN_PROOF_SECRET?.trim() ||
    process.env.DROP_AUDIO_STREAM_SECRET?.trim() ||
    process.env.INVITE_GATE_SECRET?.trim() ||
    'b4b-dev-listen-proof-secret-change-me'
  );
}

function sign(value: string): string {
  return createHmac('sha256', proofSecret()).update(value).digest('base64url');
}

export function mintDropListenProof(input: {
  shareId: string;
  trackId?: string;
  listenerKey: string;
  authenticated: boolean;
  full: boolean;
  eligibleDurationSec: number;
  referralUserId?: string;
}): string {
  const issuedAt = Date.now();
  const payload: DropListenProof = {
    v: 1,
    s: input.shareId.trim().slice(0, 80),
    ...(input.trackId?.trim() ? { t: input.trackId.trim().slice(0, 100) } : {}),
    l: input.listenerKey,
    a: input.authenticated ? 1 : 0,
    f: input.full ? 1 : 0,
    d: Math.max(1, Math.min(60 * 60, Number(input.eligibleDurationSec) || 30)),
    i: issuedAt,
    e: issuedAt + PROOF_TTL_MS,
    ...(input.referralUserId?.trim() ? { r: input.referralUserId.trim().slice(0, 128) } : {}),
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  return `${encoded}.${sign(encoded)}`;
}

export function verifyDropListenProof(raw: string): DropListenProof {
  const token = raw.trim();
  const dot = token.lastIndexOf('.');
  if (dot <= 0) throw new Error('Invalid listening proof.');
  const encoded = token.slice(0, dot);
  const supplied = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(encoded));
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    throw new Error('Invalid listening proof.');
  }
  const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as DropListenProof;
  if (
    payload?.v !== 1 ||
    !payload.s ||
    !payload.l ||
    (payload.a !== 0 && payload.a !== 1) ||
    !Number.isFinite(payload.d) ||
    !Number.isFinite(payload.i) ||
    !Number.isFinite(payload.e)
  ) {
    throw new Error('Invalid listening proof.');
  }
  if (Date.now() > payload.e) throw new Error('Listening proof expired.');
  return payload;
}
