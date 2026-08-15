# Technical Scope of Work — Planext4U Rebuild Specification

Produce a complete, implementation-grade specification an external team (Codex) can use to rebuild Planext4U from zero on the **target architecture below**. Written at **table + endpoint level**, delivered as versioned Markdown under `docs/sow/` **and** as one consolidated downloadable file.

The current running system is used only as the source of truth for **functional behaviour, data model and business rules**. The specification is written entirely against the target stack.

Documentation deliverable only — no application code, schema, or configuration changes.

## Target architecture

```text
Mobile apps  (Customer • Vendor • Rider)  +  Web admin
        │
        ▼
API gateway / Mobile BFF          (Sanctum-authenticated REST API v1)
        │
        ├── Laravel microservices  (independently deployed, own DB schema each)
        │     ├── Admin service
        │     ├── Catalog service
        │     ├── Promotions / content service
        │     ├── Customer / account service
        │     ├── Orders service
        │     ├── Payments / settlement service
        │     └── Vendor service
        │
        ├── Search service            → driver: DB full-text | OpenSearch | Algolia
        ├── Tracking / dispatch       → Go
        ├── Realtime / chat gateway   → Node.js  (WebSocket, SSE, Pusher/Echo compatible)
        ├── Notification workers      → Node.js or Go
        └── Media workers             → Go

Shared infrastructure:
PostgreSQL + PostGIS • Redis • Event broker • Object storage • CDN (Cloudflare)
```

**Resolved stack decisions:** PostgreSQL + PostGIS as the datastore (geo-heavy features are core). **Laravel microservices** — each service independently deployable with its own schema, communicating synchronously via the gateway and asynchronously over the event broker; no shared-database coupling and no cross-service joins. Go/Node services for tracking, realtime, notifications and media. Search and AI specified as **pluggable driver interfaces** — search: DB full-text / OpenSearch / Algolia; AI: Ollama-hosted Llama 3.1/3.3 and Qwen 2.5 32B / Qwen-Image, OpenAI GPT-4o, Gemini — selected by configuration, no vendor lock-in.

## Product surface being specified

~200 screens across 6 portals; 9 business modules; 184 relational tables; ~180 business routines; roles `admin, finance, sales, vendor, customer, rider`; 7 object-storage buckets; 19 backend endpoints re-homed onto the target services.

Modules: Ecommerce • Food Delivery • Homes (real estate) • Socio (social network) • Classifieds • Service Booking • Transportation & Logistics • Franchise • Vendor • Rider • Admin/Back-office.

### Key highlights specified in full

Drag-and-drop app builder (visual mobile home-screen designer) • unlimited app designs via widget library, layout styles, colours and backgrounds • multi-vendor seller registration, store approval and commission management • zone-based delivery with map-drawn polygons, custom fees, surge pricing and per-km rates • AI product assistant (name, description, SEO content) • live order tracking over SSE, WebSocket and Pusher • wallet, cashback points and referral rewards engine • full Sanctum-authenticated REST API v1 for iOS and Android • 12 payment gateways (Razorpay, Stripe, PayPal, Paystack, PhonePe, Paytm, Flutterwave, Midtrans and more) • 6-step installation wizard • classifieds • service booking with provider dashboard • courier dispatch and fleet tracking • WhatsApp and Telegram bot integration • advanced analytics with drill-down reports (Chart.js) • multi-language admin (i18n).

## Document set

Written to `docs/sow/`, one file per area so it can be loaded selectively.

