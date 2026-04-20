/**
 * Backblaze B2 upload helper.
 *
 * Flow:
 *  1. Ask the `b2-presigned-upload` edge function for a presigned PUT URL.
 *  2. PUT the file (or compressed blob) directly to Backblaze B2.
 *  3. Return the public Friendly URL (public bucket) OR the storage key
 *     prefixed with `b2-private://` (private bucket).
 *
 * No file content passes through any server we control — this is a direct
 * browser → B2 upload, which is fast and avoids edge-function payload limits.
 */

import { supabase } from "@/integrations/supabase/client";

export interface B2UploadResult {
  /** For public uploads: the Friendly URL.
   *  For private uploads: an opaque reference of the form `b2-private://<key>`
   *  that must be persisted and later resolved via `getPrivateB2Url`. */
  publicUrl: string;
  /** Raw object key inside the bucket. */
  key: string;
  /** True if uploaded to the private bucket. */
  isPrivate: boolean;
}

export interface B2UploadOptions {
  /** Folder prefix inside the bucket (e.g. "vendor-assets", "social-media"). */
  folder: string;
  /** Original filename (used to derive extension + slug). */
  filename: string;
  /** MIME type sent in the PUT request. */
  contentType: string;
  /** Optional progress callback (0-100). */
  onProgress?: (percent: number) => void;
  /** Upload to the PRIVATE B2 bucket. Required for KYC and other regulated docs. */
  private?: boolean;
}

async function getPresignedUrl(opts: {
  folder: string;
  filename: string;
  contentType: string;
  private?: boolean;
  fileBase64?: string;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string; isPrivate: boolean }> {
  const { data, error } = await supabase.functions.invoke("b2-presigned-upload", {
    body: {
      folder: opts.folder,
      filename: opts.filename,
      contentType: opts.contentType,
      private: opts.private === true,
      fileBase64: opts.fileBase64,
    },
  });

  if (error) {
    throw new Error(`Failed to get B2 upload URL: ${error.message}`);
  }
  if (typeof data?.key !== "string") {
    throw new Error("B2 presigned-upload returned an invalid response");
  }
  return {
    uploadUrl: typeof data.uploadUrl === "string" ? data.uploadUrl : "",
    publicUrl: typeof data.publicUrl === "string" ? data.publicUrl : "",
    key: data.key as string,
    isPrivate: data.isPrivate === true,
  };
}

const INLINE_UPLOAD_THRESHOLD_BYTES = 8 * 1024 * 1024;

async function blobToBase64(file: Blob | File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

/**
 * Upload a Blob/File directly to Backblaze B2 using a presigned URL.
 * Returns the public Friendly URL (public bucket) or the `b2-private://<key>`
 * reference (private bucket).
 */
export async function uploadToB2(
  file: Blob | File,
  options: B2UploadOptions,
): Promise<B2UploadResult> {
  const { folder, filename, contentType, onProgress } = options;
  const shouldInlineUpload = file.size <= INLINE_UPLOAD_THRESHOLD_BYTES;

  if (shouldInlineUpload) {
    onProgress?.(0);
    const { publicUrl, key, isPrivate } = await getPresignedUrl({
      folder,
      filename,
      contentType,
      private: options.private,
      fileBase64: await blobToBase64(file),
    });
    onProgress?.(100);
    return {
      publicUrl: isPrivate ? `b2-private://${key}` : publicUrl,
      key,
      isPrivate,
    };
  }

  const { uploadUrl, publicUrl, key, isPrivate } = await getPresignedUrl({
    folder,
    filename,
    contentType,
    private: options.private,
  });

  const uploadViaBrowser = () => new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", contentType);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`B2 upload failed (${xhr.status}): ${xhr.responseText?.slice(0, 200)}`));
      }
    };
    xhr.onerror = () => reject(new Error("Network error uploading to B2"));
    xhr.send(file);
  });

  await uploadViaBrowser();

  const returnedUrl = isPrivate ? `b2-private://${key}` : publicUrl;
  return { publicUrl: returnedUrl, key, isPrivate };
}

/**
 * Resolve a stored value that may be either:
 *   - a regular public URL (legacy or public-bucket upload), OR
 *   - a `b2-private://<key>` reference pointing to the private bucket.
 *
 * For the private case, calls the `b2-presigned-download` edge function
 * (admin-only) and returns a short-lived signed GET URL.
 *
 * Returns null if the input is empty or signing fails.
 */
export async function resolveB2Url(
  storedValue: string | null | undefined,
  expiresSeconds = 300,
): Promise<string | null> {
  if (!storedValue) return null;
  const value = storedValue.trim();
  if (!value) return null;
  if (!value.startsWith("b2-private://")) {
    // Public URL or legacy URL — return as-is.
    return value;
  }

  const key = value.slice("b2-private://".length);
  const { data, error } = await supabase.functions.invoke("b2-presigned-download", {
    body: { key, expiresSeconds },
  });
  if (error || !data?.url) {
    console.error("[resolveB2Url] failed to sign", error);
    return null;
  }
  return data.url as string;
}

/** True if the stored value points to the private B2 bucket. */
export function isPrivateB2Ref(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith("b2-private://");
}
