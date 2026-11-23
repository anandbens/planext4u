# Selected security fixes

## Scope

Only the 60 findings selected in the November 23 request were considered for changes. No finding was ignored, and no unrelated policy was changed.

## Applied and verified: 23 findings

- Enabled leaked-password protection for signup and password changes.
- Pinned the four existing email queue functions to an empty search path; their references were already schema-qualified.
- Restricted saved searches, property bookmarks, social bookmarks, property reports and visits to their verified owners and existing administrators.
- Required authenticated ownership for saved searches, property enquiries, visits, reports and message inserts. Existing mapped customer identifiers and authentication identifiers remain supported.
- Restricted website queries, report logs and fraud rules to existing administrator checks.
- Restricted direct vendor notification and fraud evaluation inserts to administrators; privileged automated functions retain their existing behavior.
- Bound selected vendor asset update/delete and social video delete rules to owners or administrators. Updates check both existing and replacement ownership.
- Bound selected social video, classified image and vendor asset uploads to authenticated file ownership.

## Verification

- Basic security recheck no longer reports the 23 fixed findings.
- Submitted status updates for precisely these 23 findings; the status tool confirmed they were already resolved by the recheck.
- 38 targeted tests passed across security access rules, authentication coordination and five-post advertisement insertion.
- A temporary authenticated account successfully saved and read back its own saved search; anonymous access and a forged ownership insert were rejected. The temporary record was removed.
- Anonymous access checks for private report, enquiry and bookmark tables passed.
- Public account-deletion page rendered without runtime errors; screenshot inspected.
- Latest preview build reported success.
- Complete registration, marketplace, social and native-device regression verification has not been performed.

## Remaining: 37 selected findings

Awaiting user confirmation before contextual changes that could hide intentional public data or interrupt existing no-login registration/uploads:

- Social audio, stories, shares, likes, follows, profiles, highlights, hashtags, comment likes, comments, story views and notes.
- Coupon geography/product/vendor mappings; vendor date availability overrides; parent item catalog data; reviews and helpful-review votes.
- Platform settings, platform variables, social configuration, invoice configuration and media library visibility.
- Vendor applications, franchise registration submissions and food coupon redemption insert behavior.
- Email subscription read/insert behavior, activity and audit log inserts, and homepage analytics read/insert behavior.
- Vendor logo and registration asset uploads, registration verification-document uploads/read access, and social media file reads.

These findings remain active; none was ignored or marked fixed. Public catalog and social resources need business-specific publication rules rather than arbitrary predicates. Anonymous registration uploads need a safe submission/upload flow before removing the currently open access. Existing settings, advertisement identifiers and the five-post feed behavior were left unchanged.

This recheck is not an advanced penetration test and does not certify the entire application as secure.

## Cross-flow follow-up review

Rule: users must not read or change another person's private records or files; legitimate authorized staff and deliberately public content remain supported.

This follow-up made no permission, setting, record or application behavior changes. The request is explicitly limited to selected findings, so additional vulnerabilities are documented for approval rather than silently fixed. No settled records were touched.

### Places inspected and conclusions

