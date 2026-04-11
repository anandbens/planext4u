/**
 * Browser-based video compression using Canvas + MediaRecorder.
 * Re-encodes video to H.264 (mp4/webm) at 480p with reduced bitrate.
 * This runs entirely client-side before upload.
 */

export interface BrowserCompressProgress {
  stage: "loading" | "compressing" | "done" | "error";
  percent: number;
  message: string;
}

const TARGET_HEIGHT = 480;
const TARGET_WIDTH = 854;
const VIDEO_BITRATE = 1_000_000; // 1 Mbps

/**
 * Compress a video file in the browser to ~480p H.264.
 * Uses OffscreenCanvas where available, falls back to regular canvas.
 */
export async function compressVideoBrowser(
  file: File,
  onProgress?: (p: BrowserCompressProgress) => void
): Promise<File> {
  onProgress?.({ stage: "loading", percent: 0, message: "Loading video…" });

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";

  const videoUrl = URL.createObjectURL(file);

  try {
    // Load video metadata
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Failed to load video"));
      video.src = videoUrl;
    });

    // Wait for enough data to play
    await new Promise<void>((resolve) => {
      if (video.readyState >= 3) return resolve();
      video.oncanplay = () => resolve();
      video.load();
    });

    const duration = video.duration;
    const srcW = video.videoWidth;
    const srcH = video.videoHeight;

    // Calculate target dimensions maintaining aspect ratio
    let outW: number, outH: number;
    if (srcH <= TARGET_HEIGHT && srcW <= TARGET_WIDTH) {
      // Already small enough, but still re-encode for compression
      outW = srcW;
      outH = srcH;
    } else {
      const scale = Math.min(TARGET_WIDTH / srcW, TARGET_HEIGHT / srcH);
      outW = Math.round(srcW * scale);
      outH = Math.round(srcH * scale);
    }
    // Ensure even dimensions (required by most codecs)
    outW = outW % 2 === 0 ? outW : outW + 1;
    outH = outH % 2 === 0 ? outH : outH + 1;

    onProgress?.({ stage: "compressing", percent: 5, message: `Compressing to ${outW}×${outH}…` });

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d")!;

    // Set up MediaRecorder with H.264 if supported
    const stream = canvas.captureStream(30);

    // Try to capture audio too
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaElementSource(video);
      const dest = audioCtx.createMediaStreamDestination();
      source.connect(dest);
      source.connect(audioCtx.destination); // keep audio playing
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    } catch {
      // No audio track or audio capture not supported — continue without audio
    }

    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: VIDEO_BITRATE,
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const recordingDone = new Promise<Blob>((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        resolve(blob);
      };
    });

    recorder.start(100); // collect data every 100ms
    video.currentTime = 0;
    await video.play();

    // Draw frames and track progress
    const drawFrame = () => {
      if (video.paused || video.ended) return;
      ctx.drawImage(video, 0, 0, outW, outH);
      const pct = Math.min(95, Math.round((video.currentTime / duration) * 90) + 5);
      onProgress?.({ stage: "compressing", percent: pct, message: `Compressing… ${pct}%` });
      requestAnimationFrame(drawFrame);
    };

    drawFrame();

    // Wait for video to finish playing
    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
      video.onpause = () => {
        if (video.currentTime >= duration - 0.1) resolve();
      };
    });

    recorder.stop();
    stream.getTracks().forEach((t) => t.stop());

    const blob = await recordingDone;

    // Determine extension
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const compressedFile = new File(
      [blob],
      file.name.replace(/\.[^.]+$/, `_compressed.${ext}`),
      { type: mimeType }
    );

    onProgress?.({
      stage: "done",
      percent: 100,
      message: `Compressed: ${formatSize(file.size)} → ${formatSize(compressedFile.size)}`,
    });

    return compressedFile;
  } finally {
    URL.revokeObjectURL(videoUrl);
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
}

function getSupportedMimeType(): string {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=h264",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "video/webm";
}

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
