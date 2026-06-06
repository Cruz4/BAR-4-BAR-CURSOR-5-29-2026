import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { getDb, hasAdminFirestoreCredentials } from '@/lib/firebase/server';
import {
  DEFAULT_INVITE_GATE_COPY,
  INVITE_GATE_COOKIE,
  normalizeInviteCode,
  type InviteGateAdminConfig,
  type InviteGateCopy,
  type InviteGatePublicStatus,
} from '@/lib/invite-gate';

const DOC_PATH = 'config/inviteGate';
const COOKIE_MAX_AGE_SEC = 90 * 24 * 60 * 60;

type InviteGateDoc = {
  enabled?: boolean;
  version?: number;
  codeHash?: string;
  copy?: Partial<InviteGateCopy>;
  updatedAt?: string;
  updatedBy?: string | null;
};

function gateSecret(): string {
  return (
    process.env.INVITE_GATE_SECRET?.trim() ||
    process.env.STRIPE_WEBHOOK_SECRET?.trim()?.slice(0, 32) ||
    'b4b-dev-invite-gate-secret-change-me'
  );
}

export function hashInviteCode(code: string, version: number): string {
  const normalized = normalizeInviteCode(code);
  return createHash('sha256')
    .update(`${gateSecret()}:v${version}:${normalized}`)
    .digest('hex');
}

function mergeCopy(partial?: Partial<InviteGateCopy>): InviteGateCopy {
  return { ...DEFAULT_INVITE_GATE_COPY, ...partial };
}

function docToPublic(data: InviteGateDoc | undefined): InviteGatePublicStatus {
  const version = typeof data?.version === 'number' ? data.version : 1;
  return {
    enabled: Boolean(data?.enabled),
    version,
    copy: mergeCopy(data?.copy),
  };
}

export async function readInviteGateDoc(): Promise<InviteGateDoc | undefined> {
  if (!hasAdminFirestoreCredentials()) return undefined;
  const db = await getDb();
  const snap = await db.doc(DOC_PATH).get();
  return snap.exists ? (snap.data() as InviteGateDoc) : undefined;
}

export async function getInviteGatePublicStatus(): Promise<InviteGatePublicStatus> {
  const data = await readInviteGateDoc();
  return docToPublic(data);
}

export async function getInviteGateAdminConfig(): Promise<InviteGateAdminConfig> {
  const data = await readInviteGateDoc();
  const pub = docToPublic(data);
  return {
    ...pub,
    hasCode: Boolean(data?.codeHash),
    updatedAt: data?.updatedAt ?? null,
    updatedBy: data?.updatedBy ?? null,
  };
}

export async function saveInviteGateConfig(input: {
  enabled: boolean;
  code?: string;
  copy?: Partial<InviteGateCopy>;
  adminEmail: string;
}): Promise<InviteGateAdminConfig> {
  if (!hasAdminFirestoreCredentials()) {
    throw new Error('Firebase Admin required');
  }

  const db = await getDb();
  const ref = db.doc(DOC_PATH);
  const existing = (await ref.get()).data() as InviteGateDoc | undefined;
  const version =
    input.code && input.code.trim()
      ? (existing?.version ?? 1) + 1
      : (existing?.version ?? 1);

  const patch: InviteGateDoc = {
    enabled: input.enabled,
    version,
    copy: mergeCopy({ ...existing?.copy, ...input.copy }),
    updatedAt: new Date().toISOString(),
    updatedBy: input.adminEmail,
  };

  if (input.code && input.code.trim()) {
    patch.codeHash = hashInviteCode(input.code, version);
  } else if (existing?.codeHash) {
    patch.codeHash = existing.codeHash;
  }

  await ref.set(patch, { merge: true });
  return getInviteGateAdminConfig();
}

export function signInviteUnlockToken(version: number): string {
  const payload = JSON.stringify({
    v: version,
    exp: Date.now() + COOKIE_MAX_AGE_SEC * 1000,
  });
  const payloadB64 = Buffer.from(payload, 'utf8').toString('base64url');
  const sig = createHmac('sha256', gateSecret()).update(payloadB64).digest('base64url');
  return `${payloadB64}.${sig}`;
}

export function verifyInviteUnlockToken(token: string, expectedVersion: number): boolean {
  try {
    const [payloadB64, sig] = token.split('.');
    if (!payloadB64 || !sig) return false;

    const expectedSig = createHmac('sha256', gateSecret()).update(payloadB64).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
      return false;
    }

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as {
      v?: number;
      exp?: number;
    };
    if (payload.v !== expectedVersion) return false;
    if (!payload.exp || payload.exp < Date.now()) return false;
    return true;
  } catch {
    return false;
  }
}

export async function verifyInviteCodeAttempt(code: string): Promise<{
  ok: boolean;
  version: number;
  token?: string;
}> {
  const data = await readInviteGateDoc();
  if (!data?.enabled || !data.codeHash) {
    return { ok: false, version: data?.version ?? 1 };
  }

  const version = data.version ?? 1;
  const attemptHash = hashInviteCode(code, version);
  const storedBuf = Buffer.from(data.codeHash, 'hex');
  const attemptBuf = Buffer.from(attemptHash, 'hex');
  if (storedBuf.length !== attemptBuf.length || !timingSafeEqual(storedBuf, attemptBuf)) {
    return { ok: false, version };
  }

  return { ok: true, version, token: signInviteUnlockToken(version) };
}

export async function hasValidInviteUnlockCookie(): Promise<boolean> {
  const status = await getInviteGatePublicStatus();
  if (!status.enabled) return true;

  const jar = await cookies();
  const token = jar.get(INVITE_GATE_COOKIE)?.value;
  if (!token) return false;
  return verifyInviteUnlockToken(token, status.version);
}

export function inviteUnlockCookieOptions(version: number) {
  const token = signInviteUnlockToken(version);
  // Host-only cookie (no Domain attr) — most reliable on www + apex via localStorage fallback.
  return {
    name: INVITE_GATE_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: COOKIE_MAX_AGE_SEC,
  };
}
