import { isNativePlatform } from "@/lib/capacitor";

/**
 * Ensure microphone access is granted before recording.
 *
 * On native (Android/iOS Capacitor shell), `getUserMedia({ audio: true })` itself
 * triggers the OS RECORD_AUDIO runtime prompt the first time. We additionally
 * acquire & immediately stop a stream as a clean "permission probe" so callers
 * can short-circuit with a friendly error instead of silently failing later.
 *
 * Returns:
 *   { granted: true }  — caller can proceed to start the real recording
 *   { granted: false, reason } — caller should surface a toast / open settings
 */
export async function ensureMicrophonePermission(): Promise<{
  granted: boolean;
  reason?: string;
}> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { granted: false, reason: "Microphone API not available on this device" };
  }
  try {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
    probe.getTracks().forEach((t) => t.stop());
    return { granted: true };
  } catch (err: any) {
    const name = err?.name || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError") {
      return {
        granted: false,
        reason: isNativePlatform()
          ? "Microphone permission denied. Enable it in App Settings → Permissions."
          : "Microphone permission denied. Please allow it in your browser.",
      };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return { granted: false, reason: "No microphone found on this device." };
    }
    return { granted: false, reason: err?.message || "Could not access microphone" };
  }
}
