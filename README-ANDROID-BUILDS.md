# Android Builds - Customer & Vendor

This project has **two separate Android apps**:

## Customer App (`android/`)
- **Package:** `com.p4u_customer`
- **App Name:** Planext4u
- **Config:** `capacitor.config.customer.ts`
- **Version:** 5.36 (versionCode 80)

## Vendor App (`android-vendor/`)
- **Package:** `com.p4u.p4u_vendor`
- **App Name:** Planext4u Vendor
- **Config:** `capacitor.config.vendor.ts`
- **Version:** 2.28 (versionCode 56)

## Building

### Customer App
```bash
# 1. Copy the customer capacitor config
cp capacitor.config.customer.ts capacitor.config.ts

# 2. Build web assets
npm run build

# 3. Sync to android
npx cap sync android

# 4. Build APK
cd android && ./gradlew assembleDebug
```

### Vendor App
```bash
# 1. Copy the vendor capacitor config
cp capacitor.config.vendor.ts capacitor.config.ts

# 2. Build web assets
npm run build

# 3. Sync Capacitor to the standard android project
npx cap sync android

# 4. Mirror generated Capacitor assets/plugin files into android-vendor
rm -rf android-vendor/app/src/main/assets android-vendor/capacitor-cordova-android-plugins
cp -R android/app/src/main/assets android-vendor/app/src/main/
cp -R android/capacitor-cordova-android-plugins android-vendor/
cp android/capacitor.settings.gradle android-vendor/capacitor.settings.gradle
cp android/app/capacitor.build.gradle android-vendor/app/capacitor.build.gradle
cp android/variables.gradle android-vendor/variables.gradle

# 5. Build APK
cd android-vendor && ./gradlew assembleDebug
```

Or use the convenience scripts:
```bash
bash build-customer.sh
bash build-vendor.sh
```

## Firebase Configuration
- **Firebase Project:** `p4u-console` (project number: 784503032650)
- Both apps share the same `google-services.json` content
- `android/app/google-services.json` — contains `com.p4u_customer`
- `android-vendor/app/google-services.json` — contains `com.p4u.p4u_vendor`

## Release Signing
- Customer keystore: `android/app/p4u_customer.keystore` (alias: `p4u_customer`)
- Vendor keystore: `android-vendor/app/p4u_vendor.keystore` (alias: `p4u`)

## Important Notes
- Always copy the correct `capacitor.config.*.ts` → `capacitor.config.ts` before building
- Each app has its own deep link scheme (`com.p4u_customer://` vs `com.p4u.p4u_vendor://`)
- Make sure SHA-1 and SHA-256 fingerprints are added in Firebase Console for both apps
