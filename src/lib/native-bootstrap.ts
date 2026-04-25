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

  // -------- Hardware / gesture back button (Android) --------
  if (platform === "android") {
    try {
      const { App } = await import("@capacitor/app");
      App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });
    } catch (e) {
      /* non-fatal */
    }
  }
}
