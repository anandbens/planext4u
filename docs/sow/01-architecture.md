# 01 — Architecture

## 1. Target topology

```text
Customer app (iOS/Android)   Vendor app   Rider app   Web admin (SPA)
        │                        │            │            │
        └────────────────────────┴────────────┴────────────┘
                                 │
                                 ▼
                 ┌───────────────────────────────────┐
                 │   API gateway / Mobile BFF        │
                 │   • TLS termination, routing      │
                 │   • Sanctum token verification    │
                 │   • Per-client response shaping   │
                 │   • Rate limiting, quotas         │
                 │   • Request/trace correlation     │
                 │   • Response aggregation          │
                 └───────────────┬───────────────────┘
                                 │
   ┌─────────────────────────────┼─────────────────────────────────┐
   │                             │                                 │
   ▼                             ▼                                 ▼
Laravel microservices     Polyglot services                Shared platform
──────────────────────    ────────────────────────         ─────────────────
• identity-svc            • search-svc  (driver:           • PostgreSQL 16
• catalog-svc               DB FTS | OpenSearch | Algolia)   + PostGIS
• orders-svc              • tracking-svc      (Go)         • Redis
• payments-svc            • realtime-gateway  (Node.js)    • Event broker
• promotions-svc          • notification-workers (Node/Go) • Object storage
• vendor-svc              • media-workers     (Go)         • CDN (Cloudflare)
• food-svc                • ai-svc (driver: Ollama |       • Secrets manager
• homes-svc                 OpenAI | Gemini)               • Observability
• socio-svc
• classifieds-svc
• franchise-svc
• logistics-svc
• admin-svc
• appbuilder-svc
```

## 2. Service decomposition and bounded contexts

Each Laravel service is a separate codebase, separate deployable, separate database schema (or database), and separate CI pipeline. **No service reads another service's tables.** Cross-context data is obtained by API call (synchronous, when the caller needs a fresh authoritative answer) or by consuming domain events into a local read model (asynchronous, when eventual consistency is acceptable).

| Service | Bounded context | Owns | Never owns |
|---|---|---|---|
| `identity-svc` | Who the actor is | Accounts, credentials, roles, devices, addresses, wallet points ledger, referrals | Orders, catalog |
| `catalog-svc` | What can be sold | Products, variants, attributes, categories, services, inventory ledger, reviews, media references | Prices at time of order, stock reservations at checkout |
| `orders-svc` | The commercial transaction | Carts, orders, order items, order status, refunds, delivery proofs, service bookings | Money movement, catalog truth |
| `payments-svc` | Money in and out | Payment records, gateway transactions, invoices, credit notes, tax config, settlements, TDS ledger, receipts | Order lifecycle |
| `promotions-svc` | Discounting and merchandising | Coupons, campaigns, cart rules, banners, ads, CMS pages, homepage layouts, onboarding/splash | Order totals (it returns a computed discount; orders applies it) |
| `vendor-svc` | The supply side | Vendors, applications, KYC, plans, availability, bank accounts, dropshipping suppliers | Vendor's products (catalog owns them) |
| `food-svc` | Restaurant commerce | Restaurants, menus, combos, food orders, food payments/refunds, order chat, food reviews | Rider dispatch |
| `homes-svc` | Real estate | Properties, localities, amenities, plans, enquiries, visits, bookmarks, saved searches | Payments |
| `socio-svc` | Social graph and content | Profiles, posts, reels, stories, follows, likes, comments, DMs, channels, calls, reports | Product data (referenced by id for shopping tags) |
| `classifieds-svc` | Peer-to-peer listings | Classified ads and categories | Payments |
| `franchise-svc` | Franchise programme | Plans, registrations, active franchises, business projections | Payment capture (delegates to payments) |
| `logistics-svc` | Fulfilment movement | Riders, assignments, payouts, rider settlements | Live position stream (tracking-svc owns it) |
| `admin-svc` | Operations and configuration | Platform settings and variables, geography, audit logs, reports, file uploads, ERP sync config | Any domain data — it calls other services |
| `appbuilder-svc` | Mobile home-screen composition | Layouts, sections, widgets, themes, publish versions | The data widgets render (resolved at read time) |

### 2.1 Extraction rationale for non-PHP services

