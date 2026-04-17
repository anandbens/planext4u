import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.p4u_customer",
  appName: "Planext4u",
  webDir: "dist",
  server: {
    url: "https://www.planext4u.net",
    androidScheme: "https",
    iosScheme: "https",
    allowNavigation: ["www.planext4u.net", "planext4u.net", "*.planext4u.net", "*.supabase.co", "*.firebaseapp.com", "*.googleapis.com"],
  },
  ios: {
    // Keep the WebView clear of the status bar / home indicator
    contentInset: "always",
    // Allow scrolling past the bounds (native iOS feel)
    scrollEnabled: true,
    // Prefer light status-bar text on the brand teal background
    backgroundColor: "#009999",
    // Required for Apple Sign-In / OAuth callbacks if used later
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
      // 'native' keeps inputs visible on iOS without breaking sticky headers
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
