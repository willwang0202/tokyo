/**
 * Turns a photo off the camera roll into two data URLs small enough to live in
 * a Postgres row: a thumbnail that rides along with every list read, and a
 * full-size version fetched only when someone taps it.
 *
 * Compressing is not optional here. The list is append-only and read over
 * mobile data in Tokyo, so an untouched 4 MB iPhone photo would be both
 * permanent and expensive. Every path below ends either in an image under its
 * cap or in an error — never in an oversized write.
 *
 * The caps and the accepted encodings mirror the CHECK constraints in
 * migration 0003. Changing one without the other means writes start failing.
 */

export const THUMB_MAX_EDGE = 128;
export const THUMB_QUALITY = 0.5;

/** Tried in order until one lands under MAX_FULL_CHARS. */
export const FULL_LADDER = [
  { maxEdge: 1280, quality: 0.75 },
  { maxEdge: 1024, quality: 0.6 },
  { maxEdge: 800, quality: 0.45 },
];

export const MAX_THUMB_CHARS = 20000;
export const MAX_FULL_CHARS = 400000;
export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

/** Kept in step with buy_list_items_image_{thumb,full}_check. */
export const IMAGE_DATA_URL_PATTERN =
  /^data:image\/(?:webp|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Carries zh-TW copy safe to show the user; the cause holds the real detail. */
export class ImageCompressionError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'ImageCompressionError';
  }
}

/**
 * Scales a box down to fit inside `maxEdge`, never up — enlarging a small photo
 * would cost bytes and add nothing.
 *
 * @returns {{width: number, height: number}} At least 1×1
 */
export function fitWithin(width, height, maxEdge) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };

  const scale = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

const toBlob = (canvas, type, quality) =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Encodes WebP where it works and JPEG where it does not.
 *
 * The canvas spec says an unsupported type silently falls back to PNG, and a
 * PNG of a photograph blows the budget several times over — so the returned
 * blob's own type is the only feature test worth trusting. Safari shipped WebP
 * encoding some releases ago, but not on every phone this list will be read on.
 */
async function encode(canvas, quality) {
  const webp = await toBlob(canvas, 'image/webp', quality);
  if (webp?.type === 'image/webp') return webp;
  return toBlob(canvas, 'image/jpeg', quality);
}

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });

/** @returns {Promise<string>} A data URL matching IMAGE_DATA_URL_PATTERN */
async function render(bitmap, maxEdge, quality) {
  const { width, height } = fitWithin(bitmap.width, bitmap.height, maxEdge);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) throw new ImageCompressionError('這個瀏覽器無法處理圖片');

  // JPEG has no alpha channel, so a transparent PNG would composite onto black
  // without this. White matches the card the thumbnail sits on.
  context.fillStyle = '#FFFFFF';
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);

  const blob = await encode(canvas, quality);
  if (!blob) throw new ImageCompressionError('圖片壓縮失敗，請再試一次');

  return blobToDataUrl(blob);
}

/**
 * @param {File|Blob} file A picked image
 * @returns {Promise<{thumb: string, full: string}>} Both under their caps
 * @throws {ImageCompressionError} With zh-TW copy safe to render as-is
 */
export async function compressImage(file) {
  if (!(file instanceof Blob) || !file.type.startsWith('image/')) {
    throw new ImageCompressionError('請選擇圖片檔');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageCompressionError('照片檔案太大，請選 30MB 以下的');
  }
  if (typeof createImageBitmap !== 'function') {
    throw new ImageCompressionError('這個瀏覽器無法處理圖片');
  }

  let bitmap;
  try {
    // `from-image` applies the EXIF rotation iPhones record instead of rotating
    // the pixels. Without it every portrait photo arrives on its side.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (cause) {
    throw new ImageCompressionError('讀不到這張照片，請換一張', { cause });
  }

  try {
    if (!bitmap.width || !bitmap.height) {
      throw new ImageCompressionError('讀不到這張照片，請換一張');
    }

    const thumb = await render(bitmap, THUMB_MAX_EDGE, THUMB_QUALITY);
    if (thumb.length > MAX_THUMB_CHARS) {
      throw new ImageCompressionError('照片壓縮後還是太大，請換一張');
    }

    for (const step of FULL_LADDER) {
      const full = await render(bitmap, step.maxEdge, step.quality);
      if (full.length <= MAX_FULL_CHARS) return { thumb, full };
    }

    throw new ImageCompressionError('照片壓縮後還是太大，請換一張');
  } finally {
    bitmap.close?.();
  }
}
