import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.planext4u.rider",
  appName: "Planext4u Rider",
  webDir: "dist",
  server: {
    url: "https://www.planext4u.net/rider/login?portal=rider",
    androidScheme: "https",
    iosScheme: "https",
    allowNavigation: ["www.planext4u.net", "planext4u.net", "*.planext4u.net", "*.supabase.co", "*.firebaseapp.com", "*.googleapis.com"],
  },
  ios: {
    contentInset: "always",
    scrollEnabled: true,
    backgroundColor: "#011d33",
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#011d33",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
      iosSpinnerStyle: "small",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      backgroundColor: "#011d33",
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
    Geolocation: {
      // Live tracking required for delivery
    },
  },
};

export default config;
