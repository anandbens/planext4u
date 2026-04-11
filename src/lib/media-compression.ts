/**
 * Media Compression & Upload Utility for P4U
 * - Client-side image compression to WebP
 * - Multi-size responsive image generation
 * - EXIF stripping
 * - Upload progress tracking
 * - Storage naming convention: {userId}/{module}/{postId}/{size}.webp
 */

import { supabase } from "@/integrations/supabase/client";

export interface CompressionProgress {
  stage: 'compressing' | 'uploading' | 'complete' | 'error';
  percent: number;
  originalSize: number;
  compressedSize?: number;
  savedText?: string;
}

export interface ImageSizes {
  thumbnail: Blob; // 150x150
  medium: Blob;    // 640px wide
  large: Blob;     // 1080px wide
  original: Blob;  // max 2048px
}

export interface UploadResult {
  thumbnailUrl: string;
  mediumUrl: string;
  largeUrl: string;
  originalUrl: string;
  blurHash?: string;
}

const QUALITY = 0.75; // High quality with maximum compression
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_VIDEO_DURATION = 45; // seconds

const SIZE_CONFIGS = [
  { name: 'thumbnail', maxWidth: 150, maxHeight: 150, crop: true },
  { name: 'medium', maxWidth: 640, maxHeight: null, crop: false },
  { name: 'large', maxWidth: 1080, maxHeight: null, crop: false },
  { name: 'original', maxWidth: 2048, maxHeight: null, crop: false },
] as const;

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

function canvasToWebP(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Try WebP first, fall back to JPEG if unsupported
    canvas.toBlob(
      (blob) => {
        if (blob && blob.size > 0) {
          resolve(blob);
        } else {
          // WebP not supported, fallback to JPEG
          console.warn('WebP encoding not supported, falling back to JPEG');
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

function resizeImage(
  img: HTMLImageElement,
  maxWidth: number,
  maxHeight: number | null,
  crop: boolean
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;

  if (crop) {
    // Center crop for thumbnails
    const size = Math.min(img.width, img.height);
    const sx = (img.width - size) / 2;
    const sy = (img.height - size) / 2;
    canvas.width = maxWidth;
    canvas.height = maxWidth;
    ctx.drawImage(img, sx, sy, size, size, 0, 0, maxWidth, maxWidth);
  } else {
    const ratio = Math.min(maxWidth / img.width, (maxHeight || Infinity) / img.height, 1);
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  return canvas;
}

// Generate a tiny base64 blur placeholder
async function generateBlurPlaceholder(img: HTMLImageElement): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 20;
  canvas.height = Math.round(20 * (img.height / img.width));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', 0.1);
}

export function validateImageFile(file: File): string | null {
  if (file.size > MAX_IMAGE_SIZE) {
    return `Image too large (${formatFileSize(file.size)}). Max: 10MB`;
  }
  if (!file.type.startsWith('image/')) {
    return 'Invalid file type. Please upload an image.';
  }
  return null;
}

export function validateVideoFile(file: File): string | null {
  if (file.size > MAX_VIDEO_SIZE) {
    return `Video too large (${formatFileSize(file.size)}). Max: 500MB`;
  }
  if (!file.type.startsWith('video/')) {
    return 'Invalid file type. Please upload a video.';
  }
  return null;
}

export function validateVideoDuration(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.duration > MAX_VIDEO_DURATION) {
        resolve(`Video too long (${Math.round(video.duration)}s). Maximum: ${MAX_VIDEO_DURATION} seconds.`);
      } else {
        resolve(null);
      }
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve('Could not read video metadata.');
    };
    video.src = URL.createObjectURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export async function compressImage(
  file: File,
  onProgress?: (p: CompressionProgress) => void
): Promise<{ sizes: ImageSizes; blurPlaceholder: string }> {
  onProgress?.({ stage: 'compressing', percent: 0, originalSize: file.size });

  const img = await loadImage(file);
  const blurPlaceholder = await generateBlurPlaceholder(img);

  const sizes: Record<string, Blob> = {};

  for (let i = 0; i < SIZE_CONFIGS.length; i++) {
    const config = SIZE_CONFIGS[i];
    const canvas = resizeImage(img, config.maxWidth, config.maxHeight ?? null, config.crop);
    const blob = await canvasToWebP(canvas, QUALITY);
    sizes[config.name] = blob;
    onProgress?.({
      stage: 'compressing',
      percent: Math.round(((i + 1) / SIZE_CONFIGS.length) * 100),
      originalSize: file.size,
      compressedSize: blob.size,
    });
  }

  URL.revokeObjectURL(img.src);

  return {
    sizes: sizes as unknown as ImageSizes,
    blurPlaceholder,
  };
}

export async function compressAvatar(file: File): Promise<{ small: Blob; large: Blob }> {
  const img = await loadImage(file);
  const small = await canvasToWebP(resizeImage(img, 150, 150, true), QUALITY);
  const large = await canvasToWebP(resizeImage(img, 300, 300, true), QUALITY);
  URL.revokeObjectURL(img.src);
  return { small, large };
}

export async function uploadMediaToStorage(
  file: File,
  userId: string,
  module: string,
  postId: string,
  onProgress?: (p: CompressionProgress) => void
): Promise<UploadResult> {
  // Compress
  const { sizes, blurPlaceholder } = await compressImage(file, onProgress);

  onProgress?.({ stage: 'uploading', percent: 0, originalSize: file.size });

  const bucket = 'social-media';
  const basePath = `${userId}/${module}/${postId}`;

  const uploadOne = async (blob: Blob, sizeName: string) => {
    const path = `${basePath}/${sizeName}.webp`;
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, blob, { contentType: 'image/webp', upsert: true });
    if (error) throw error;
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 365);
    return data?.signedUrl || '';
  };

  const [thumbnailUrl, mediumUrl, largeUrl, originalUrl] = await Promise.all([
    uploadOne(sizes.thumbnail, 'thumb'),
    uploadOne(sizes.medium, 'medium'),
    uploadOne(sizes.large, 'large'),
    uploadOne(sizes.original, 'original'),
  ]);

  const compressedSize = sizes.medium.size;
  onProgress?.({
    stage: 'complete',
    percent: 100,
    originalSize: file.size,
    compressedSize,
    savedText: `Optimized: ${formatFileSize(file.size)} → ${formatFileSize(compressedSize)} ✓`,
  });

  return { thumbnailUrl, mediumUrl, largeUrl, originalUrl, blurHash: blurPlaceholder };
}

// Extract first frame of video as WebP thumbnail
export async function extractVideoThumbnail(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = 0.5; // grab at 0.5s
    };

    video.onseeked = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(video.videoWidth, 1080);
      canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      try {
        const blob = await canvasToWebP(canvas, 0.85);
        URL.revokeObjectURL(video.src);
        resolve(blob);
      } catch (e) {
        reject(e);
      }
    };

    video.onerror = () => reject(new Error('Failed to load video'));
    video.src = URL.createObjectURL(file);
  });
}
