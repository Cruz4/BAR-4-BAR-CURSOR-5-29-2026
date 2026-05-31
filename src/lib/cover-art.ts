/** Album cover art — normalized to square 1000×1000 JPEG for vault + DNA Drop display. */

export const COVER_ART_EXPORT_SIZE = 1000;
export const COVER_ART_MIN_DIMENSION = 400;
export const COVER_ART_MAX_INPUT_BYTES = 10 * 1024 * 1024;
/** ~800KB base64 budget for Firestore-friendly payloads */
export const COVER_ART_MAX_OUTPUT_BYTES = 800 * 1024;

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
    while (dataUrl.length > COVER_ART_MAX_OUTPUT_BYTES * 1.37 && quality > 0.52) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }

    return { dataUrl, width: COVER_ART_EXPORT_SIZE, height: COVER_ART_EXPORT_SIZE };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

export function isDataUrl(src?: string | null): boolean {
  return Boolean(src?.startsWith('data:'));
}
