import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.p4u_customer",
  appName: "Planext4u",
  webDir: "dist",
  server: {
    url: "https://www.planext4u.net",
    androidScheme: "https",
    allowNavigation: ["www.planext4u.net", "planext4u.net", "*.planext4u.net", "*.supabase.co", "*.firebaseapp.com", "*.googleapis.com"],
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#009999",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      backgroundColor: "#009999",
      style: "LIGHT",
      overlaysWebView: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
