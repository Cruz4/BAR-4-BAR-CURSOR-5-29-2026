'use client';

import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase/client/firebase';
import {
  DEVICE_SESSION_STORAGE_KEY,
  isValidDeviceSessionId,
  type DeviceSession,
} from '@/lib/device-sessions';

type LocalDeviceSession = {
  id: string;
  userId: string;
  authTime: number;
};

export class DeviceSessionEndedError extends Error {
  constructor(message = 'This device has been signed out.') {
    super(message);
    this.name = 'DeviceSessionEndedError';
  }
}

function readStoredSession(): LocalDeviceSession | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(DEVICE_SESSION_STORAGE_KEY) || 'null');
    if (
      parsed &&
      isValidDeviceSessionId(parsed.id) &&
      typeof parsed.userId === 'string' &&
      typeof parsed.authTime === 'number'
    ) {
      return parsed as LocalDeviceSession;
    }
  } catch {
    /* create a fresh local session */
  }
  return null;
}

function createSessionId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '_');
  }
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

async function getSessionIdentity(firebaseUser: FirebaseUser): Promise<LocalDeviceSession> {
  const tokenResult = await firebaseUser.getIdTokenResult(false);
  const authTime = Number(tokenResult.claims.auth_time || 0);
  const stored = readStoredSession();
  if (stored && stored.userId === firebaseUser.uid && stored.authTime === authTime) {
    return stored;
  }

  const next: LocalDeviceSession = {
    id: createSessionId(),
    userId: firebaseUser.uid,
    authTime,
  };
  localStorage.setItem(DEVICE_SESSION_STORAGE_KEY, JSON.stringify(next));
  return next;
}

async function sessionRequest<T>(
  firebaseUser: FirebaseUser,
  identity: LocalDeviceSession,
  init: RequestInit
): Promise<T> {
  const token = await firebaseUser.getIdToken(false);
  const response = await fetch('/api/account/sessions', {
    ...init,
    cache: 'no-store',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'x-ba-device-session': identity.id,
      ...(init.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    throw new DeviceSessionEndedError(
      typeof payload.error === 'string' ? payload.error : undefined
    );
  }
  if (!response.ok) {
    throw new Error(
      typeof payload.error === 'string' ? payload.error : 'Could not update signed-in devices.'
    );
  }
  return payload as T;
}

function requireCurrentFirebaseUser(): FirebaseUser {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) throw new DeviceSessionEndedError('Sign-in required.');
  return firebaseUser;
}

export async function touchCurrentDeviceSession(
  firebaseUser: FirebaseUser = requireCurrentFirebaseUser()
): Promise<DeviceSession> {
  const identity = await getSessionIdentity(firebaseUser);
  const result = await sessionRequest<{ session: DeviceSession }>(firebaseUser, identity, {
    method: 'POST',
    body: JSON.stringify({ sessionId: identity.id }),
  });
  return result.session;
}

export async function fetchDeviceSessions(): Promise<DeviceSession[]> {
  const firebaseUser = requireCurrentFirebaseUser();
  const identity = await getSessionIdentity(firebaseUser);
  await touchCurrentDeviceSession(firebaseUser);
  const result = await sessionRequest<{ sessions: DeviceSession[] }>(firebaseUser, identity, {
    method: 'GET',
  });
  return result.sessions;
}

async function patchSessions(
  action: 'end-current' | 'revoke-one' | 'revoke-others' | 'revoke-all',
  targetSessionId?: string
): Promise<{ ok: true; revoked?: number }> {
  const firebaseUser = requireCurrentFirebaseUser();
  const identity = await getSessionIdentity(firebaseUser);
  return sessionRequest(firebaseUser, identity, {
    method: 'PATCH',
    body: JSON.stringify({
      action,
      currentSessionId: identity.id,
      ...(targetSessionId ? { targetSessionId } : {}),
    }),
  });
}

export function revokeDeviceSession(targetSessionId: string) {
  return patchSessions('revoke-one', targetSessionId);
}

export function revokeOtherDeviceSessions() {
  return patchSessions('revoke-others');
}

export function revokeAllDeviceSessions() {
  return patchSessions('revoke-all');
}

export function endCurrentDeviceSession() {
  return patchSessions('end-current');
}

export function clearCurrentDeviceSessionIdentity(): void {
  try {
    localStorage.removeItem(DEVICE_SESSION_STORAGE_KEY);
  } catch {
    /* browser storage may be unavailable */
  }
}
