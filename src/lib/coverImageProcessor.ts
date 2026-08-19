/**
 * frontend/src/lib/coverImageProcessor.ts
 *
 * Client-side book cover image processing pipeline:
 *
 *   User uploads
 *        ↓
 *   Validate format  (JPEG / PNG / WebP / GIF / AVIF / HEIC)
 *        ↓
 *   Validate dimensions  (min 50×50 px)
 *        ↓
 *   Max 10 MB raw file
 *        ↓
 *   Resize if excessively large  (max 1200 px on longest side, maintain aspect ratio)
 *        ↓
 *   Convert to WebP (fallback: JPEG)
 *        ↓
 *   Compress at 85% quality
 *        ↓
 *   Return optimized base64 payload ready for /api/media/upload-cover
 */

/** Formats accepted from the user.  WebP/AVIF/HEIC are browser-dependent. */
const ACCEPTED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
]);

/** Max raw file size the user may upload (10 MB). */
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

/** Longest edge is capped at this many pixels before encoding. */
const MAX_DIMENSION_PX = 1200;

/** Minimum edge — rejects absurdly small images. */
const MIN_DIMENSION_PX = 50;

/** Compression quality (0–1) passed to Canvas toBlob / toDataURL. */
const QUALITY = 0.85;

export interface CoverProcessResult {
  /** base64-encoded image data (no data-URL prefix). */
  base64Data: string;
  /** 'image/webp' or 'image/jpeg' depending on browser support. */
  mimeType: 'image/webp' | 'image/jpeg';
  /** Filename to send to the server, e.g. "cover.webp". */
  fileName: string;
  /** Pixel width of the processed image. */
  width: number;
  /** Pixel height of the processed image. */
  height: number;
  /** Byte size of the final encoded blob. */
  sizeBytes: number;
}

export class CoverProcessError extends Error {
  readonly code:
    | 'INVALID_FORMAT'
    | 'TOO_LARGE'
    | 'TOO_SMALL'
    | 'LOAD_FAILED'
    | 'ENCODE_FAILED';

  constructor(
    code:
      | 'INVALID_FORMAT'
      | 'TOO_LARGE'
      | 'TOO_SMALL'
      | 'LOAD_FAILED'
      | 'ENCODE_FAILED',
    message: string,
  ) {
    super(message);
    this.name = 'CoverProcessError';
    this.code = code;
  }
}

/** Probe whether the browser can encode WebP via Canvas. */
function supportsWebP(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

/** Load a File into an HTMLImageElement, resolving once it's fully decoded. */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new CoverProcessError('LOAD_FAILED', 'Could not decode image. The file may be corrupt.'));
    };
    img.src = url;
  });
}

/**
 * Compute the output dimensions, scaling down proportionally if either edge
 * exceeds MAX_DIMENSION_PX.  Never scales up.
 */
function computeOutputDimensions(
  naturalWidth: number,
  naturalHeight: number,
): { width: number; height: number } {
  let { width, height } = { width: naturalWidth, height: naturalHeight };
  const longest = Math.max(width, height);
  if (longest > MAX_DIMENSION_PX) {
    const scale = MAX_DIMENSION_PX / longest;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }
  return { width, height };
}

/**
 * Draw the image onto an offscreen canvas at the target dimensions and encode
 * it as WebP (or JPEG fallback) at QUALITY.
 *
 * Returns a Promise<Blob> so the caller can measure final byte size.
 */
function encodeImage(
  img: HTMLImageElement,
  width: number,
  height: number,
  mimeType: 'image/webp' | 'image/jpeg',
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new CoverProcessError('ENCODE_FAILED', 'Canvas 2D context unavailable.'));
      return;
    }

    // Fill white background so transparent PNGs/GIFs don't get black in JPEG.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new CoverProcessError('ENCODE_FAILED', 'Image encoding returned an empty result.'));
          return;
        }
        resolve(blob);
      },
      mimeType,
      QUALITY,
    );
  });
}

/** Convert a Blob to a plain base64 string (no data-URL prefix). */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Strip "data:<mime>;base64," prefix
      const base64 = dataUrl.split(',')[1] ?? '';
      resolve(base64);
    };
    reader.onerror = () => reject(new CoverProcessError('ENCODE_FAILED', 'Failed to read encoded image.'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Full processing pipeline.  Throws `CoverProcessError` on any validation or
 * encoding failure so the caller can show a user-friendly message.
 */
export async function processCoverImage(file: File): Promise<CoverProcessResult> {
  // ── 1. Validate format ───────────────────────────────────────────────────
  const mimeLC = file.type.toLowerCase();
  if (!ACCEPTED_MIME_TYPES.has(mimeLC)) {
    throw new CoverProcessError(
      'INVALID_FORMAT',
      `Unsupported file type "${file.type}". Please use JPEG, PNG, WebP, or GIF.`,
    );
  }

  // ── 2. Validate raw file size ────────────────────────────────────────────
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    throw new CoverProcessError(
      'TOO_LARGE',
      `File is ${mb} MB. Maximum allowed size is 10 MB.`,
    );
  }

  // ── 3. Load image ────────────────────────────────────────────────────────
  const img = await loadImage(file);

  // ── 4. Validate minimum dimensions ──────────────────────────────────────
  if (img.naturalWidth < MIN_DIMENSION_PX || img.naturalHeight < MIN_DIMENSION_PX) {
    throw new CoverProcessError(
      'TOO_SMALL',
      `Image is too small (${img.naturalWidth}×${img.naturalHeight} px). Minimum is ${MIN_DIMENSION_PX}×${MIN_DIMENSION_PX} px.`,
    );
  }

  // ── 5. Compute output size (resize if needed) ────────────────────────────
  const { width, height } = computeOutputDimensions(img.naturalWidth, img.naturalHeight);

  // ── 6. Determine output format ───────────────────────────────────────────
  const outputMime: 'image/webp' | 'image/jpeg' = supportsWebP() ? 'image/webp' : 'image/jpeg';
  const ext = outputMime === 'image/webp' ? 'webp' : 'jpg';

  // ── 7. Encode at target size + quality ──────────────────────────────────
  const blob = await encodeImage(img, width, height, outputMime);

  // ── 8. Convert to base64 ─────────────────────────────────────────────────
  const base64Data = await blobToBase64(blob);

  return {
    base64Data,
    mimeType: outputMime,
    fileName: `cover.${ext}`,
    width,
    height,
    sizeBytes: blob.size,
  };
}
