/**
 * Lossless WebP compression utility for all admin / vendor image uploads.
 *
 * - Converts any image file to WebP using the canvas WebP encoder.
 * - Default quality = 1.0 → triggers WebP's LOSSLESS encoder in all major
 *   browsers (Chrome, Edge, Safari 14+, Firefox). The encoder still applies
 *   maximum entropy compression, just without quality loss.
 * - Falls back to JPEG only if the browser cannot encode WebP at all
 *   (effectively never on modern browsers).
 *
 * Why lossless?
 *   Admin-uploaded media (banners, product images, category icons, splash
 *   screens, etc.) is rendered at full fidelity across the marketplace and
 *   should never be visibly degraded by client-side compression.
 */

const WEBP_QUALITY_LOSSLESS = 1.0;   // 1.0 → WebP lossless encoder
const MAX_DIMENSION = 4096;          // preserve high-resolution source detail

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob && blob.size > 0) {
          resolve(blob);
        } else {
          // WebP not supported in this browser — extremely rare.
          // Fall back to high-quality JPEG so the upload still succeeds.
          canvas.toBlob(
            (jpegBlob) => jpegBlob ? resolve(jpegBlob) : reject(new Error('Canvas to blob failed')),
            'image/jpeg',
            0.95,
          );
        }
      },
      'image/webp',
      quality,
    );
  });
}

/**
 * Compress an image file to WebP format.
 *
 * Default behaviour is **lossless** WebP. Callers can opt-in to lossy mode
 * by passing `quality < 1`.
 */
export async function compressToWebP(
  file: File,
  opts?: { maxDimension?: number; quality?: number }
): Promise<{ blob: Blob; fileName: string; contentType: string; originalSize: number; compressedSize: number }> {
  // Skip non-image files
  if (!file.type.startsWith('image/')) {
    return {
      blob: file,
      fileName: file.name,
      contentType: file.type,
      originalSize: file.size,
      compressedSize: file.size,
    };
  }

  const maxDim = opts?.maxDimension ?? MAX_DIMENSION;
  const quality = opts?.quality ?? WEBP_QUALITY_LOSSLESS;

  const img = await loadImage(file);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Only scale DOWN if larger than maxDim — never upscale (which would lose
  // fidelity vs the source).
  const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
  // High-quality scaling for the rare case we do downscale.
  ctx.imageSmoothingEnabled = true;
  (ctx as any).imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  URL.revokeObjectURL(img.src);

  const blob = await canvasToBlob(canvas, quality);
  const isWebP = blob.type === 'image/webp';
  const ext = isWebP ? 'webp' : 'jpg';
  const baseName = file.name.replace(/\.[^/.]+$/, '');

  return {
    blob,
    fileName: `${baseName}.${ext}`,
    contentType: blob.type,
    originalSize: file.size,
    compressedSize: blob.size,
  };
}
