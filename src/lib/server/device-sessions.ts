import 'server-only';

import type { DecodedIdToken } from 'firebase-admin/auth';
import { getAuth, getDb } from '@/lib/firebase/server';
import {
  isValidDeviceSessionId,
  parseDeviceUserAgent,
  type DeviceSession,
} from '@/lib/device-sessions';

type StoredDeviceSession = Omit<DeviceSession, 'id' | 'current'> & {
  authTime: number;
  revokedAt: string | null;
  endedAt: string | null;
  revokedBySessionId?: string;
};

const ACTIVITY_WRITE_INTERVAL_MS = 5 * 60 * 1000;

export class DeviceSessionAuthError extends Error {
  constructor(message = 'Sign-in required.') {
    super(message);
    this.name = 'DeviceSessionAuthError';
  }
}

export async function verifyDeviceSessionRequest(req: Request): Promise<DecodedIdToken> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) throw new DeviceSessionAuthError();

  try {
    const auth = await getAuth();
    return await auth.verifyIdToken(header.slice('Bearer '.length).trim());
  } catch {
    throw new DeviceSessionAuthError('Your sign-in is no longer active.');
  }
}

function sessionCollectionPath(userId: string): string {
  return `users/${userId}/authSessions`;
}

function sessionControlPath(userId: string): string {
  return `users/${userId}/security/deviceSessions`;
}

function publicSession(
  id: string,
  data: Partial<StoredDeviceSession>,
  currentSessionId: string
): DeviceSession {
  return {
    id,
    browser: typeof data.browser === 'string' ? data.browser : 'BA app',
    operatingSystem:
      typeof data.operatingSystem === 'string' ? data.operatingSystem : 'Unknown OS',
    deviceKind:
      data.deviceKind === 'desktop' ||
      data.deviceKind === 'phone' ||
      data.deviceKind === 'tablet'
        ? data.deviceKind
        : 'unknown',
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : new Date(0).toISOString(),
    lastSeenAt:
      typeof data.lastSeenAt === 'string' ? data.lastSeenAt : new Date(0).toISOString(),
    current: id === currentSessionId,
  };
}

export async function touchDeviceSession(options: {
  decoded: DecodedIdToken;
  sessionId: string;
  userAgent: string;
}): Promise<DeviceSession | null> {
  const { decoded, sessionId, userAgent } = options;
  if (!isValidDeviceSessionId(sessionId)) return null;

  const db = await getDb();
  const ref = db.doc(`${sessionCollectionPath(decoded.uid)}/${sessionId}`);
  const now = new Date().toISOString();
  const device = parseDeviceUserAgent(userAgent);
  let active = true;
  let createdAt = now;
  let lastSeenAt = now;
  let isNewSession = false;

  await db.runTransaction(async (transaction) => {
    const controlSnap = await transaction.get(db.doc(sessionControlPath(decoded.uid)));
    const revokedBeforeAuthTime = Number(controlSnap.data()?.revokedBeforeAuthTime || 0);
    if (revokedBeforeAuthTime && Number(decoded.auth_time || 0) <= revokedBeforeAuthTime) {
      active = false;
      return;
    }

    const snap = await transaction.get(ref);
    const existing = snap.exists ? (snap.data() as Partial<StoredDeviceSession>) : null;
    if (existing?.revokedAt || existing?.endedAt) {
      active = false;
      return;
    }

    isNewSession = !existing;

    createdAt = existing?.createdAt || now;
    lastSeenAt = existing?.lastSeenAt || now;
    const lastWriteMs = Date.parse(lastSeenAt);
    if (
      existing &&
      Number.isFinite(lastWriteMs) &&
      Date.now() - lastWriteMs < ACTIVITY_WRITE_INTERVAL_MS
    ) {
      return;
    }

    const authTime = Number(decoded.auth_time || 0);
    lastSeenAt = now;
    transaction.set(
      ref,
      {
        ...device,
        authTime,
        createdAt,
        lastSeenAt: now,
        revokedAt: null,
        endedAt: null,
      } satisfies StoredDeviceSession,
      { merge: true }
    );
  });

  if (isNewSession && active) {
    const { notifyAdminNewDevice } = await import('@/lib/server/security-alerts');
    void notifyAdminNewDevice({
      email: decoded.email || null,
      uid: decoded.uid,
      browser: device.browser,
      operatingSystem: device.operatingSystem,
    });
  }

  return active
    ? publicSession(
        sessionId,
        {
          ...device,
          authTime: Number(decoded.auth_time || 0),
          createdAt,
          lastSeenAt,
        },
        sessionId
      )
    : null;
}

export async function setDeviceSessionRevocationCutoff(userId: string): Promise<void> {
  const db = await getDb();
  await db.doc(sessionControlPath(userId)).set(
    {
      revokedBeforeAuthTime: Math.floor(Date.now() / 1000),
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function listDeviceSessions(
  userId: string,
  currentSessionId: string
): Promise<DeviceSession[]> {
  const db = await getDb();
  const snap = await db.collection(sessionCollectionPath(userId)).limit(50).get();

  return snap.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as Partial<StoredDeviceSession> }))
    .filter(({ data }) => !data.revokedAt && !data.endedAt)
    .map(({ id, data }) => publicSession(id, data, currentSessionId))
    .sort((a, b) => {
      if (a.current !== b.current) return a.current ? -1 : 1;
      return Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt);
    });
}

export async function endDeviceSession(userId: string, sessionId: string): Promise<void> {
  if (!isValidDeviceSessionId(sessionId)) return;
  const db = await getDb();
  await db.doc(`${sessionCollectionPath(userId)}/${sessionId}`).set(
    { endedAt: new Date().toISOString() },
    { merge: true }
  );
}

export async function revokeDeviceSession(options: {
  userId: string;
  targetSessionId: string;
  currentSessionId: string;
}): Promise<boolean> {
  const { userId, targetSessionId, currentSessionId } = options;
  if (!isValidDeviceSessionId(targetSessionId) || targetSessionId === currentSessionId) return false;

  const db = await getDb();
  const ref = db.doc(`${sessionCollectionPath(userId)}/${targetSessionId}`);
  const snap = await ref.get();
  if (!snap.exists) return false;

  await ref.set(
    {
      revokedAt: new Date().toISOString(),
      revokedBySessionId: currentSessionId,
    },
    { merge: true }
  );
  return true;
}

export async function revokeAllDeviceSessions(options: {
  userId: string;
  currentSessionId: string;
  includeCurrent: boolean;
}): Promise<number> {
  const { userId, currentSessionId, includeCurrent } = options;
  const db = await getDb();
  const snap = await db.collection(sessionCollectionPath(userId)).limit(100).get();
  const batch = db.batch();
  const now = new Date().toISOString();
  let count = 0;

  snap.docs.forEach((session) => {
    const data = session.data() as Partial<StoredDeviceSession>;
    if (data.revokedAt || data.endedAt) return;
    if (!includeCurrent && session.id === currentSessionId) return;
    batch.set(
      session.ref,
      { revokedAt: now, revokedBySessionId: currentSessionId },
      { merge: true }
    );
    count += 1;
  });

  if (count > 0) await batch.commit();
  return count;
}
