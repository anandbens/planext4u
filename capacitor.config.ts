import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.getcapacitor.myapp",
  appName: "Planext4u",
  webDir: "dist",
  server: {
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
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
