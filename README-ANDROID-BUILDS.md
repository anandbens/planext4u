# Android Builds - Customer & Vendor

This project has **two separate Android apps**:

## Customer App (`android/`)
- **Package:** `com.planext4u.customer`
- **App Name:** Planext4u
- **Config:** `capacitor.config.customer.ts`

## Vendor App (`android-vendor/`)
- **Package:** `com.planext4u.vendor`
- **App Name:** Planext4u Vendor
- **Config:** `capacitor.config.vendor.ts`

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
Each app has its own `google-services.json`:
- `android/app/google-services.json` — contains `com.planext4u.customer`
- `android-vendor/app/google-services.json` — contains `com.planext4u.vendor`

## Important Notes
- Always copy the correct `capacitor.config.*.ts` → `capacitor.config.ts` before building
- Each app has its own deep link scheme (`com.planext4u.customer://` vs `com.planext4u.vendor://`)
- Make sure SHA-1 and SHA-256 fingerprints are added in Firebase Console for both apps
