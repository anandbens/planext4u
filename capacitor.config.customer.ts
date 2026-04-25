import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Production Capacitor config (customer app).
 *
 * NOTE: The `server.url` block was intentionally removed so the native APK
 * loads bundled assets from `dist/` instead of streaming the entire web app
 * from www.planext4u.net on every cold start. This dramatically improves
 * startup time and enables true offline shell behavior.
 *
 * For live-reload during development, create a separate dev config that
 * re-adds a `server.url` pointing at the Lovable preview URL.
 */
const config: CapacitorConfig = {
  appId: "com.p4u_customer",
  appName: "Planext4u",
  webDir: "dist",
  ios: {
    contentInset: "always",
    scrollEnabled: true,
    backgroundColor: "#009999",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#009999",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      iosSpinnerStyle: "small",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      backgroundColor: "#009999",
      style: "LIGHT",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "native",
      style: "DEFAULT",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
