#!/bin/bash
set -e

echo "=== Building Rider App (com.planext4u.rider) ==="

cp capacitor.config.rider.ts capacitor.config.ts

npm run build

npx cap sync android

# Mirror generated assets into the rider Android scaffold
rm -rf android-rider/app/src/main/assets
cp -R android/app/src/main/assets android-rider/app/src/main/

rm -rf android-rider/capacitor-cordova-android-plugins
cp -R android/capacitor-cordova-android-plugins android-rider/

cp android/capacitor.settings.gradle android-rider/capacitor.settings.gradle
cp android/app/capacitor.build.gradle android-rider/app/capacitor.build.gradle
cp android/variables.gradle android-rider/variables.gradle

cd android-rider
chmod +x gradlew
./gradlew assembleDebug
echo "✅ Rider APK: android-rider/app/build/outputs/apk/debug/app-debug.apk"