| File | Contents |
|---|---|
| `00-overview.md` | Product definition, modules, portal map, personas, glossary, the key-highlights feature matrix, non-functional requirements (latency budgets, availability, scale targets, offline/native, i18n and multi-currency) |
| `01-architecture.md` | Target topology in detail: gateway/BFF responsibilities and per-client response shaping, service decomposition and bounded contexts, per-service ownership and data boundaries, synchronous vs event-driven inter-service contracts, service discovery, resilience (timeouts, retries, circuit breakers), distributed transactions/saga patterns, deployment topology, environments, CI/CD per service, observability and distributed tracing, and the 6-step installation wizard specification |
| `02-identity-and-rbac.md` | Auth flows (email/password, phone OTP, Google OAuth), Sanctum token issuance/refresh/abilities at the gateway, role and permission model, per-portal session isolation, cross-portal identity uniqueness, Laravel policies plus query-level row scoping |
| `03-data-model.md` | Full PostgreSQL schema by module — tables, columns, types, keys, FKs, enums, indexes, partitioning candidates, PostGIS geometry columns and spatial indexes, ER diagrams in `text` blocks |
| `04-modules-ecommerce.md` | Catalog, attributes/variants, cart rules, checkout, orders, invoices, credit notes, inventory, reviews, wishlist, wallet + cashback + referral engine, and the full coupon engine (fraud checks, reservation, rollback, geo/vendor mapping) |
| `05-modules-food-delivery.md` | Restaurants, menus, combos, orders, zone-based delivery (polygon zones, fee rules, surge, per-km), live tracking, rider assignment, order chat, refunds, food coupons and invoices |
| `06-modules-homes.md` | Properties, localities, amenities, plans, enquiries, visits, bookmarks, saved searches, rent tracker, EMI/value estimator, moderation |
| `07-modules-socio.md` | Posts, reels, stories, channels, follows/friends, DMs, notifications, hashtags, shopping tags, moderation; realtime gateway protocol and WebRTC signalling contract |
| `08-modules-classifieds-services-franchise.md` | Classified ad lifecycle; service booking (availability, appointment scheduling, provider dashboard, fulfilment); franchise plans, public registration, projections, active franchises, registration payments, multi-page receipt PDF spec |
| `09-modules-vendor-rider-logistics.md` | Vendor onboarding/KYC/approval, store approval and commission management, catalog and availability, settlements and TDS ledger, dropshipping; rider registration and KYC, courier dispatch, assignment algorithm, location streaming, fleet tracking, payouts and settlements |
| `10-admin-and-reporting.md` | All admin screens, multi-language admin (i18n), platform configuration, banners/ads, audit logging, Chart.js analytics dashboards, and the report specifications (GSTR1/3B/9, HSN, TCS, TDS 194O, daybook, settlements, revenue) with drill-down behaviour, columns and export formats |
| `11-app-builder.md` | Drag-and-drop mobile home-screen builder: widget library and per-widget schema, layout styles, theming (colours, backgrounds, typography), section ordering and targeting rules, draft/publish/versioning, storage model, and how mobile clients render a published layout |
| `12-api-contracts.md` | Gateway/BFF route catalogue and REST API v1 resource contracts per Laravel service; inter-service API contracts; Go tracking/dispatch and media worker APIs; Node realtime gateway event protocol (WebSocket, SSE, Pusher/Echo channels); notification worker job contracts — schemas, auth mode, service-to-service auth, errors, idempotency, side effects, versioning and rate limits |
| `13-events-and-async.md` | Event broker topology: topics, event schemas and versioning, producers/consumers per service, outbox pattern, sagas and compensating actions, retries and DLQ; Redis usage (cache keys/TTL, locks, rate limits, queues); Laravel queue jobs and scheduled commands |
| `14-search-media-geo.md` | Search driver interface with DB full-text, OpenSearch and Algolia implementations — index definitions, mappings, analyzers, sync/reindex, ranking and faceting per module. Media workers: upload flow, image and video transcode ladders, object-storage layout, signed URLs, Cloudflare CDN and cache invalidation. PostGIS: zone polygons, radius and distance queries, per-km fee computation, dispatch geo logic, Google Maps integration for drawing and tracking |
| `15-ai-services.md` | AI driver interface and provider adapters (Ollama/Llama 3.1 & 3.3, Qwen 2.5 32B, Qwen-Image, OpenAI GPT-4o, Gemini): product name/description/SEO generation, image generation, prompt templates, moderation, cost and rate controls, caching, fallback chain |
| `16-integrations.md` | 12 payment gateways with a unified payment driver contract (charge, capture, refund, webhook, reconciliation) per provider; SMS/OTP; push notifications; WhatsApp and Telegram bots (order alerts and status updates); email delivery; ERP sync; maps/geocoding — configuration keys referenced by name only |
| `17-design-system.md` | Brand palette and tokens, typography, component library, mobile/safe-area rules, media standards (WebP 70% / 2048px, H.264 480p / 45s), accessibility |
| `18-build-plan.md` | Rebuild sequenced into phases with dependencies, acceptance criteria per phase, data migration and seed order, test strategy (unit, contract, load, end-to-end), and a definition of done |

## Technical approach

- Table inventory generated from the live schema so column names, types and constraints are exact rather than inferred, then re-expressed as portable PostgreSQL DDL with PostGIS types where geospatial.
- Business logic currently held in database routines and client libraries (coupon engine, commission cascade, points/wallet, settlements, tax) extracted and restated as explicit application-layer rules with formulas, each assigned to its owning Laravel module or Go/Node service.
- Existing serverless endpoints re-mapped one by one onto the target services, with the new owner named for each.
- Row-level access rules currently enforced at the database restated as Laravel authorization policies plus query-scoping requirements.
- Screen inventory derived from the existing route map so every specified screen maps to a real one.
- Pluggable subsystems (search, AI, payments, storage, notifications) specified as interface + adapter contracts so providers are swappable by configuration.
- Secrets and credentials referenced by **name only** — never values.

## Deliverables

1. `docs/sow/` — the 19 Markdown files above, committed to the repo.
2. `/mnt/documents/Planext4U-Technical-SOW.md` — single consolidated copy for download and external sharing.

Expected size: 60+ pages equivalent. Built in three passes — foundation (00-03), modules (04-11), platform contracts and build plan (12-18) — so you can review and correct direction after each pass.
