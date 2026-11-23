# Authentication session-lock sweep

## Rule
Sign-in, session checks, background refresh, and sign-out must not fail because another request takes a browser authentication lock.

## Findings and verification
- All production browser authentication calls use the single shared client; the pinned auth-only update applies to every portal without changing permissions or platform variables.
- Admin, customer, vendor, and rider login pages were opened in the live preview: zero browser auth lock requests and zero session-lock errors on each.
- Admin login using deliberately invalid credentials returned Invalid login credentials after recovery. This proves connectivity, not successful account authentication.
- Six session regression tests pass: four portal keys, plus password and OTP session creation, concurrent refresh/read, and logout with simulated server responses. Existing 14 feed-ad tests also pass.
- Latest preview validation: build OK.
- Real-account sign-in, live SMS/Google OAuth, password recovery emails, and native-device execution are not verified.
- Database is up with low connection usage and no exhaustion alerts, but subsequent Cloud probes intermittently report degraded. Sustained backend recovery is not confirmed.

## Browser callers read
Each entry below was read at its authentication calls. Verdict concerns the reported lock error only: it uses the shared updated client and does not install a competing browser lock. It is not a certification of the entire feature.

- `src/App.tsx` (lines 473): follows the browser-lock rule through the shared client.
- `src/components/admin/B2BucketBrowser.tsx` (lines 37): follows the browser-lock rule through the shared client.
- `src/components/admin/ProtectedRoute.tsx` (lines 46): follows the browser-lock rule through the shared client.
- `src/components/customer/CustomerProtectedRoute.tsx` (lines 55): follows the browser-lock rule through the shared client.
- `src/components/homepage/HomepageRenderer.tsx` (lines 30): follows the browser-lock rule through the shared client.
- `src/components/rider/RiderLayout.tsx` (lines 89): follows the browser-lock rule through the shared client.
- `src/components/rider/RiderProtectedRoute.tsx` (lines 11): follows the browser-lock rule through the shared client.
- `src/components/vendor/VendorProtectedRoute.tsx` (lines 44): follows the browser-lock rule through the shared client.
- `src/hooks/use-social-interactions.ts` (lines 17): follows the browser-lock rule through the shared client.
- `src/integrations/lovable/index.ts` (lines 31): follows the browser-lock rule through the shared client.
- `src/lib/api.ts` (lines 763, 1302, 1596, 1894): follows the browser-lock rule through the shared client.
- `src/lib/audit.ts` (lines 11): follows the browser-lock rule through the shared client.
- `src/lib/auth-provider.tsx` (lines 118, 146, 200, 303, 326, 339, 343, 419, 456, 474, 481, 516, 539, 558, 571, 590, 610, 638, 648, 655, 662): follows the browser-lock rule through the shared client.
- `src/lib/b2-upload.ts` (lines 58): follows the browser-lock rule through the shared client.
- `src/lib/customer-address-auth.ts` (lines 27): follows the browser-lock rule through the shared client.
- `src/lib/food-api.ts` (lines 545): follows the browser-lock rule through the shared client.
- `src/lib/native-bootstrap.ts` (lines 75, 76): follows the browser-lock rule through the shared client.
- `src/pages/SupportTicketsPage.tsx` (lines 50): follows the browser-lock rule through the shared client.
- `src/pages/WebsiteQueriesPage.tsx` (lines 43): follows the browser-lock rule through the shared client.
- `src/pages/admin/AdminComplaintsPage.tsx` (lines 85): follows the browser-lock rule through the shared client.
- `src/pages/admin/AdminLayoutBuilderPage.tsx` (lines 233): follows the browser-lock rule through the shared client.
- `src/pages/customer/AuthCallbackPage.tsx` (lines 42, 69, 84, 88): follows the browser-lock rule through the shared client.
- `src/pages/customer/CustomerChangePasswordPage.tsx` (lines 26, 29): follows the browser-lock rule through the shared client.
- `src/pages/customer/CustomerKYCPage.tsx` (lines 99): follows the browser-lock rule through the shared client.
- `src/pages/customer/CustomerLoginPage.tsx` (lines 295, 323): follows the browser-lock rule through the shared client.
- `src/pages/customer/CustomerPhoneLoginPage.tsx` (lines 306): follows the browser-lock rule through the shared client.
- `src/pages/customer/CustomerProfileEditPage.tsx` (lines 147): follows the browser-lock rule through the shared client.
- `src/pages/customer/CustomerRegisterPage.tsx` (lines 297, 320, 323): follows the browser-lock rule through the shared client.
- `src/pages/customer/CustomerServiceDetailPage.tsx` (lines 181, 202): follows the browser-lock rule through the shared client.
- `src/pages/customer/CustomerSupportPage.tsx` (lines 66, 123): follows the browser-lock rule through the shared client.
- `src/pages/customer/ForgotPasswordPage.tsx` (lines 23): follows the browser-lock rule through the shared client.
- `src/pages/customer/ResetPasswordPage.tsx` (lines 23, 28, 51): follows the browser-lock rule through the shared client.
- `src/pages/customer/SetPasswordPage.tsx` (lines 27, 74, 92): follows the browser-lock rule through the shared client.
- `src/pages/customer/SocialChangePasswordPage.tsx` (lines 26, 29): follows the browser-lock rule through the shared client.
- `src/pages/customer/SocialCreatePostPage.tsx` (lines 123): follows the browser-lock rule through the shared client.
- `src/pages/customer/SocialDMPage.tsx` (lines 19): follows the browser-lock rule through the shared client.
- `src/pages/customer/SocialSecurityPage.tsx` (lines 22): follows the browser-lock rule through the shared client.
- `src/pages/customer/SocialSettingsPage.tsx` (lines 75): follows the browser-lock rule through the shared client.
- `src/pages/customer/SocialStoryViewerPage.tsx` (lines 263): follows the browser-lock rule through the shared client.
- `src/pages/customer/SocioDMChatPage.tsx` (lines 138): follows the browser-lock rule through the shared client.
- `src/pages/customer/VendorRegisterPage.tsx` (lines 167): follows the browser-lock rule through the shared client.
- `src/pages/customer/food/FoodRestaurantPage.tsx` (lines 102): follows the browser-lock rule through the shared client.
- `src/pages/rider/RiderDashboardPage.tsx` (lines 23, 76, 135): follows the browser-lock rule through the shared client.
- `src/pages/rider/RiderLoginPage.tsx` (lines 20, 25): follows the browser-lock rule through the shared client.
- `src/pages/rider/RiderOrdersPage.tsx` (lines 19): follows the browser-lock rule through the shared client.
- `src/pages/rider/RiderProfilePage.tsx` (lines 95): follows the browser-lock rule through the shared client.
- `src/pages/rider/RiderRegisterPage.tsx` (lines 32): follows the browser-lock rule through the shared client.
- `src/pages/vendor/VendorChangePasswordPage.tsx` (lines 26, 29): follows the browser-lock rule through the shared client.
- `src/pages/vendor/VendorKYCPage.tsx` (lines 71): follows the browser-lock rule through the shared client.
- `src/pages/vendor/VendorLoginPage.tsx` (lines 187): follows the browser-lock rule through the shared client.

