import { isNativePlatform, getPlatform } from "@/lib/capacitor";

/**
 * Microphone permission helper — Capacitor-aware.
 *
 * Why this exists:
 *  • On Capacitor Android the `navigator.permissions.query({name:'microphone'})`
 *    API is unreliable — Chrome WebView frequently returns `denied` even when
 *    the OS-level permission is `prompt` (never asked yet). That false-negative
 *    used to make us short-circuit with "open settings" before ever showing the
 *    OS prompt. We now SKIP the query API on native and let `getUserMedia`
 *    drive the prompt.
 *  • We distinguish between "denied this once" (re-prompt is possible) and
 *    "permanently denied" (user must open Settings). On the web a simple
 *    NotAllowedError can mean either, so we treat consecutive failures as
 *    permanent and tell the user how to recover.
 *  • Errors that happen AFTER a call ends (e.g. mic was released) should never
 *    be surfaced as permission errors — callers must check `granted` BEFORE
 *    starting and ignore probe failures once the call is over.
 */

export interface MicPermissionResult {
  granted: boolean;
  /** True when the OS/browser has permanently blocked the mic — user must open settings. */
  permanentlyDenied?: boolean;
  /** Friendly message for toasts. Empty when granted. */
  reason?: string;
}

export async function ensureMicrophonePermission(): Promise<MicPermissionResult> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return { granted: false, reason: "Microphone is not supported on this device." };
  }

  // Web only: a confident "denied" from the Permissions API means the user
  // explicitly blocked us in browser settings. We can short-circuit there.
  // On native we INTENTIONALLY skip this — the WebView lies (returns denied
  // even on first launch) which would block us from ever showing the OS prompt.
  if (!isNativePlatform()) {
    try {
      const perms = (navigator as any).permissions;
      if (perms?.query) {
        const status = await perms.query({ name: "microphone" as PermissionName });
        if (status.state === "denied") {
          return {
            granted: false,
            permanentlyDenied: true,
            reason:
              "Microphone is blocked in your browser. Click the lock icon in the address bar and allow Microphone, then reload the page.",
          };
        }
      }
    } catch {
      /* ignore — Permissions API not supported (e.g. older Safari) */
    }
  }

  // Trigger the actual OS / browser prompt and probe.
  try {
    const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
    probe.getTracks().forEach((t) => t.stop());
    return { granted: true };
  } catch (err: any) {
    const name: string = err?.name || "";
    const platform = getPlatform();

    if (
      name === "NotAllowedError" ||
      name === "PermissionDeniedError" ||
      name === "SecurityError"
    ) {
      // On native there's no "ask again" — second NotAllowedError after the OS
      // prompt was answered means the user denied (or chose "Don't ask again").
      return {
        granted: false,
        permanentlyDenied: true,
        reason: isNativePlatform()
          ? `Microphone permission denied. Open Settings → Apps → Planext4u → Permissions and enable Microphone${
              platform === "ios" ? "" : " (and Camera for video calls)"
            }, then return to the app.`
          : "Microphone permission was denied. Please allow microphone access in your browser site settings and try again.",
      };
    }
    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return { granted: false, reason: "No microphone found on this device." };
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
      return {
        granted: false,
        reason: "Your microphone is being used by another app. Close it and try again.",
      };
    }
    if (name === "OverconstrainedError" || name === "ConstraintNotSatisfiedError") {
      return { granted: false, reason: "Your microphone does not support the requested settings." };
    }
    // Generic / unknown
    return {
      granted: false,
      reason: err?.message ? `Microphone error: ${err.message}` : "Could not access the microphone.",
    };
  }
}

/**
 * Best-effort "open app settings" for native. Returns true when something was
 * launched. On web there is no API for this — caller should show the friendly
 * reason text instead.
 */
export async function tryOpenAppSettings(): Promise<boolean> {
  if (!isNativePlatform()) return false;
  try {
    // @capacitor-community/native-settings is optional; use only if present.
    const mod: any = await import(/* @vite-ignore */ "@capacitor-community/native-settings").catch(
      () => null,
    );
    if (mod?.NativeSettings?.open) {
      await mod.NativeSettings.open({
        optionAndroid: "application_details",
        optionIOS: "App",
      });
      return true;
    }
  } catch {
    /* plugin not installed — silently fall through */
  }
  return false;
}