| Service | Language | Why not Laravel |
|---|---|---|
| `tracking-svc` | Go | Thousands of concurrent rider location streams, sub-second geo matching against PostGIS zone polygons, tight memory profile per connection |
| `realtime-gateway` | Node.js | Long-lived WebSocket/SSE fan-out for chat, feeds, order status and WebRTC signalling; Pusher/Echo protocol compatibility |
| `notification-workers` | Node.js or Go | High-throughput fan-out to FCM/APNs, SMS, email, WhatsApp and Telegram with per-provider rate limits and retry budgets |
| `media-workers` | Go | CPU-bound image and video transcoding pipelines; direct object-storage streaming without PHP memory limits |
| `search-svc` | Thin adapter (Go or Node) | Index maintenance and query translation; isolates the pluggable search driver from every other service |

## 3. API gateway / Mobile BFF

The gateway is the only public entry point. It is not a business-logic layer.

**Responsibilities**
1. TLS termination, HTTP/2, compression.
2. Route matching to upstream services by path prefix and version.
3. Sanctum personal-access-token verification: validate token, resolve actor, resolve abilities, reject on portal mismatch. Attach `X-Actor-Id`, `X-Actor-Role`, `X-Portal`, `X-Country`, `X-Locale`, `X-Request-Id`, `X-Trace-Id` as signed internal headers.
4. Rate limiting and quota enforcement per token, per IP, per route class.
5. **Per-client response shaping.** The same resource is projected differently for a mobile list cell, a mobile detail screen and the admin grid. The BFF exposes named projections (`?view=list|detail|admin`) rather than forcing clients to over-fetch, and composes multi-service aggregates (e.g. an order detail view combining `orders-svc`, `payments-svc`, `catalog-svc` and `logistics-svc`) in a single round trip.
6. Idempotency: honour `Idempotency-Key` on all unsafe methods, backed by Redis.
7. Request/response logging with PII redaction, and trace propagation (W3C `traceparent`).

**Explicitly out of scope for the gateway:** business validation, database access, and any domain rule. If logic is needed, it belongs in a service.

## 4. Inter-service communication

### 4.1 Synchronous
- Internal REST over HTTP/2 on the private network, JSON payloads, OpenAPI-described.
- Service-to-service authentication by short-lived signed JWTs issued from a shared internal issuer, scoped to `audience = target service` and `scope = operation`. Never reuse an end-user token for a downstream call except when explicitly delegating identity, and then only via a narrowed, single-audience token.
- Mandatory per-call timeout (default 2 s), retry only on idempotent operations (max 2, exponential backoff with jitter), and a circuit breaker that opens after a rolling failure threshold and half-opens on a timer.

### 4.2 Asynchronous
- Domain events over the event broker, published via the **transactional outbox** pattern: the service writes the event row in the same database transaction as the state change; a relay publishes and marks it sent. Consumers are idempotent and keyed on event id.
- Event catalogue, schemas and versioning are specified in `13-events-and-async.md`.

### 4.3 Distributed transactions
No two-phase commit. Multi-service workflows are **sagas** with explicit compensating actions. The canonical saga is checkout:

```text
orders.reserve_stock  ─┐                       compensation: release_stock
promotions.reserve_coupon ─┤ orchestrated by   compensation: release_coupon
payments.authorize    ─┤   orders-svc          compensation: void/refund
identity.debit_points ─┤                       compensation: credit_points
orders.confirm        ─┘                       terminal
```
Each step is idempotent and individually retryable. The saga state machine is persisted; a stuck saga is visible in ops tooling and resumable.

## 5. Data boundaries

- One PostgreSQL cluster may host all services, but each service uses its **own schema and own database role**; a service role has no grant on another service's schema. This preserves the boundary while keeping operational cost sane, and allows extraction to separate clusters later without code change.
- PostGIS is enabled cluster-wide; geometry columns live in `logistics`, `homes`, `food` and `vendor` schemas.
- No cross-schema foreign keys. Cross-context identifiers are plain columns with a documented owner (see the per-table notes in `03-data-model.md`).
- Read models are explicitly named `rm_*` and are always rebuildable from the event log.

## 6. Service discovery, configuration and secrets

- Services resolve each other by logical name through the platform's service registry / DNS; no hardcoded hosts.
- All configuration is environment-injected and validated at boot; a service must fail fast on missing required configuration rather than degrade silently.
- Secrets come from the secrets manager, never from the repository or from build artefacts. Secrets are referenced **by name** throughout this specification.

## 7. Deployment topology and environments

