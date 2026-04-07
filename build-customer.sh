#!/bin/bash
set -e

echo "=== Building Customer App (com.planext4u.customer) ==="

cp capacitor.config.customer.ts capacitor.config.ts

npm run build

npx cap sync android

cd android
./gradlew assembleDebug
echo "✅ Customer APK: android/app/build/outputs/apk/debug/app-debug.apk"