| Area | Code or live definition read | Conclusion and verification limit |
| --- | --- | --- |
| Homes saved searches | `PropertyHomePage.tsx` create; `SavedSearchesPage.tsx` read/delete/notification toggle; live saved-search policies | Insert/read follow verified owner rules. Delete has an existing authentication-identifier-only rule, while the pages prefer mapped customer identifiers; mapped-owner delete and notification toggle were not exercised. This is a possible usability mismatch, not a claim of broader access. |
| Homes conversations, enquiries, visits | `PropertyDetailPage.tsx` enquiry/message/visit inserts; `PropertyMessagesPage.tsx` conversation reads, sends, read marking and realtime subscription; live policies | New insert rules enforce the submitting owner. Reads use participant identifiers; UI subscriptions themselves are not authorization. Full conversation and owner-reply flows were not run. |
| Homes moderation | `AdminHomesModerationPage.tsx` report read/dismiss/resolve; live property-report policies | Report reads and changes remain restricted by existing staff rules. Admin interaction not executed. |
| Socio saved posts and reels | `use-social-interactions.ts`, `SocialFeedPage.tsx`, `SocialReelsPage.tsx`, `SocialProfilePage.tsx` bookmark calls; live bookmark policies | All inspected bookmark calls use the current social identity; database visibility is owner-bound. Other social profiles/stories/comments/follow relationships still have selected broad-read findings; frontend filtering alone does not resolve them. |
| Vendor notification bell | `VendorNotificationBell.tsx` list/read marking/realtime subscription; live vendor-notification policies | Reads and updates use the vendor identifier and protected policies. Direct table insert is now staff-only. This does not secure the separate callable notification function. |
| Vendor notification function | Live `create_vendor_notification` body and execution grants | No caller/role check in the privileged function; anonymous and authenticated execution grants exist. This is a separate bypass outside the selected policy finding; not changed. |
| Internal reports and fraud administration | `api.ts` report/website queries; `ReportLogPage.tsx`, `WebsiteQueriesPage.tsx`, `AdminFraudPage.tsx`, `CouponExportDialog.tsx`; live policies | Selected table reads and direct evaluation writes now enforce staff access. Fraud-rule reads remain administrator-only. Real staff sessions were not exercised. |
| Vendor product/profile/booking/media uploads | `VendorProductsPage.tsx`, `VendorProfilePage.tsx`, `VendorBookingsPage.tsx`, `VendorMediaLibraryPage.tsx`, `MediaLibraryPicker.tsx`, `ImageUploader.tsx`; `b2-upload.ts` | Current upload paths predominantly use Backblaze, so legacy storage-policy fixes do not by themselves verify these uploads. Vendor-media page filters are not substitutes for server authorization. |
| Social video and classified uploads | `video-upload.ts`, `CustomerPostAdPage.tsx`, `b2-upload.ts`; live legacy storage policies | Legacy uploads/deletes enforce the selected owner rules. Backblaze paths append the authenticated identity server-side; caller-selected folder roots still need contextual review. No native upload was executed. |
| Public registration and verification documents | Customer-side `VendorRegisterPage.tsx` document/logo uploads and application insert; `b2-presigned-upload` handler; `b2-presigned-download` handler | Anonymous registration folders remain deliberately supported. Private Backblaze downloads validate the session and staff role; legacy verification-document read/upload findings remain open. Complete vendor/franchise registration and document review were not run. |
| Private messages with attachments | `SocioDMChatPage.tsx` photo/audio upload calls; `b2-upload.ts`; Backblaze download handler | These attachment calls use public upload defaults; private-message media confidentiality is not established. Separate from the selected legacy storage-read finding; not changed. |
| Video processing | Entire `process-video` handler; ownership-relevant `process-video-webhook` branches | Processing validates a session but accepts supplied post/path identifiers without ownership checks. Callback secret validation is conditional on secret presence and then uses privileged writes/deletes. Deployment configuration, secret presence and execution are unverified; separate findings not changed. |
| Email queue processing | `process-email-queue` authorization and queue-read/dead-letter branches; live `enqueue_email`, `read_email_batch`, `move_to_dlq`, `delete_email` definitions and execution grants | All four selected search-path weaknesses remain fixed. Functions still permit anonymous/authenticated execution and have no caller checks, a separate authorization issue. Queue worker checks a claimed service role; hosted token-verification configuration was not established. No email was sent, removed or replayed. |
| Activity and audit logs | `activity-log.ts`, `audit.ts`, `api.ts` audit inserts, account-control excerpts, Socio search-history calls; live audit trigger previously inspected | Activity helper submits a `system` identifier; several audit callers omit actor fields. Restricting these requires compatible logging changes rather than a blanket owner condition. Selected insert findings remain open. |
| Public configuration and marketplace data | Inspected callsite excerpts for country context, bank details, module flags, ads, customer/vendor pages, product reviews, coupon details and admin configuration | These are real public consumers. Blanket staff-only reads could break the storefront, signup, updates or advertisements. Public/private field separation and publication predicates require the pending contextual decision. |

### Coverage boundary

An automated callsite inventory found 167 files referring to the selected tables or related storage/functions. This is an affected-file inventory, not a claim that all 167 files or all their flows passed review. Tool output for the large excerpt inventory was truncated; only the explicitly described callsites/handlers and live definitions above are treated as inspected. No full-app security certification is implied.

The previous 23 selected fixes and their 38 passing tests stand. The 37 selected remaining findings are still open. Newly identified function, callback and alternate-storage concerns are outside the selected finding scope and await permission to address; no status was cleared for them.