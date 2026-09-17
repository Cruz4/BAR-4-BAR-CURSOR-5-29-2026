import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getClientStorage } from '@/lib/firebase/client/firebase';
import { completeUploadTicket, requestUploadTicket } from '@/lib/upload-ticket-client';
import { pickMediaRecorderMimeType } from '@/lib/speech-recognition';
import { normalizeAudioContentType } from '@/lib/audio-mime';

export const VOICE_MAX_SECONDS = 60;
export const VOICE_MAX_BYTES = 5 * 1024 * 1024;
export const VOICE_MAX_TRANSCRIPT = 4000;
/** Optional hello clip on Artist Home — first badge under the portrait. */
export const PROFILE_VOICE_MEMO_MAX_SECONDS = 3;
export const PROFILE_VOICE_MEMO_MAX_BYTES = 1 * 1024 * 1024;

export type VoiceNote = {
  url: string;
  storagePath: string;
  contentType: string;
  durationSec: number;
  byteSize: number;
  transcript?: string;
};

export type RecordedVoiceClip = {
  blob: Blob;
  objectUrl: string;
  durationSec: number;
  contentType: string;
  transcript: string;
};

export function voiceRecorderSupported(): boolean {
  return typeof window !== 'undefined'
    && typeof MediaRecorder !== 'undefined'
    && typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia)
    && Boolean(pickMediaRecorderMimeType());
}

export function extForVoiceType(contentType: string): string {
  const type = normalizeAudioContentType(contentType);
  if (type === 'audio/mp4') return 'm4a';
  if (type === 'audio/ogg') return 'ogg';
  if (type === 'audio/wav') return 'wav';
  if (type === 'audio/mpeg') return 'mp3';
  return 'webm';
}

export function voicePostStoragePath(userId: string, postId: string, contentType: string): string {
  return `voice/${userId}/posts/${postId}.${extForVoiceType(contentType)}`;
}

export function voiceCommentStoragePath(
  userId: string,
  postId: string,
  commentId: string,
  contentType: string
): string {
  return `voice/${userId}/comments/${postId}/${commentId}.${extForVoiceType(contentType)}`;
}

export function voiceProfileMemoStoragePath(userId: string, contentType: string): string {
  return `voice/${userId}/profile/memo-${Date.now()}.${extForVoiceType(contentType)}`;
}

export function parseVoiceNote(raw: unknown): VoiceNote | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const url = typeof data.url === 'string' ? data.url.trim() : '';
  const storagePath = typeof data.storagePath === 'string' ? data.storagePath.trim() : '';
  const contentType = typeof data.contentType === 'string' ? data.contentType.trim() : '';
  const durationSec = typeof data.durationSec === 'number' ? data.durationSec : Number(data.durationSec);
  const byteSize = typeof data.byteSize === 'number' ? data.byteSize : Number(data.byteSize);
  if (!url || !storagePath || !Number.isFinite(durationSec) || durationSec <= 0) return undefined;
  const transcript =
    typeof data.transcript === 'string' && data.transcript.trim()
      ? data.transcript.trim().slice(0, VOICE_MAX_TRANSCRIPT)
      : undefined;
  return {
    url,
    storagePath,
    contentType: contentType || 'audio/webm',
    durationSec,
    byteSize: Number.isFinite(byteSize) && byteSize > 0 ? byteSize : 0,
    ...(transcript ? { transcript } : {}),
  };
}

/** Public 3-second Artist Home hello — no transcript, hard duration cap. */
export function parseProfileVoiceMemo(raw: unknown): VoiceNote | undefined {
  const note = parseVoiceNote(raw);
  if (!note) return undefined;
  if (note.durationSec > PROFILE_VOICE_MEMO_MAX_SECONDS + 2) return undefined;
  if (!note.storagePath.startsWith('voice/') || !note.storagePath.includes('/profile/')) {
    return undefined;
  }
  return {
    url: note.url,
    storagePath: note.storagePath,
    contentType: note.contentType,
    durationSec: note.durationSec,
    byteSize: note.byteSize,
  };
}

export function voiceNoteToFirestore(note: VoiceNote, maxSeconds = VOICE_MAX_SECONDS): VoiceNote {
  return {
    url: note.url.slice(0, 2000),
    storagePath: note.storagePath.slice(0, 400),
    contentType: normalizeAudioContentType(note.contentType).slice(0, 80),
    durationSec: Math.min(maxSeconds + 2, Math.max(0.2, Number(note.durationSec.toFixed(2)))),
    byteSize: note.byteSize,
    ...(note.transcript?.trim()
      ? { transcript: note.transcript.trim().slice(0, VOICE_MAX_TRANSCRIPT) }
      : {}),
  };
}

export function formatVoiceTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function uploadVoiceClip(opts: {
  storagePath: string;
  clip: RecordedVoiceClip;
  maxSeconds?: number;
  maxBytes?: number;
}): Promise<VoiceNote> {
  const maxBytes = opts.maxBytes ?? VOICE_MAX_BYTES;
  const maxSeconds = opts.maxSeconds ?? VOICE_MAX_SECONDS;
  if (opts.clip.blob.size > maxBytes) {
    throw new Error('That recording is too large. Try a shorter take.');
  }
  if (opts.clip.durationSec > maxSeconds + 2) {
    throw new Error(
      maxSeconds < 60
        ? `Keep it under ${maxSeconds} seconds.`
        : `Recordings max out at ${Math.round(maxSeconds / 60)} minutes.`
    );
  }
  const contentType = normalizeAudioContentType(opts.clip.contentType || opts.clip.blob.type || 'audio/webm');
  const storagePath = opts.storagePath.slice(0, 400);
  const kind = storagePath.startsWith('sheet-takes/')
    ? 'sheet_take'
    : storagePath.startsWith('folds/')
      ? 'fold_voice'
      : 'voice';
  const ticket = await requestUploadTicket({
    kind,
    storagePath,
    byteSize: opts.clip.blob.size,
    contentType,
  });
  const storage = getClientStorage();
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, opts.clip.blob, {
    contentType,
    customMetadata: { uploadTicket: ticket.ticketId },
  });
  await completeUploadTicket(ticket.ticketId);
  const url = await getDownloadURL(fileRef);
  return voiceNoteToFirestore(
    {
      url,
      storagePath: opts.storagePath,
      contentType,
      durationSec: opts.clip.durationSec,
      byteSize: opts.clip.blob.size,
      transcript: opts.clip.transcript,
    },
    maxSeconds
  );
}

export async function deleteVoiceStorage(storagePath: string | undefined): Promise<void> {
  if (!storagePath) return;
  try {
    await deleteObject(ref(getClientStorage(), storagePath));
  } catch {
    /* missing is fine */
  }
}

export function revokeVoiceObjectUrl(clip: RecordedVoiceClip | null | undefined): void {
  if (!clip) return;
  const urls = new Set([clip.objectUrl].filter(Boolean));
  for (const url of urls) {
    try {
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
  }
}
