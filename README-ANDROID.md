# Planext4u - Android Development Guide

This guide is primarily for developers. It outlines the day-to-day workflow for updating the React web codebase, syncing those updates to the Capacitor Android project, and generating the final APK. It also includes common troubleshooting fixes.

---

## 💻 Phase 1: Development & Syncing

Whenever you make changes to the React/Vite source code in the `src/` directory, you must compile your web assets and inject them into the Android wrapper.

### 1. Build the React Web App
Run the Vite production build to generate the latest static files in the `/dist` folder.
```bash
bun run build
```

### 2. Sync Code to Android
Sync the newly compiled `/dist` web assets, plugins, and configurations into the `android/` directory natively.
```bash
bunx cap sync android
```
*(This command copies your web assets into `android/app/src/main/assets/public` and updates native dependencies.)*

### 3. Update App Icons (Optional)
If you ever modify the source icons (`src/assets/icons/icon-512.webp`), you will need to re-generate the launcher icons.
```bash
bunx @capacitor/assets generate --android
```

---

## 🛠️ Phase 2: Generating the APK

Once your code is synced, you can build the APK via the Command Line (fastest) or via Android Studio.

### Option A: Build via Command Line (Fastest)

To build a **Debug APK** instantly from your terminal:
```bash
cd android
.\gradlew assembleDebug
```
*(On Mac/Linux, use `./gradlew assembleDebug`)*

**Output Location:** `android/app/build/outputs/apk/debug/app-debug.apk`

To build a **Release APK** (Needs Keystore configured in your `build.gradle`):
```bash
cd android
.\gradlew assembleRelease
```

### Option B: Build via Android Studio

1. **Launch Android Studio**.
2. Click **Open...** and target specifically the `Planext4u\android` folder.
3. *Wait for Android Studio to finish "Gradle Sync" (this usually takes 1-2 minutes the first time).*
4. Navigate to **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)** (for a quick debug build).
5. Open the destination folder (usually `android/app/build/outputs/apk/debug/app-debug.apk`) once compiling finishes.

To generate a secure production app for the Google Play Store:
1. Go to **Build** -> **Generate Signed Bundle / APK...**
2. Choose **Android App Bundle** and click **Next**.
3. Point to your Developer Keystore (or create a new one).
4. Select the **release** variant and hit **Finish**.

---

## ⚠️ Phase 3: Troubleshooting & Common Fixes

Below are common issues you might encounter during the development lifecycle and how to fix them.

### Fix 1: Firebase Phone OTP Error (`auth/invalid-app-credential`)
Firebase protects Phone Authentication to prevent spam. On Android, this uses Play Integrity. If the app's signature isn't registered, OTP will fail.

**Step 1: Get your SHA-1 and SHA-256 Fingerprints**
Run the following Gradle command to generate your debug app's signature fingerprints:
```bash
cd android
.\gradlew signingReport
```
Look for `Variant: debug`. You will see values like:
- **SHA-1**: `09:22:B7:89:97:B5:D6:4C:DA:1E:A1:EA:E5:DE:9D:DF:BE:17:14:25`
- **SHA-256**: `EB:59:C8:8D:B5:DB:02:24:EF:67:A5:57:3F:38:97:CD:9B:C8:80:6B:EF:8C:0A:32:4F:C3:15:0A:1A:F5:1F:BD`

**Step 2: Add Fingerprints to Firebase**
1. Open your **Firebase Console** (Project Settings).
2. Scroll to your **Android App** (`com.planext4u.customer`).
3. Click **Add fingerprint** and add both the SHA-1 and SHA-256 keys.
4. **Re-download** your `google-services.json` file and place it inside your project's `android/app/` folder.

**Step 3: Enable Play Integrity API**
1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your Firebase project at the top.
3. Search for **Play Integrity API** and click **Enable**.

### Fix 2: Cordova Sync Errors (Bun on Windows)
Due to a known template extraction bug with Bun on Windows, `bunx cap sync` might fail with `ENOENT` regarding Cordova plugins.

**The Fix:** 
Delete the broken directory and manually extract it from the Capacitor CLI assets using PowerShell:
```bash
# Force delete the broken directory
rm -rf android/capacitor-cordova-android-plugins

# Manually extract the plugins directory correctly
tar -xf node_modules\@capacitor\cli\assets\capacitor-cordova-android-plugins.tar.gz -C android\capacitor-cordova-android-plugins

# Rerun sync
bunx cap sync
```

### Fix 3: No Java 21 Toolchain Found
Capacitor 8 requires Java 21 to build. If Android Studio or the CLI complains about missing Toolchain dependencies:
- In Android Studio: go to **Settings (Preferences)** -> **Build, Execution, Deployment** -> **Build Tools** -> **Gradle** -> Set *Gradle JDK* to **jbr-21** or **corretto-21**.
