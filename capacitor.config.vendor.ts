import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.p4u.p4u_vendor",
  appName: "Planext4u Vendor",
  webDir: "dist",
  server: {
    url: "https://planext4u.net/vendor/login?portal=vendor",
    androidScheme: "https",
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
      overlaysWebView: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
