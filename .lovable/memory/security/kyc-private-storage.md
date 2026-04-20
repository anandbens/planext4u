---
name: KYC Private B2 Storage
description: KYC documents stored in private Backblaze B2 bucket; admin-only signed URLs via b2-presigned-download
type: feature
---

KYC document images (Aadhaar, PAN, GST) are uploaded to a SEPARATE PRIVATE Backblaze B2 bucket — not the public bucket used for product/banner/social media.

**Upload path** (`uploadToB2(blob, { ..., private: true })`):
- Edge function `b2-presigned-upload` selects bucket via `B2_PRIVATE_*` secrets when `private: true`.
- Returns a `b2-private://<key>` reference instead of a Friendly URL.
- This reference is what gets stored in `kyc_documents.front_image_url` / `back_image_url` and on the vendor application.

**Read path** (admin-only):
- Edge function `b2-presigned-download` validates `user_roles.role IN (admin, finance, sales)` and returns a 5-minute signed GET URL for a given key.
- Helper `resolveB2Url(value)` in `src/lib/b2-upload.ts` transparently handles both legacy public URLs and `b2-private://` references.
- Component `<PrivateKycImage value={...} />` in `src/components/admin/PrivateKycImage.tsx` renders thumbnails with PDF support and graceful fallback.

**Rules:**
- Never bypass and embed raw KYC URLs in the public bucket.
- Never expose `b2-presigned-download` to non-admin roles.
- Customer/vendor KYC pages still display their OWN uploads in-session via the locally-set `frontFile` URL returned by `uploadToB2` (which is the `b2-private://` ref) — those preview thumbnails won't render until the user is admin. After save+reload, customers see only the status badge, not the image, which is the desired privacy posture.

**Affected upload sites (private: true):**
- `src/pages/customer/CustomerKYCPage.tsx`
- `src/pages/vendor/VendorKYCPage.tsx`
- `src/pages/vendor/VendorRegisterPage.tsx` (KYC fields only; logos remain public)
- `src/pages/customer/VendorRegisterPage.tsx`

**Affected admin viewers:**
- `src/components/admin/modals/CustomerModal.tsx`
- `src/components/admin/modals/VendorModal.tsx`
- `src/pages/admin/AdminMediaLibraryPage.tsx`
