/** Album cover art — normalized to square 1000×1000 JPEG for vault + DNA Drop display. */

export const COVER_ART_EXPORT_SIZE = 1000;
export const COVER_ART_MIN_DIMENSION = 400;
export const COVER_ART_MAX_INPUT_BYTES = 10 * 1024 * 1024;
/** Base64 string budget, leaving room for album and release metadata in Firestore. */
export const COVER_ART_MAX_OUTPUT_BYTES = 600 * 1024;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image file.'));
    img.src = src;
  });
}

export async function processCoverArtFile(
  file: File
): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a JPG, PNG, or WebP image.');
  }
  if (file.size > COVER_ART_MAX_INPUT_BYTES) {
    throw new Error('Image file is too large (max 10MB).');
  }

  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(blobUrl);
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    if (minDim < COVER_ART_MIN_DIMENSION) {
      throw new Error(
        `Image is too small (${img.naturalWidth}×${img.naturalHeight}). Use at least ${COVER_ART_MIN_DIMENSION}px on the shortest side.`
      );
    }

    const canvas = document.createElement('canvas');
    canvas.width = COVER_ART_EXPORT_SIZE;
    canvas.height = COVER_ART_EXPORT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process image in this browser.');

    const sx = img.naturalWidth > img.naturalHeight ? (img.naturalWidth - img.naturalHeight) / 2 : 0;
    const sy = img.naturalHeight > img.naturalWidth ? (img.naturalHeight - img.naturalWidth) / 2 : 0;
    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, COVER_ART_EXPORT_SIZE, COVER_ART_EXPORT_SIZE);

    let quality = 0.92;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    // Firestore stores the base64 string itself, so compare its actual length;
    // multiplying by the base64 ratio previously allowed images over 1MB.
    while (dataUrl.length > COVER_ART_MAX_OUTPUT_BYTES && quality > 0.36) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    return { dataUrl, width: COVER_ART_EXPORT_SIZE, height: COVER_ART_EXPORT_SIZE };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

/**
 * Artist Home hero photo — smaller than album covers so it fits alongside
 * Artist Home config on the public profile path (Firestore 1MB doc limit).
 */
export const PROFILE_PHOTO_EXPORT_SIZE = 512;
export const PROFILE_PHOTO_MIN_DIMENSION = 200;
export const PROFILE_PHOTO_MAX_OUTPUT_BYTES = 140 * 1024;

export async function processProfilePhotoFile(
  file: File
): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a JPG, PNG, or WebP image.');
  }
  if (file.size > COVER_ART_MAX_INPUT_BYTES) {
    throw new Error('Image file is too large (max 10MB).');
  }

  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(blobUrl);
    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    if (minDim < PROFILE_PHOTO_MIN_DIMENSION) {
      throw new Error(
        `Image is too small (${img.naturalWidth}×${img.naturalHeight}). Use at least ${PROFILE_PHOTO_MIN_DIMENSION}px on the shortest side.`
      );
    }

    const canvas = document.createElement('canvas');
    canvas.width = PROFILE_PHOTO_EXPORT_SIZE;
    canvas.height = PROFILE_PHOTO_EXPORT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process image in this browser.');

    const sx = img.naturalWidth > img.naturalHeight ? (img.naturalWidth - img.naturalHeight) / 2 : 0;
    const sy = img.naturalHeight > img.naturalWidth ? (img.naturalHeight - img.naturalWidth) / 2 : 0;
    ctx.drawImage(
      img,
      sx,
      sy,
      minDim,
      minDim,
      0,
      0,
      PROFILE_PHOTO_EXPORT_SIZE,
      PROFILE_PHOTO_EXPORT_SIZE
    );

    let quality = 0.82;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > PROFILE_PHOTO_MAX_OUTPUT_BYTES * 1.37 && quality > 0.45) {
      quality -= 0.07;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    return { dataUrl, width: PROFILE_PHOTO_EXPORT_SIZE, height: PROFILE_PHOTO_EXPORT_SIZE };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export function isDataUrl(src?: string | null): boolean {
  return Boolean(src?.startsWith('data:'));
}

/** Album Room door banner — center-cropped to 2:1 landscape for the wide door frame. */
export const ROOM_BANNER_WIDTH = 1200;
export const ROOM_BANNER_HEIGHT = 600;
export const ROOM_BANNER_MAX_OUTPUT_BYTES = 450 * 1024;

export async function processAlbumRoomBannerFile(
  file: File
): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose a JPG, PNG, or WebP image.');
  }
  if (file.size > COVER_ART_MAX_INPUT_BYTES) {
    throw new Error('Image file is too large (max 10MB).');
  }

  const blobUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(blobUrl);
    if (img.naturalWidth < 200 || img.naturalHeight < 100) {
      throw new Error(
        `Image is too small (${img.naturalWidth}×${img.naturalHeight}). Use something wider than ~200×100.`
      );
    }

    const targetRatio = ROOM_BANNER_WIDTH / ROOM_BANNER_HEIGHT;
    const srcRatio = img.naturalWidth / img.naturalHeight;
    let sx = 0;
    let sy = 0;
    let sw = img.naturalWidth;
    let sh = img.naturalHeight;
    if (srcRatio > targetRatio) {
      sw = img.naturalHeight * targetRatio;
      sx = (img.naturalWidth - sw) / 2;
    } else {
      sh = img.naturalWidth / targetRatio;
      sy = (img.naturalHeight - sh) / 2;
    }

    const canvas = document.createElement('canvas');
    canvas.width = ROOM_BANNER_WIDTH;
    canvas.height = ROOM_BANNER_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not process image in this browser.');
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, ROOM_BANNER_WIDTH, ROOM_BANNER_HEIGHT);

    let quality = 0.88;
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > ROOM_BANNER_MAX_OUTPUT_BYTES * 1.37 && quality > 0.5) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    return { dataUrl, width: ROOM_BANNER_WIDTH, height: ROOM_BANNER_HEIGHT };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}
