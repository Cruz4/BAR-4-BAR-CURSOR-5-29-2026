import 'server-only';

import { getAdminBucket } from '@/lib/firebase/server';

export async function uploadTakeAudio(
  storagePath: string,
  bytes: Buffer,
  contentType: string
): Promise<boolean> {
  const objectPath = storagePath?.trim();
  if (!objectPath || !bytes.length) return false;
  try {
    const bucket = getAdminBucket();
    await bucket.file(objectPath).save(bytes, {
      metadata: { contentType },
      resumable: false,
    });
    return true;
  } catch (err) {
    console.warn('[render/upload-take]', objectPath, err);
    return false;
  }
}

export async function downloadTakeAudio(storagePath: string): Promise<Buffer | null> {
  const objectPath = storagePath?.trim();
  if (!objectPath) return null;
  try {
    const bucket = getAdminBucket();
    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buf] = await file.download();
    if (!buf || buf.length < 400) return null;
    return buf;
  } catch {
    return null;
  }
}
