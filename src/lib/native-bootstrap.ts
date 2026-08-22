/**
 * Native (iOS / Android) runtime bootstrap.
 *
 * Wires up Keyboard, StatusBar and back-button handling so that screens
 * render correctly on every iOS form factor (notch / dynamic island /
 * home indicator) and the App Store reviewer doesn't reject the build
 * because of broken keyboard / status-bar behaviour.
 */
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

export async function initNativeBridges() {
  if (!Capacitor.isNativePlatform()) return;
  const platform = Capacitor.getPlatform();

  // -------- Status Bar --------
  try {
    const { StatusBar, Style } = await import("@capacitor/status-bar");
    await StatusBar.setStyle({ style: Style.Light });
    if (platform === "android") {
      await StatusBar.setBackgroundColor({ color: "#009999" });
    }
    // overlaysWebView=false in capacitor.config keeps WebView under the bar
    await StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  } catch (e) {
    /* non-fatal */
  }

  // -------- Splash Screen --------
  try {
    const { SplashScreen } = await import("@capacitor/splash-screen");
    // Hide a tad earlier than the configured 2s so first paint feels snappy
    setTimeout(() => SplashScreen.hide().catch(() => {}), 1200);
  } catch (e) {
    /* non-fatal */
  }

  // -------- Keyboard (iOS visible-viewport handling) --------
  try {
    const { Keyboard } = await import("@capacitor/keyboard");
    Keyboard.addListener("keyboardWillShow", () => {
      document.documentElement.classList.add("ios-keyboard-open");
    });
    Keyboard.addListener("keyboardWillHide", () => {
      document.documentElement.classList.remove("ios-keyboard-open");
    });
  } catch (e) {
    /* non-fatal — plugin not installed */
  }

  // -------- App lifecycle (back button + resume) --------
  try {
    const { App } = await import("@capacitor/app");

    // Hardware / gesture back button (Android only)
    if (platform === "android") {
      App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });
    }

    // When the app is resumed from background (or relaunched without a full
    // process kill), proactively refresh the Supabase session so any JWT
    // that expired while we were backgrounded is renewed BEFORE the first
    // RLS-protected query runs. Without this, users sometimes see a flash
    // of "logged out" UI on app resume even though their refresh token is
    // still valid.
    App.addListener("appStateChange", async ({ isActive }) => {
      if (!isActive) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await supabase.auth.refreshSession();
      } catch { /* non-fatal — auto-refresh will retry */ }
    });
  } catch (e) {
    /* non-fatal */
  }

  // -------- AdMob banner (native only) --------
  try {
    const { initAdMobBanner } = await import("./admob");
    void initAdMobBanner();
  } catch {
    /* non-fatal */
  }
}
