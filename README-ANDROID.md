# Planext4u - Android Deployment Guide

This document outlines the step-by-step process required to push new React web code to the native Android platform and build a distributable APK/AAB file using Android Studio.

## Prerequisites
- **Bun** (for frontend package management and building)
- **Android Studio** (for compiling the native Android application)
- **Java 21** (JDK 21 is required for Capacitor 8+ Gradle builds)

---

## 📱 Phase 1: Updating the Android Code

Whenever you make changes to the React/Vite source code in the `src/` directory, you must continuously compile your web assets and sync them into the native Android folder.

1. **Build the Web App**  
   Run the Vite production build to generate the latest `/dist` folder.
   ```bash
   bun run build
   ```

2. **Sync with Capacitor**  
   Sync the compiled `/dist` web assets, native preferences, and active plugins to the `android/` directory.
   ```bash
   bunx cap sync android
   ```
   *Note: This command will copy your finalized web assets into `android/app/src/main/assets/public` and ensure native Cordova/Capacitor plugins are registered.*

3. **Updating App Icons (Optional)**  
   If you ever modify the source icons (`src/assets/icons/icon-512.webp`), you will need to re-generate the launcher icons for Android:
   ```bash
   bunx capacitor-assets generate --android
   ```

---

## 🛠️ Phase 2: Building the APK in Android Studio

Once the UI changes are successfully heavily synced into the `android/` directory, use Android Studio to build and export your app.

### 1. Open the Project
1. Launch **Android Studio**.
2. Click on **Open...** (or File -> Open).
3. Navigate to the `Planext4u` project folder and specifically select the `android` folder (e.g., `D:\HustleLoom\projects\planext4u\android`).
4. Click **OK**.
5. *Wait for Android Studio to finish "Gradle Sync" (this usually takes 1-2 minutes the first time as it downloads dependencies).*

### 2. Verify Google Services (Firebase)
Ensure that your `google-services.json` file is correctly placed inside the `android/app/` directory (you can see this via the "Project" view pane on the left side of Android Studio). This is strictly required for Push Notifications to establish a connection.

### 3. Build a Debug APK (For Testing)
If you want to build a quick APK to test on your own device:
1. In the top toolbar, go to **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
2. Android Studio will begin compiling.
3. Once completed, a pop-up in the bottom right corner will appear. Click **locate** to open the destination folder (usually `android/app/build/outputs/apk/debug/app-debug.apk`).

### 4. Build a Release APK/AAB (For Production/Play Store)
To generate a secure production app:
1. In the top toolbar, go to **Build** -> **Generate Signed Bundle / APK...**
2. Choose **APK** (for direct website downloads) or **Android App Bundle** (required for Google Play Store upload) and click **Next**.
3. **Key store path**:
   - If you don't have one, click **Create new...**. Provide a path, a strong password, an alias (e.g., `key0`), and your organization details.
   - If you already have one, select your `.jks` file and enter the passwords.
4. Click **Next**.
5. Select **release** as the Build Variant.
6. Click **Finish**.

When the build is finalized, the resulting production-ready APK or AAB will be outputted to `android/app/release/`.

---

## ⚠️ Troubleshooting

- **No Java 21 Toolchain Found**: Capacitor 8 restricts local compiler chains. If prompted by Android Studio, go to **Settings (Preferences)** -> **Build, Execution, Deployment** -> **Build Tools** -> **Gradle** -> Set *Gradle JDK* to **jbr-21** or **corretto-21**.
- **Cordova Sync Errors**: If `bunx cap sync` fails due to plugin templates on Windows, delete the `android/capacitor-cordova-android-plugins` directory, manually extract the `.tar.gz` from your `node_modules/@capacitor/cli/assets/`, and re-run sync.
