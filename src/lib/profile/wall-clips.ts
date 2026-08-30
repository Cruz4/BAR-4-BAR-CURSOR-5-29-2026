import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getClientStorage } from '@/lib/firebase/client/firebase';
import { completeUploadTicket, requestUploadTicket } from '@/lib/upload-ticket-client';
import { parseImageStoragePath } from '@/lib/profile/post-images';

export const WALL_CLIP_MAX_SECONDS = 15;
export const WALL_CLIP_MAX_INPUT_BYTES = 40 * 1024 * 1024;
export const WALL_CLIP_MAX_BYTES = 18 * 1024 * 1024;
export const IMAGE_TO_VIDEO_SECONDS = 6;

export type WallClip = {
  url: string;
  storagePath: string;
  contentType: string;
  durationSec: number;
  byteSize: number;
};

export type PendingWallClip = {
  blob: Blob;
  previewUrl: string;
  contentType: string;
  durationSec: number;
  /** First-frame JPEG so feed cards still have a still. */
  posterBlob?: Blob;
};

export function wallClipPostPath(userId: string, postId: string, ext: string): string {
  return `wall/${userId}/posts/${postId}.${ext}`;
}

export function wallClipCommentPath(userId: string, postId: string, commentId: string, ext: string): string {
  return `wall/${userId}/comments/${postId}/${commentId}.${ext}`;
}

export function wallClipDropCommentPath(userId: string, shareId: string, commentId: string, ext: string): string {
  return `wall/${userId}/drops/${shareId}/${commentId}.${ext}`;
}

export function clipExtFromType(contentType: string): string {
  if (contentType.includes('mp4')) return 'mp4';
  return 'webm';
}

export function parseWallClip(raw: unknown): WallClip | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const data = raw as Record<string, unknown>;
  const url = typeof data.url === 'string' ? data.url.trim() : '';
  const storagePath = parseImageStoragePath(data.storagePath);
  const contentType = typeof data.contentType === 'string' ? data.contentType.trim() : '';
  const durationSec = Number(data.durationSec);
  const byteSize = Number(data.byteSize);
  if (!url || url.length > 2000 || !storagePath) return undefined;
  if (!contentType.startsWith('video/') || contentType.length > 80) return undefined;
  if (!Number.isFinite(durationSec) || durationSec <= 0 || durationSec > 20) return undefined;
  if (!Number.isFinite(byteSize) || byteSize <= 0 || byteSize > WALL_CLIP_MAX_BYTES + 1024 * 1024) {
    return undefined;
  }
  return { url, storagePath, contentType, durationSec, byteSize };
}

export function revokeWallClipPreview(clip: PendingWallClip | null | undefined): void {
  if (!clip?.previewUrl) return;
  try {
    URL.revokeObjectURL(clip.previewUrl);
  } catch {
    /* ignore */
  }
}

export async function uploadWallClip(opts: {
  storagePath: string;
  clip: PendingWallClip;
}): Promise<WallClip> {
  if (opts.clip.blob.size > WALL_CLIP_MAX_BYTES) {
    throw new Error('That clip is too large to post.');
  }
  const storagePath = opts.storagePath.slice(0, 400);
  const contentType = opts.clip.contentType || 'video/webm';
  const ticket = await requestUploadTicket({
    kind: 'wall_video',
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
  return {
    url: url.slice(0, 2000),
    storagePath,
    contentType,
    durationSec: Math.max(0.4, Math.min(WALL_CLIP_MAX_SECONDS, opts.clip.durationSec)),
    byteSize: opts.clip.blob.size,
  };
}

export async function deleteWallClipStorage(storagePath: string | undefined): Promise<void> {
  if (!storagePath) return;
  try {
    await deleteObject(ref(getClientStorage(), storagePath));
  } catch {
    /* missing is fine */
  }
}
