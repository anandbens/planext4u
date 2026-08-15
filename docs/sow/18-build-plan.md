# 18 — Build Plan, Environments and Definition of Done

## 1. Environments

| Environment | Purpose | Notes |
|---|---|---|
| Local | Developer machines | Containerised: Postgres+PostGIS, Redis, broker, object storage emulator, all services |
| CI | Automated verification | Ephemeral, seeded, torn down per run |
| Staging | Integration and UAT | Production-shaped, sandbox provider credentials, anonymised data |
| Production | Live | Blue/green or rolling per service, autoscaled |

Configuration is environment-injected; secrets are referenced by name from the secret store. No environment shares a database, a bucket or a broker with another.

### 1.1 Routing and hosting requirements

- Single-page clients require a fallback rewrite to the app entry point so deep links resolve on every host and custom domain.
- **Public routes (vendor registration, franchise registration, CMS, listing detail pages) must load directly at their URL on every configured domain and must never be intercepted by portal-prefix redirects.** Any prefix-based portal routing must explicitly allow-list public prefixes.
- Canonical hosts, HSTS, TLS, and redirects from alternate domains are configured per environment.

## 2. Delivery sequence

Each phase ends with the acceptance criteria of its chapters met, tests green, and a demonstrable environment.

| Phase | Scope | Depends on |
|---|---|---|
| **0 — Foundations** | Repos, CI/CD, containers, gateway skeleton, Postgres+PostGIS, Redis, broker, object storage, CDN, observability, secret store, installation wizard | — |
| **1 — Identity and platform** | Accounts, OTP/password/OAuth, Sanctum tokens, RBAC, addresses, geography master, configuration store, CMS, audit logging, notifications, media pipeline | 0 |
| **2 — Catalog and search** | Categories, attributes, products, variants, inventory, vendors (read side), search drivers and indexes | 1 |
| **3 — Vendor onboarding** | Public vendor registration, KYC/IDV, approval, store config, vendor portal catalogue and staff | 1, 2 |
| **4 — Commerce core** | Cart, pricing engine, promotions and coupon engine, wallet/points/referrals, checkout saga, orders, invoices, returns, refunds | 2, 3 |
| **5 — Payments** | Payment drivers, webhooks, reconciliation, payouts, settlement engine, TDS/TCS ledger | 4 |
| **6 — Logistics** | Zones (PostGIS), delivery fees and surge, rider onboarding and portal, dispatch, tracking service, live tracking transports | 4 |
| **7 — Food** | Restaurants, menus, combos, food cart and orders, order chat, food coupons, restaurant settlement | 5, 6 |
| **8 — Services** | Service catalogue, availability, bookings, OTP fulfilment, provider dashboard | 5 |
| **9 — Homes and Classifieds** | Listings, plans, moderation, enquiries, visits, saved searches, rent tracker, ad lifecycle, lead handling | 1, 5 |
| **10 — Socio** | Profiles, graph, posts/reels/stories, feed, DMs, realtime gateway, WebRTC calling, moderation | 1 |
| **11 — Franchise** | Public franchise registration, plans, projections, payments, multi-page receipts, admin management with reconcile/verified-save/audit | 5 |
| **12 — App builder** | Widget library, builder UI, versioning and publish, client rendering contract | 2, 9 |
| **13 — Admin and reporting** | All admin screens, i18n, ads, dashboards, drill-down reports, statutory reports, exports | all |
| **14 — AI and integrations** | AI drivers and product assistant, WhatsApp/Telegram bots, ERP sync, remaining providers | 2, 5 |
| **15 — Mobile apps** | Native customer, vendor and rider apps against API v1, push, deep links, forced update | 4, 6, 12 |
| **16 — Hardening and launch** | Load and soak testing, security review and penetration test, accessibility audit, data migration, runbooks, go-live | all |

## 3. Data migration

Insert-only migration from the legacy system, run repeatedly until cutover:

1. Freeze schema mapping and write per-entity transformers with a stable external-reference key so re-runs upsert rather than duplicate.
2. Order: geography master → configuration → accounts → vendors → categories/attributes → products/variants/inventory → historical orders and invoices → wallet ledger → listings → social content → media.
3. Media is copied to the new object storage with derived variants regenerated, references rewritten by media id.
4. Every run produces a reconciliation report: source count, migrated count, skipped with reason, and checksums on money columns. A run with unexplained variance blocks cutover.
5. Dry-run in staging, then a rehearsal cutover with a measured freeze window, then production cutover with a documented rollback.

Seed order for a fresh install: countries → states/districts/cities → currencies and tax classes → categories and attributes → roles and permissions → platform configuration → notification and email templates → CMS pages → plans → demo data (non-production only).

## 4. Test strategy

| Level | Requirement |
|---|---|
| Unit | Every pricing, tax, commission, points, cancellation-fee and delivery-fee formula has table-driven tests including boundaries; minimum 80% coverage on domain layers |
| Contract | Consumer-driven contract tests for every inter-service call and every event schema, run in CI for both producer and consumer; a breaking change fails the build |
| Integration | Each service against real Postgres, Redis and broker in containers |
| End-to-end | Critical journeys per portal: register → browse → cart → checkout → pay → track → deliver → return → refund; vendor onboarding → catalogue → order → settlement; rider assignment → delivery; booking → OTP → completion; public vendor and franchise registration → payment → receipt |
| Concurrency | Last-unit stock, last coupon use, last booking slot, duplicate dispatch offer, double webhook delivery — each proven to yield exactly one success |
| Load | Sustained target throughput with p95 latency budgets from `00-overview.md`; ping ingest at 10k/s; feed and search at peak concurrency |
| Resilience | Chaos on each dependency: provider outage, broker lag, cache loss, service restart — verified graceful degradation |
| Security | Automated dependency and container scanning, authorisation matrix tests (every role × every endpoint), IDOR probes, injection and SSRF tests, secret-leak scanning, and a third-party penetration test before launch |
| Accessibility | Automated audits plus manual screen-reader passes on core flows |
| Regression | The full suite runs on every merge to the main branch |

## 5. Definition of done (per feature)

1. Meets the specification and its chapter's acceptance criteria.
2. Server-side authorisation enforced and covered by tests for every role.
3. Money, stock and slot paths are idempotent and concurrency-safe.
4. Events emitted through the outbox; consumers idempotent.
5. Errors return specific, actionable, localised messages.
6. Audit records written for every administratively significant mutation.
7. Observability in place: structured logs with correlation ids, metrics, traces, and alerts on the failure modes that matter.
8. Performance within budget, verified under load.
9. Accessible, responsive, dark-mode-correct, and token-only styling.
10. Documented: API contract published, runbook entry for operational failure modes, admin help text where operators need it.

## 6. Launch readiness

Backups with a tested restore, point-in-time recovery, documented RTO/RPO, on-call rotation and escalation, runbooks for each critical failure mode, rate limits and WAF tuned, statutory reports validated against a closed period, provider accounts moved from sandbox to live with reconciliation verified end to end, and a rollback plan for the cutover.
