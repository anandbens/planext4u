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