## Shared infrastructure and server callers read
- `src/integrations/supabase/client.ts`: sole production browser client; no custom lock. Unchanged generated file.
- `src/lib/auth-provider.tsx`: role hydration is deferred outside the auth notification callback and de-duplicates in-flight role reads.
- `src/lib/native-bootstrap.ts`: resume refresh uses the shared client; native runtime not executed.
- Database `get_auth_bootstrap` and `check_phone_login_status`: live function definitions read; server-side role/phone lookups do not acquire browser locks; unchanged.

- `supabase/functions/admin-create-vendor-auth/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/b2-list-objects/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/b2-populate-image-urls/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/b2-presigned-download/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/b2-presigned-upload/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/backfill-supabase-to-b2/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/firebase-phone-auth/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/google-oauth-link/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/odoo-sync/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/og-share/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/process-email-queue/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/process-video/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/process-video-webhook/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/repair-socio-b2-media/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.
- `supabase/functions/send-push-notification/index.ts`: authentication/client initialization read; server-only client, no browser Web Locks path; unchanged and not executed.

## Exact changes for this sweep
- `src/test/auth-session-lock.test.ts`: expanded coverage for every portal and authenticated session transitions.
- `AGENTS.md`: clarified the auth-only dependency rule.
- `roadmap.md`: recorded sweep completion and verification limits.
- `docs/auth-session-lock-audit.md`: this inventory.
- Earlier fix remains in `package.json` and `bun.lock`: database client pinned to 2.101.1, authentication package overridden to 2.119.2.
- No business records, permissions, platform variables, ad identifiers, or feed intervals changed.
