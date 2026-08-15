# Technical Scope of Work — Planext4U Rebuild Specification

Produce a complete, implementation-grade specification that an external team (Codex) could use to rebuild Planext4U from zero. Written at **table + endpoint level**, delivered as versioned Markdown under `docs/sow/` **and** as one consolidated downloadable file.

This is a documentation deliverable only. No application code, schema, or configuration changes.

## What the system actually contains (verified from the live project)

- **205 pages / 152 components**, 1 React SPA, ~200 routes across 6 portals
- **184 public tables**, **180 database functions/RPCs**, **524 RLS policies**, 190 migrations
- **19 edge functions**, **7 storage buckets**, roles: `admin, finance, sales, vendor, customer, rider`
- **9 business modules**: Ecommerce, Food Delivery, Homes (real estate), Socio (social network), Classifieds, Franchise, Vendor, Rider, Admin/Back-office
- **3 native Capacitor apps** (customer, vendor, rider) + web
- External systems: Supabase (DB/Auth/Storage/Realtime/Edge), Firebase (Phone Auth, FCM), Razorpay, Paystack, Backblaze B2 + Cloudflare CDN, Odoo, Google Maps, Socket.IO signalling

## Document set

Written to `docs/sow/`, one file per area so Codex can load them selectively.

| File | Contents |
|---|---|
| `00-overview.md` | Product definition, the 9 modules, portal map, user personas, glossary, non-functional requirements (performance budgets, offline/native, i18n/currency) |
| `01-architecture.md` | Stack and versions, SPA routing and portal isolation, per-portal auth storage keys, build/deploy topology, Capacitor projects, CDN/media pipeline, caching and React Query strategy, code-splitting |
| `02-identity-and-rbac.md` | Auth flows (email/password, Firebase phone OTP, Google OAuth), the `user_roles` + `has_role()` security-definer pattern, cross-portal uniqueness rules, session guards, password-setup flow, RLS design principles and the policy taxonomy behind the 524 policies |
| `03-data-model.md` | Full table inventory grouped by module — columns, types, keys, FKs, enums, indexes, GRANTs, RLS intent per table. Includes ER diagrams in `text` blocks |
| `04-modules-ecommerce.md` | Catalog, attributes/variants, cart rules, checkout, orders, invoices, credit notes, inventory, reviews, wishlist, wallet/points, referrals, coupon engine (incl. fraud, reservation, rollback, geo/vendor mapping) |
| `05-modules-food.md` | Restaurants, menus, combos, food orders, live tracking, rider assignment, chats, refunds, food coupons, food invoices |
| `06-modules-homes.md` | Properties, localities, amenities, plans, enquiries, visits, bookmarks, saved searches, rent tracker, EMI/value estimator, moderation |
| `07-modules-socio.md` | Posts, reels, stories, channels, follows/friends, DMs, notifications, hashtags, shopping tags, moderation/reports, WebRTC calling and signalling contract |
| `08-modules-classifieds-franchise.md` | Classified ads lifecycle; franchise plans, public registration, projections master, active franchises, registration payments, multi-page receipt PDF spec |
| `09-modules-vendor-rider.md` | Vendor onboarding/KYC/approval lifecycle, catalog and availability, settlements and TDS ledger, dropshipping, media library; rider registration, KYC, assignments, locations, payouts, settlements |
| `10-admin-and-reporting.md` | All admin screens, homepage CMS/widget builder, platform variables, module visibility, banners/ads, audit logs, and the 19 report specs (GSTR1/3B/9, HSN, TCS, TDS 194O, daybook, settlements, revenue, etc.) with column and export definitions |
| `11-api-contracts.md` | Per-edge-function contract (route, auth mode, request/response schema, errors, side effects) for all 19 functions; RPC contracts for the security-definer functions; gateway/webhook contracts |
| `12-integrations.md` | Razorpay, Paystack, Firebase Phone Auth + FCM, Backblaze B2 + Cloudflare, Odoo sync, Google Maps, email pipeline and domain setup — with required secrets and config keys per integration |
| `13-design-system.md` | Brand palette and semantic tokens, typography, component variants, mobile/safe-area rules, media standards (WebP 70%/2048px, H.264 480p/45s), accessibility |
| `14-build-plan.md` | Rebuild sequenced into phases with dependencies, acceptance criteria per phase, test strategy (Vitest + Playwright), migration/seed order, and a definition of done |

## Technical approach

- Table inventory generated from the live schema (`information_schema`, `pg_indexes`, `pg_policies`) so column names, types and constraints are exact rather than inferred.
- Edge-function contracts derived by reading each `supabase/functions/*/index.ts` and recording actual request/response shapes and auth handling.
- Route inventory generated from `src/App.tsx` and cross-referenced to page components, so every screen in the spec maps to a real one.
- Business rules extracted from `src/lib/*` (coupon engine, commission cascade, points, settlements, tax) and stated as explicit rules with formulas, not prose summaries.
- Secrets are referenced by **name only** — no values, no project identifiers, no dashboard links.

## Deliverables

1. `docs/sow/` — the 15 Markdown files above, committed to the repo.
2. `/mnt/documents/Planext4U-Technical-SOW.md` — single consolidated copy for download and external sharing.

Expected size: 40+ pages equivalent. Given the volume, I'll build it in three passes — foundation (00-03), modules (04-10), contracts and plan (11-14) — so you can review and correct direction after each pass.
