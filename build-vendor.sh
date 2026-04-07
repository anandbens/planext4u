#!/bin/bash
set -e

echo "=== Building Vendor App (com.planext4u.vendor) ==="

cp capacitor.config.vendor.ts capacitor.config.ts

npm run build

npx cap sync android

rm -rf android-vendor/app/src/main/assets
cp -R android/app/src/main/assets android-vendor/app/src/main/

rm -rf android-vendor/capacitor-cordova-android-plugins
cp -R android/capacitor-cordova-android-plugins android-vendor/

cp android/capacitor.settings.gradle android-vendor/capacitor.settings.gradle
cp android/app/capacitor.build.gradle android-vendor/app/capacitor.build.gradle
cp android/variables.gradle android-vendor/variables.gradle

cd android-vendor
./gradlew assembleDebug
echo "✅ Vendor APK: android-vendor/app/build/outputs/apk/debug/app-debug.apk"
