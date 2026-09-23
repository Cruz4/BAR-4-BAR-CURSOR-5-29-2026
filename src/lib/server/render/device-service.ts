import 'server-only';

import { randomBytes } from 'crypto';
import { getDb } from '@/lib/firebase/server';
import type { RenderDeviceCapability, RenderDeviceRecord } from '@/lib/song-generation/types';

const HEARTBEAT_TTL_MS = 90_000;

export function generatePairingCode(): string {
  return randomBytes(3).toString('hex').toUpperCase();
}

export async function createPairingChallenge(uid: string): Promise<{ code: string; expiresAt: string }> {
  const db = await getDb();
  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + 10 * 60_000).toISOString();
  await db.doc(`users/${uid}/renderPairing/${code}`).set({
    code,
    expiresAt,
    createdAt: new Date().toISOString(),
  });
  return { code, expiresAt };
}

export async function completePairing(
  uid: string,
  code: string,
  label: string,
  capability: RenderDeviceCapability,
  companionVersion: string
): Promise<{ deviceId: string; deviceToken: string }> {
  const db = await getDb();
  const pairRef = db.doc(`users/${uid}/renderPairing/${code.toUpperCase()}`);
  const pairSnap = await pairRef.get();
  if (!pairSnap.exists) throw new Error('Invalid pairing code');
  const expiresAt = pairSnap.data()?.expiresAt as string;
  if (new Date(expiresAt).getTime() < Date.now()) throw new Error('Pairing code expired');

  const deviceId = randomBytes(12).toString('hex');
  const deviceToken = randomBytes(24).toString('hex');
  const now = new Date().toISOString();
  const record: RenderDeviceRecord & { deviceTokenHash: string } = {
    id: deviceId,
    label: label.slice(0, 80) || 'Render PC',
    capability,
    companionVersion,
    modelRevisions: {},
    lastHeartbeatAt: now,
    createdAt: now,
    deviceTokenHash: deviceToken,
  };
  await db.doc(`users/${uid}/renderDevices/${deviceId}`).set(record);
  await pairRef.delete();
  return { deviceId, deviceToken };
}

export async function heartbeatDevice(
  uid: string,
  deviceId: string,
  deviceToken: string,
  patch: Partial<Pick<RenderDeviceRecord, 'capability' | 'companionVersion' | 'modelRevisions'>>
): Promise<void> {
  const db = await getDb();
  const ref = db.doc(`users/${uid}/renderDevices/${deviceId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Device not found');
  const data = snap.data() as RenderDeviceRecord & { deviceTokenHash?: string };
  if (data.revokedAt) throw new Error('Device revoked');
  if (data.deviceTokenHash !== deviceToken) throw new Error('Invalid device token');
  await ref.set(
    {
      ...patch,
      lastHeartbeatAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function listOnlineDevices(uid: string): Promise<RenderDeviceRecord[]> {
  const db = await getDb();
  const snap = await db.collection(`users/${uid}/renderDevices`).get();
  const now = Date.now();
  return snap.docs
    .map((d) => d.data() as RenderDeviceRecord)
    .filter((d) => !d.revokedAt && now - new Date(d.lastHeartbeatAt).getTime() < HEARTBEAT_TTL_MS);
}