| Environment | Purpose | Data |
|---|---|---|
| `local` | Developer machine, containerised, seeded fixtures | Synthetic |
| `ci` | Ephemeral per-pipeline, torn down after tests | Synthetic |
| `staging` | Pre-production, production-shaped, external providers in sandbox mode | Anonymised subset |
| `production` | Live | Live |

Each service ships as a container image. Deployment is per-service, blue/green or rolling, with a readiness probe that verifies database connectivity, broker connectivity and migration state. Database migrations run as a separate, gated step before the new revision receives traffic; migrations must be backwards compatible with the currently running revision (expand → migrate → contract).

## 8. CI/CD per service

Pipeline stages, all blocking:
1. Static analysis and code style (PHPStan/Larastan level 6+ for Laravel; `go vet` + `staticcheck`; ESLint + TypeScript strict for Node).
2. Unit tests with a minimum coverage gate on domain logic.
3. **Contract tests** against the service's published OpenAPI and event schemas — a consumer-driven contract break fails the producer's build.
4. Integration tests against ephemeral PostgreSQL + Redis + broker.
5. Migration dry-run against a staging snapshot.
6. Image build, vulnerability scan, signature.
7. Deploy to staging, smoke tests, then gated promotion.

## 9. Observability

- **Tracing**: OpenTelemetry, W3C trace context propagated from the mobile client through the gateway into every service and worker; broker messages carry the trace context in headers.
- **Metrics**: RED (rate, errors, duration) per endpoint; USE for infrastructure; domain metrics — orders placed, payment success rate per gateway, dispatch time to assignment, notification delivery rate, search latency, AI generation cost.
- **Logs**: structured JSON, correlated by `request_id` and `trace_id`, PII-redacted at the logger.
- **Alerting**: SLO-based burn-rate alerts on the customer-critical path (login, catalog read, checkout, payment webhook, order status) rather than raw resource alerts.
- **Audit**: administrative mutations are a business record, not a log — written to durable audit tables by `admin-svc` (see `10-admin-and-reporting.md`).

## 10. Frontend and client architecture

- **Web admin** — SPA, route-level code splitting, per-portal entry, cache-first data layer with explicit staleness per resource class (configuration long, catalog medium, orders short, realtime none).
- **Mobile apps** — three separate applications sharing one design system and one generated API client. Each app pins a minimum supported version; the gateway returns a `426`-style directive that triggers a blocking update overlay when the client is below `min_app_version`.
- Clients talk **only** to the gateway. No client holds a service address, a database credential, or a provider secret.
- Media is fetched from the CDN by signed or public URL, never proxied through the API.

## 11. Installation wizard (6 steps)

A first-run wizard ships with the platform so an operator can stand up an instance without manual server work. It runs as a guarded route in `admin-svc` that self-disables once installation completes.

| Step | Screen | Actions | Validation before "Next" |
|---|---|---|---|
| 1 | **Requirements check** | Verify runtime versions, required extensions, writable paths, outbound network | All hard requirements green; warnings acknowledged |
| 2 | **Database** | Collect PostgreSQL connection details, test connection, enable PostGIS, run migrations per service | Connection succeeds; PostGIS available; migrations applied |
| 3 | **Infrastructure** | Redis, event broker, object storage bucket and CDN base URL | Each dependency ping succeeds; a test object is written and read back |
| 4 | **Platform identity** | Brand name, logo, primary/secondary colours, default country, currency, timezone, default locale | Required fields present; logo uploaded to object storage |
| 5 | **Integrations** | Select and configure payment gateways, SMS/OTP provider, push provider, email sender, maps key, search driver, AI driver | Each enabled provider passes its credential-validation call |
| 6 | **Admin account & finish** | Create the first `admin` user, seed geography and reference data, seed a default app-builder layout, write the installation lock | Password policy satisfied; seed completes; lock written |

The wizard must be idempotent and resumable: state is persisted after each step, and re-running a completed step is safe.

## 12. Rebuild guardrails

1. No business rule may live only in the database. Stored routines in the reference system are restated as application code owned by a named service (`03` marks each one's destination).
2. No shared "common" database library across services. Shared code is limited to transport, tracing, auth-header parsing and event envelopes, distributed as versioned packages.
3. Every endpoint is specified before it is implemented; OpenAPI is the source of truth and is generated into client SDKs.
4. Every asynchronous consumer is idempotent and can be replayed from the beginning of retention without corrupting state.
5. Every list endpoint is paginated with a stable cursor; offset pagination is not acceptable on tables expected to exceed one million rows.
