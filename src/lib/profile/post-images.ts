import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getClientStorage } from '@/lib/firebase/client/firebase';
import { dataUrlToBlob } from '@/lib/cover-art';
import { completeUploadTicket, requestUploadTicket } from '@/lib/upload-ticket-client';

export const POST_IMAGE_MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const POST_IMAGE_MAX_EDGE = 1600;
/** After compress — Storage write cap is 8MB. */
export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
/** Guest sandbox lives in sessionStorage — keep data URLs small. */
export const POST_IMAGE_GUEST_MAX_BYTES = 220 * 1024;
const POST_IMAGE_MIN_EDGE = 16;

export type PendingPostImage = {
  blob: Blob;
  previewUrl: string;
  contentType: string;
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = src;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('Could not process that image.'));
        else resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

export function wallImagePostPath(userId: string, postId: string): string {
  return `wall/${userId}/posts/${postId}.jpg`;
}

export function wallImageCommentPath(userId: string, postId: string, commentId: string): string {
  return `wall/${userId}/comments/${postId}/${commentId}.jpg`;
}

export function wallImageDropCommentPath(userId: string, shareId: string, commentId: string): string {
  return `wall/${userId}/drops/${shareId}/${commentId}.jpg`;
}

export function parseImageStoragePath(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const path = raw.trim();
  if (!path.startsWith('wall/') || path.length > 400) return undefined;
  return path;
}

export function imageFileFromClipboard(e: {
  clipboardData?: DataTransfer | null;
}): File | null {
  const data = e.clipboardData;
  if (!data) return null;
  const files = data.files?.length ? Array.from(data.files) : [];
  const fromFiles = files.find((f) => f.type.startsWith('image/'));
  if (fromFiles) return fromFiles;
  const items = data.items ? Array.from(data.items) : [];
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile();
      if (file) return file;
    }
  }
  return null;
}

export function revokePostImagePreview(image: PendingPostImage | null | undefined): void {
  if (!image?.previewUrl) return;
  try {
    URL.revokeObjectURL(image.previewUrl);
  } catch {
    /* ignore */
  }
}

export async function processPostImageFile(
  file: File | Blob,
  opts?: { maxBytes?: number }
): Promise<PendingPostImage> {
  const maxBytes = opts?.maxBytes ?? POST_IMAGE_MAX_BYTES;
  const type = file.type || 'image/jpeg';
  if (!type.startsWith('image/')) {
    throw new Error('Please choose a JPG, PNG, WebP, or GIF image.');
  }
  if (file.size > POST_IMAGE_MAX_INPUT_BYTES) {
    throw new Error('Image is too large (max 10MB).');
  }

  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(blobUrl);
    const srcW = img.naturalWidth || img.width;
    const srcH = img.naturalHeight || img.height;
    if (srcW < POST_IMAGE_MIN_EDGE || srcH < POST_IMAGE_MIN_EDGE) {
      throw new Error('That image is too small to post.');
    }

    const scale = Math.min(1, POST_IMAGE_MAX_EDGE / Math.max(srcW, srcH));
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process image in this browser.');
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.86;
    let blob = await canvasToJpegBlob(canvas, quality);
    while (blob.size > maxBytes && quality > 0.42) {
      quality -= 0.08;
      blob = await canvasToJpegBlob(canvas, quality);
    }
    if (blob.size > maxBytes) {
      throw new Error('Image is still too large after compressing. Try a smaller photo.');
    }

    return {
      blob,
      previewUrl: URL.createObjectURL(blob),
      contentType: 'image/jpeg',
    };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/** Turn a canvas/export data URL into a compressible pending upload (foil share, etc.). */
export async function pendingPostImageFromDataUrl(dataUrl: string): Promise<PendingPostImage> {
  if (!dataUrl.startsWith('data:image/')) {
    throw new Error('Invalid image data.');
  }
  return processPostImageFile(dataUrlToBlob(dataUrl));
}

export async function pendingImageToDataUrl(image: PendingPostImage): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result.startsWith('data:image/')) {
        reject(new Error('Could not attach that image.'));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error('Could not attach that image.'));
    reader.readAsDataURL(image.blob);
  });
}

export async function uploadPostImage(opts: {
  storagePath: string;
  image: PendingPostImage;
  kind?: 'wall_image' | 'fold_image';
}): Promise<{ url: string; storagePath: string }> {
  if (opts.image.blob.size > POST_IMAGE_MAX_BYTES) {
    throw new Error('Image is too large to post.');
  }
  const storagePath = opts.storagePath.slice(0, 400);
  const contentType = opts.image.contentType || 'image/jpeg';
  const ticket = await requestUploadTicket({
    kind: opts.kind || 'wall_image',
    storagePath,
    byteSize: opts.image.blob.size,
    contentType,
  });

  const storage = getClientStorage();
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, opts.image.blob, {
    contentType,
    customMetadata: { uploadTicket: ticket.ticketId },
  });
  await completeUploadTicket(ticket.ticketId);
  const url = await getDownloadURL(fileRef);
  return {
    url: url.slice(0, 2000),
    storagePath,
  };
}

export async function deletePostImageStorage(storagePath: string | undefined): Promise<void> {
  if (!storagePath) return;
  try {
    await deleteObject(ref(getClientStorage(), storagePath));
  } catch {
    /* missing is fine */
  }
}
