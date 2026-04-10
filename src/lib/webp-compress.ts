/**
 * Lightweight WebP compression utility for all image uploads.
 * Converts any image file to WebP with maximum compression.
 */

const WEBP_QUALITY = 0.70; // Aggressive compression
const MAX_DIMENSION = 2048;

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
          // WebP not supported, fallback to JPEG
          canvas.toBlob(
            (jpegBlob) => jpegBlob ? resolve(jpegBlob) : reject(new Error('Canvas to blob failed')),
            'image/jpeg',
            quality
          );
        }
      },
      'image/webp',
      quality
    );
  });
}

/**
 * Compress an image file to WebP format with maximum compression.
 * Returns the compressed blob and metadata.
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
  const quality = opts?.quality ?? WEBP_QUALITY;

  const img = await loadImage(file);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  // Scale down if larger than maxDimension
  const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
  canvas.width = Math.round(img.width * ratio);
  canvas.height = Math.round(img.height * ratio);
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
