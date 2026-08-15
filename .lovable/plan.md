# Technical Scope of Work — Planext4U Rebuild Specification

Produce a complete, implementation-grade specification an external team (Codex) can use to rebuild Planext4U from zero on the **target architecture below**. Written at **table + endpoint level**, delivered as versioned Markdown under `docs/sow/` **and** as one consolidated downloadable file.

The current running system is used only as the source of truth for **functional behaviour, data model and business rules**. The specification is written entirely against the target stack — no reference to the platform or managed services the existing prototype runs on.

This is a documentation deliverable only. No application code, schema, or configuration changes.

## Target architecture (as specified)

```text
Mobile apps  (Customer • Vendor • Rider)  +  Web
        │
        ▼
API gateway / Mobile BFF
        │
        ├── Laravel modular monolith
        │     ├── Admin
        │     ├── Catalog management
        │     ├── Promotions / content
        │     ├── Customer / account
        │     └── Orders (initially)
        │
        ├── Search service            → OpenSearch / Algolia
        ├── Tracking / dispatch       → Go
        ├── Realtime / chat gateway   → Node.js
        ├── Notification workers      → Node.js or Go
        └── Media workers             → Go

Shared infrastructure:
PostgreSQL • PostGIS • Redis • Event broker • Object storage • CDN
```

## Scope of the product being specified

Functional surface captured from the existing system: ~200 screens across 6 portals, 9 business modules, 184 relational tables, ~180 stored procedures/business routines, 6 roles (`admin, finance, sales, vendor, customer, rider`), 7 object-storage buckets, and 19 backend service endpoints to be re-homed onto the target services.

Modules: Ecommerce • Food Delivery • Homes (real estate) • Socio (social network) • Classifieds • Franchise • Vendor • Rider • Admin/Back-office.

## Document set

Written to `docs/sow/`, one file per area so it can be loaded selectively.

| File | Contents |
|---|---|
| `00-overview.md` | Product definition, the 9 modules, portal map, personas, glossary, non-functional requirements (latency budgets, availability, scale targets, offline/native, i18n and multi-currency) |
| `01-architecture.md` | The target topology above in detail: gateway/BFF responsibilities and per-client response shaping, Laravel modular-monolith module boundaries and inter-module contracts, service extraction criteria, deployment topology, environments, CI/CD, observability |
| `02-identity-and-rbac.md` | Auth flows (email/password, phone OTP via SMS provider, Google OAuth), token issuance and refresh at the gateway, role/permission model, per-portal session isolation, cross-portal identity uniqueness, authorization enforcement in Laravel policies + row scoping at the query layer |
| `03-data-model.md` | Full PostgreSQL schema by module — tables, columns, types, keys, FKs, enums, indexes, partitioning candidates, PostGIS geometry columns and spatial indexes, plus ER diagrams in `text` blocks |
| `04-modules-ecommerce.md` | Catalog, attributes/variants, cart rules, checkout, orders, invoices, credit notes, inventory, reviews, wishlist, wallet/points, referrals, and the full coupon engine (fraud checks, reservation, rollback, geo/vendor mapping) |
| `05-modules-food.md` | Restaurants, menus, combos, orders, live tracking, rider assignment, order chat, refunds, food coupons and invoices |
| `06-modules-homes.md` | Properties, localities, amenities, plans, enquiries, visits, bookmarks, saved searches, rent tracker, EMI/value estimator, moderation |
| `07-modules-socio.md` | Posts, reels, stories, channels, follows/friends, DMs, notifications, hashtags, shopping tags, moderation; realtime gateway protocol and WebRTC signalling contract |
| `08-modules-classifieds-franchise.md` | Classified ad lifecycle; franchise plans, public registration, projections master, active franchises, registration payments, multi-page receipt PDF spec |
| `09-modules-vendor-rider.md` | Vendor onboarding/KYC/approval lifecycle, catalog and availability, settlements and TDS ledger, dropshipping; rider registration, KYC, dispatch and assignment, location streaming, payouts and settlements |
| `10-admin-and-reporting.md` | All admin screens, homepage/CMS widget builder, platform configuration, banners/ads, audit logging, and the 19 report specifications (GSTR1/3B/9, HSN, TCS, TDS 194O, daybook, settlements, revenue) with columns and export formats |
| `11-api-contracts.md` | Gateway/BFF route catalogue; REST resource contracts per Laravel module; Go tracking/dispatch and media worker APIs; Node realtime gateway event protocol; notification worker job contracts — request/response schemas, auth mode, errors, idempotency, side effects |
| `12-events-and-async.md` | Event broker topology: topics, event schemas and versioning, producers/consumers per module, outbox pattern, retries and DLQ, Redis usage (cache keys/TTL, locks, rate limits, queues), scheduled jobs |
| `13-search-media-geo.md` | Search service: index definitions, mappings, analyzers, sync/reindex strategy, ranking and faceting per module. Media workers: upload flow, transcode ladder (image and video), object-storage layout, signed URLs, CDN and cache-invalidation. PostGIS: distance queries, service-area polygons, dispatch geo logic |
| `14-integrations.md` | Payment gateways, SMS/OTP provider, push notification provider, email delivery, ERP sync, maps/geocoding — with required configuration keys per integration, referenced by name only |
| `15-design-system.md` | Brand palette and tokens, typography, component library, mobile/safe-area rules, media standards (WebP 70% / 2048px, H.264 480p / 45s), accessibility |
| `16-build-plan.md` | Rebuild sequenced into phases with dependencies, acceptance criteria per phase, data migration and seed order, test strategy (unit, contract, load, end-to-end), and a definition of done |

## Technical approach

- Table inventory generated from the live schema so column names, types and constraints are exact rather than inferred, then re-expressed as portable PostgreSQL DDL with PostGIS types where geospatial.
- Business logic currently held in database routines and client libraries (coupon engine, commission cascade, points/wallet, settlements, tax) is extracted and restated as explicit application-layer rules with formulas, assigned to the owning Laravel module or Go/Node service.
- Existing serverless endpoints are re-mapped one by one onto the target services, with the new owner named for each.
- Row-level access rules currently enforced at the database are restated as authorization policies and query-scoping requirements in the Laravel layer.
- Screen inventory derived from the existing route map so every specified screen maps to a real one.
- Secrets and credentials referenced by **name only** — never values.

## Deliverables

1. `docs/sow/` — the 17 Markdown files above, committed to the repo.
2. `/mnt/documents/Planext4U-Technical-SOW.md` — single consolidated copy for download and external sharing.

Expected size: 50+ pages equivalent. Built in three passes — foundation (00-03), modules (04-10), platform contracts and build plan (11-16) — so you can review and correct direction after each pass.
