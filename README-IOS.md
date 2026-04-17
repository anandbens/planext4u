# iOS Build & App Store Submission Guide

This project is iOS-ready at the **web/config layer**. The `ios/` native folder
must be generated on a Mac with Xcode by running:

```bash
npm install
npx cap add ios
npx cap sync ios
npx cap open ios     # opens the project in Xcode
```

After the iOS project is generated, paste the entries below into
`ios/App/App/Info.plist` between the existing `<dict>` … `</dict>` block.
These permission strings are **mandatory** — Apple App Store Review will
reject the build if a feature uses a privacy-sensitive API without a
matching `Usage Description`.

---

## 1. Required `Info.plist` permission strings

```xml
<!-- Camera (KYC selfie / document capture, social posts, profile photo) -->
<key>NSCameraUsageDescription</key>
<string>Planext4u needs camera access so you can capture KYC documents, profile photos and social posts.</string>

<!-- Photo Library read (avatar / post / classified ad uploads) -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Planext4u needs photo library access so you can choose images for your profile, posts, and classified ads.</string>

<!-- Photo Library write (saving generated invoices / shared images) -->
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Planext4u saves invoices and shared images to your photo library.</string>

<!-- Microphone (voice messages / WebRTC audio calls in Socio) -->
<key>NSMicrophoneUsageDescription</key>
<string>Planext4u needs microphone access for audio and video calls in Socio.</string>

<!-- Location (delivery address auto-detect, vendor discovery) -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>Planext4u uses your location to auto-fill delivery addresses and show nearby vendors and offers.</string>

<!-- Contacts (Socio "People you may know" suggestions) -->
<key>NSContactsUsageDescription</key>
<string>Planext4u uses your contacts to suggest people you may know in Socio. Contact data never leaves your device unencrypted.</string>

<!-- Face ID / Touch ID (optional biometric login) -->
<key>NSFaceIDUsageDescription</key>
<string>Planext4u uses Face ID to keep your account secure.</string>

<!-- Required to allow loading remote OAuth callbacks / Razorpay etc. -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <false/>
  <key>NSAllowsLocalNetworking</key>
  <true/>
</dict>
```

## 2. Capabilities to enable in Xcode

In **Xcode → Signing & Capabilities → +Capability**, add:
- **Push Notifications** (FCM)
- **Background Modes** → Remote notifications, Audio (for in-app calls)
- **Associated Domains** → `applinks:planext4u.net` if you later add deep links

## 3. App icons & launch screens

After `npx cap add ios`, replace the placeholder assets in
`ios/App/App/Assets.xcassets/AppIcon.appiconset/` and
`ios/App/App/Assets.xcassets/Splash.imageset/` with your branded artwork.
We recommend [icon.kitchen](https://icon.kitchen) or
[appicon.co](https://appicon.co) to generate the full size set in one shot.

## 4. Tested screen sizes

The web layer is fluid and uses `dvh`, `viewport-fit=cover` and
`env(safe-area-inset-*)`, so it lays out correctly on every iOS form
factor sold today:

| Device                        | Resolution (pt) | Status |
|-------------------------------|-----------------|--------|
| iPhone SE (3rd gen)           | 375 × 667       | ✅     |
| iPhone 13 mini                | 375 × 812       | ✅     |
| iPhone 15 / 15 Pro            | 393 × 852       | ✅     |
| iPhone 15 Plus / 15 Pro Max   | 430 × 932       | ✅     |
| iPad mini 6                   | 744 × 1133      | ✅     |
| iPad Pro 12.9"                | 1024 × 1366     | ✅     |
| iPhone 15 Pro landscape       | 852 × 393       | ✅ (notch insets via `safe-area-x`) |

## 5. Build for the App Store

```bash
npm run build
npx cap sync ios
npx cap open ios
# In Xcode: Product → Archive → Distribute App → App Store Connect
```
