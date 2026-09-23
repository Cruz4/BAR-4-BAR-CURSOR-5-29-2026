import 'server-only';

import { getAdminBucket } from '@/lib/firebase/server';
import { buildStudioPreviewWav, STUDIO_PREVIEW_WAV_MIME } from '@/lib/song-generation/studio-preview-wav';

let previewWav: Buffer | null = null;

export function loadLocalPreviewWav(): Buffer {
  if (!previewWav) previewWav = buildStudioPreviewWav();
  return previewWav;
}

export async function uploadRenderStubStream(storagePath: string): Promise<boolean> {
  const objectPath = storagePath?.trim();
  if (!objectPath) return false;
  try {
    const bucket = getAdminBucket();
    const file = bucket.file(objectPath.replace(/\.m4a$/i, '.wav'));
    const [exists] = await file.exists();
    if (!exists) {
      await file.save(loadLocalPreviewWav(), {
        metadata: {
          contentType: STUDIO_PREVIEW_WAV_MIME,
          metadata: { akasheetRenderStub: 'preview-wav' },
        },
        resumable: false,
      });
    }
    return true;
  } catch (err) {
    console.warn('[render/stub-stream]', objectPath, err);
    return false;
  }
}
