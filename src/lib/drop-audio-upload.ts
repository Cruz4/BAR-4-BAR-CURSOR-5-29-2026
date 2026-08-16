import {
  DROP_AUDIO_MAX_BYTES,
  DROP_PREVIEW_SECONDS,
  dropStoragePrefix,
  type DropAudioMeta,
} from '@/lib/drop-commerce';
import { getClientStorage } from '@/lib/firebase/client/firebase';
import { ref, uploadBytes, deleteObject } from 'firebase/storage';

function writeWav(buffer: AudioBuffer, frameCount: number): Blob {
  const channels = Math.min(2, buffer.numberOfChannels);
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const header = 44;
  const out = new ArrayBuffer(header + dataSize);
  const view = new DataView(out);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  const ch0 = buffer.getChannelData(0);
  const ch1 = channels > 1 ? buffer.getChannelData(1) : ch0;
  let offset = 44;
  for (let i = 0; i < frameCount; i++) {
    const s0 = Math.max(-1, Math.min(1, ch0[i] ?? 0));
    const s1 = Math.max(-1, Math.min(1, ch1[i] ?? 0));
    view.setInt16(offset, s0 < 0 ? s0 * 0x8000 : s0 * 0x7fff, true);
    offset += 2;
    if (channels > 1) {
      view.setInt16(offset, s1 < 0 ? s1 * 0x8000 : s1 * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([out], { type: 'audio/wav' });
}

export async function buildPreviewWav(file: File, maxSeconds = DROP_PREVIEW_SECONDS): Promise<{
  blob: Blob;
  durationSec: number;
}> {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await file.arrayBuffer());
    const durationSec = decoded.duration;
    const frameCount = Math.min(decoded.length, Math.floor(maxSeconds * decoded.sampleRate));
    return { blob: writeWav(decoded, Math.max(1, frameCount)), durationSec };
  } finally {
    void ctx.close();
  }
}

function extForType(file: File): string {
  const name = file.name.toLowerCase();
  const m = name.match(/\.(mp3|wav|m4a|aac|ogg|flac|webm)$/);
  if (m) return m[1];
  if (file.type.includes('wav')) return 'wav';
  if (file.type.includes('mp4') || file.type.includes('aac')) return 'm4a';
  if (file.type.includes('ogg')) return 'ogg';
  if (file.type.includes('flac')) return 'flac';
  if (file.type.includes('webm')) return 'webm';
  return 'mp3';
}

export async function uploadDropAudio(opts: {
  userId: string;
  projectId: string;
  file: File;
}): Promise<DropAudioMeta> {
  if (opts.file.size > DROP_AUDIO_MAX_BYTES) {
    throw new Error('Audio must be under 40 MB.');
  }
  if (!opts.file.type.startsWith('audio/') && !/\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(opts.file.name)) {
    throw new Error('Choose an audio file (mp3, wav, m4a…).');
  }

  const preview = await buildPreviewWav(opts.file);
  const storage = getClientStorage();
  const prefix = dropStoragePrefix(opts.userId, opts.projectId);
  const ext = extForType(opts.file);
  const storagePath = `${prefix}/audio.${ext}`;
  const previewPath = `${prefix}/preview.wav`;
  const contentType = opts.file.type || 'audio/mpeg';

  await uploadBytes(ref(storage, storagePath), opts.file, { contentType });
  await uploadBytes(ref(storage, previewPath), preview.blob, { contentType: 'audio/wav' });

  return {
    storagePath,
    previewPath,
    contentType,
    durationSec: preview.durationSec,
    byteSize: opts.file.size,
    fileName: opts.file.name,
    uploadedAt: new Date().toISOString(),
  };
}

export async function deleteDropAudioFiles(meta: DropAudioMeta | undefined): Promise<void> {
  if (!meta?.storagePath) return;
  const storage = getClientStorage();
  try {
    await deleteObject(ref(storage, meta.storagePath));
  } catch {
    /* missing is fine */
  }
  if (meta.previewPath) {
    try {
      await deleteObject(ref(storage, meta.previewPath));
    } catch {
      /* missing is fine */
    }
  }
}
