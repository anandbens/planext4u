#!/bin/bash
set -e

echo "=== Building Vendor App (com.planext4u.vendor) ==="

cp capacitor.config.vendor.ts capacitor.config.ts

npm run build

npx cap sync android-vendor

cd android-vendor
./gradlew assembleDebug
echo "✅ Vendor APK: android-vendor/app/build/outputs/apk/debug/app-debug.apk"
