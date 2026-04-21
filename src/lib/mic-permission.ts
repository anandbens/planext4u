import { isNativePlatform } from "@/lib/capacitor";

/**
 * Ensure microphone access is granted before recording or starting a WebRTC call.
 *
 * Strategy (matches Chrome/Android best-practices):
 *  1. Proactively query `navigator.permissions` so we can short-circuit with a
 *     clear "open settings" message if the OS/browser already has it denied.
 *  2. Otherwise call `getUserMedia({ audio: true })` — this triggers the
 *     OS RECORD_AUDIO prompt on Android and the browser bar prompt on web.
 *     On Capacitor Android the WebView additionally needs `onPermissionRequest`
 *     to be granted in MainActivity.java (handled separately).
 *  3. Stop the probe stream immediately so we don't leave the mic busy.
 *
 * Returns:
 *   { granted: true }  — caller can proceed to start the real recording / call
 *   { granted: false, reason } — caller should toast and (optionally) prompt to open settings
 */
export async function ensureMicrophonePermission(): Promise<{
  granted: boolean;
  reason?: string;
}> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { granted: false, reason: "Microphone API not available on this device" };
  }

  // 1) Best-effort proactive permission check.
  try {
    if ((navigator as any).permissions?.query) {
      const status = await (navigator as any).permissions.query({ name: "microphone" as PermissionName });
      if (status.state === "denied") {
        return {
          granted: false,
          reason: isNativePlatform()
            ? "Microphone is blocked. Open App Settings → Permissions → enable Microphone."
            : "Microphone is blocked in your browser. Click the lock icon in the address bar to allow it.",
        };
      }
    }
  } catch {
    /* permission query unsupported (Safari old) — fall through */
  }

  // 2) Trigger the actual prompt and probe.
  try {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
    probe.getTracks().forEach((t) => t.stop());
    return { granted: true };
  } catch (err: any) {
    const name = err?.name || "";
    if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
      return {
        granted: false,
        reason: isNativePlatform()
          ? "Microphone permission denied. Enable it in App Settings → Permissions → Microphone."
          : "Microphone permission denied. Please allow it in your browser site settings.",
      };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return { granted: false, reason: "No microphone found on this device." };
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return { granted: false, reason: "Microphone is in use by another app. Close it and try again." };
    }
    return { granted: false, reason: err?.message || "Could not access microphone" };
  }
}
