/**
 * Backblaze B2 upload helper.
 *
 * Flow:
 *  1. Ask the `b2-presigned-upload` edge function for a presigned PUT URL.
 *  2. PUT the file (or compressed blob) directly to Backblaze B2.
 *  3. Return the public Friendly URL so it can be saved in the database.
 *
 * No file content passes through any server we control — this is a direct
 * browser → B2 upload, which is fast and avoids edge-function payload limits.
 */

import { supabase } from "@/integrations/supabase/client";

export interface B2UploadResult {
  publicUrl: string;
  key: string;
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
}

async function getPresignedUrl(opts: {
  folder: string;
  filename: string;
  contentType: string;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const { data, error } = await supabase.functions.invoke("b2-presigned-upload", {
    body: {
      folder: opts.folder,
      filename: opts.filename,
      contentType: opts.contentType,
    },
  });

  if (error) {
    throw new Error(`Failed to get B2 upload URL: ${error.message}`);
  }
  if (!data?.uploadUrl || !data?.publicUrl) {
    throw new Error("B2 presigned-upload returned an invalid response");
  }
  return data as { uploadUrl: string; publicUrl: string; key: string };
}

/**
 * Upload a Blob/File directly to Backblaze B2 using a presigned URL.
 * Returns the public Friendly URL.
 */
export async function uploadToB2(
  file: Blob | File,
  options: B2UploadOptions,
): Promise<B2UploadResult> {
  const { folder, filename, contentType, onProgress } = options;

  const { uploadUrl, publicUrl, key } = await getPresignedUrl({
    folder,
    filename,
    contentType,
  });

  // Use XHR so we can report upload progress.
  await new Promise<void>((resolve, reject) => {
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

  return { publicUrl, key };
}
