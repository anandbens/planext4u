# 12 — API Contracts

Three contract layers: **public API v1** (mobile and web clients, through the gateway/BFF), **internal service APIs** (service-to-service), and **infrastructure protocols** (realtime, tracking, media, notifications).

## 1. Conventions

| Aspect | Rule |
|---|---|
| Base | `https://api.<domain>/v1/...`; BFF variants under `/v1/app/...` (mobile) and `/v1/admin/...` |
| Format | JSON, `application/json`, UTF-8; snake_case keys |
| Auth | `Authorization: Bearer <sanctum-token>` for user contexts; signed service tokens internally |
| Versioning | Major version in the path; additive changes only within a version; removals require a new version and a deprecation window announced via `Sunset` headers |
| Pagination | Cursor-based: `?limit=&cursor=`; response `data[]` + `meta.next_cursor`. Offset pagination is not permitted on feeds or large lists |
| Filtering | `?filter[field]=value`, `?sort=-created_at`, `?include=relation` |
| Idempotency | Every non-GET that moves money, stock or state accepts `Idempotency-Key`; replays return the original response |
| Concurrency | `If-Match` / `ETag` on mutable resources; `409` on conflict |
| Localisation | `Accept-Language`; `X-Country`, `X-Currency` context headers |
| Client context | `X-Client-Platform`, `X-Client-Version`, `X-Device-Id`, `X-Request-Id` |
| Rate limits | Per token, per IP and per endpoint class; `X-RateLimit-*` headers; `429` with `Retry-After` |
| Errors | RFC 7807 problem+json |

### 1.1 Error shape

```json
{
  "type": "https://errors.<domain>/points/exceeds-maximum",
  "title": "Points exceed the maximum redeemable",
  "status": 422,
  "detail": "Maximum redeemable for this cart is 250 points.",
  "code": "POINTS_EXCEEDS_MAX",
  "request_id": "01J...",
  "errors": { "points_redeemed": ["Must not exceed 250."] }
}
```
Validation failures return `422` with per-field messages. Never return a generic message where a specific one is computable — this applies especially to public registration endpoints.

### 1.2 Status codes

`200` read/update, `201` create, `202` accepted (async), `204` no content, `400` malformed, `401` unauthenticated, `403` unauthorised, `404` not found or not visible, `409` conflict, `410` gone, `422` validation, `423` locked, `429` rate limited, `5xx` server.

## 2. Gateway and BFF

- The gateway terminates TLS, authenticates the token, resolves identity and abilities, applies rate limits, injects correlation ids, and routes to services.
- The **mobile BFF** composes multi-service responses so a screen is one round trip (e.g. home screen = layout + banners + rails + wallet snapshot). It shapes payloads for bandwidth: no unused fields, images as pre-sized variants, and explicit dimensions.
- The **admin BFF** applies the same composition for admin screens and enforces admin ability checks before fan-out.
- Timeouts, retries with jitter, and circuit breakers per downstream are configured at the gateway; a failing non-critical downstream degrades its section rather than the whole response.

## 3. Public API v1 catalogue

### 3.1 Auth and account — `identity-svc`

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/otp/request` | Phone OTP; rate limited per number and device |
| POST | `/auth/otp/verify` | Returns token + profile; creates the account when new |
| POST | `/auth/login` | Email/password |
| POST | `/auth/oauth/{provider}/callback` | Google and other providers; redirect URI must be a same-origin public URL, never a protected route |
| POST | `/auth/password/set` `/reset` `/forgot` | Includes mandatory first-time password setup |
| POST | `/auth/refresh`, `/auth/logout`, `/auth/logout-all` | Token lifecycle |
| GET/PATCH | `/me` | Profile; PATCH is field-whitelisted |
| GET/POST/PATCH/DELETE | `/me/addresses` | Address book with coordinates and a default flag |
| GET | `/me/wallet`, `/me/wallet/transactions` | Balance and ledger |
| GET | `/me/notifications`, POST `/me/notifications/read` | Inbox |
| POST | `/me/devices` | Push token registration — throttled to once per session, not per navigation |
| POST | `/me/deactivate`, `/me/delete` | Self-service, audited, soft-delete semantics |

### 3.2 Catalog — `catalog-svc`

`GET /categories`, `/categories/{id}`, `/products`, `/products/{id}`, `/products/{id}/variants`, `/products/{id}/reviews`, `POST /products/{id}/reviews`, `/attributes`, `/brands`, `/vendors/{id}/products`.
Product list supports facets, distance filtering from `lat`/`lng`, and returns only `approved`+`active` items.

### 3.3 Cart, checkout and orders — `orders-svc`

| Method | Path |
|---|---|
| GET/POST/PATCH/DELETE | `/cart`, `/cart/items`, `/cart/items/{id}` |
| POST | `/cart/coupon` (validate + reserve), DELETE `/cart/coupon` |
| POST | `/cart/points` (validate against `max_redeemable`) |
| GET | `/cart/summary` — the authoritative totals breakdown |
| GET | `/checkout/delivery-options` — slots, fees, serviceability |
| POST | `/checkout` — idempotent; starts the saga; returns order + payment intent |
| GET | `/orders`, `/orders/{id}`, `/orders/{id}/track`, `/orders/{id}/invoice` |
| POST | `/orders/{id}/cancel`, `/orders/{id}/return`, `/orders/{id}/reorder` |

### 3.4 Module endpoints

- **Food** — `/food/restaurants`, `/food/restaurants/{id}/menu`, `/food/cart*`, `/food/orders*`, `/food/orders/{id}/chat`.
- **Homes** — `/homes/properties`, `/homes/properties/{id}`, `/homes/localities`, `/homes/enquiries`, `/homes/visits`, `/homes/saved-searches`, `/homes/rent-payments`.
- **Socio** — `/socio/feed`, `/socio/posts`, `/socio/reels`, `/socio/stories`, `/socio/profiles/{handle}`, `/socio/follow`, `/socio/comments`, `/socio/conversations`, `/socio/messages`, `/socio/calls`.
- **Classifieds** — `/classifieds/ads`, `/classifieds/categories`, `/classifieds/ads/{id}/enquiries`, `/classifieds/plans`.
- **Services** — `/services`, `/services/{id}/providers`, `/services/providers/{id}/slots`, `/bookings`, `/bookings/{id}/otp`, `/bookings/{id}/complete`.
- **Franchise (public)** — `POST /public/franchise/registrations`, `POST /public/vendor/applications`, `GET /public/franchise/plans`. Unauthenticated, rate-limited, CAPTCHA-verified, field-level validated, returning specific errors.
- **App builder** — `GET /app/screens/{key}` (see `11 §8`).

### 3.5 Vendor and rider APIs

Vendor: `/vendor/dashboard`, `/vendor/products*`, `/vendor/orders*`, `/vendor/bookings*`, `/vendor/settlements*`, `/vendor/store`, `/vendor/staff`, `/vendor/reports/*`.
Rider: `/rider/shift`, `/rider/assignments`, `/rider/assignments/{id}/accept|reject|pickup|deliver`, `/rider/location` (batched pings), `/rider/earnings`, `/rider/cash`.

## 4. Internal service APIs

Service-to-service calls are authenticated with short-lived signed service tokens carrying the calling service identity and scope, propagate `X-Request-Id` and trace context, and are subject to timeouts and circuit breakers. Representative contracts:

| Caller → Callee | Operation |
|---|---|
| orders → catalog | `POST /internal/inventory/reserve` / `release` / `commit` (idempotent, per line) |
| orders → promotions | `POST /internal/coupons/reserve` / `commit` / `release` / `rollback` |
| orders → identity | `POST /internal/wallet/debit` / `credit` / `reverse` |
| orders → payments | `POST /internal/payments/intent` / `capture` / `refund` |
| orders → logistics | `POST /internal/deliveries` (create job), `GET /internal/deliveries/{id}` |
| logistics → tracking | `POST /internal/assignments` (register for tracking) |
| any → notifications | `POST /internal/notifications/dispatch` (template, locale, channel, recipient, variables) |
| any → media | `POST /internal/media/jobs` (transcode/derive) |
| any → search | `POST /internal/index/upsert` / `delete` (also driven by events) |

Cross-service reads never join another service's tables; they call the owning service or read a locally maintained replica built from events.

## 5. Realtime gateway protocol (Node)

### 5.1 Transports
WebSocket (primary), SSE (fallback and for one-way streams), Pusher/Echo channels (compatibility). All three carry the identical event envelope.

```json
{ "event": "order.status_changed", "channel": "order.01J...", "id": "evt_...", "ts": "2026-08-15T10:00:00Z", "data": { } }
```

### 5.2 Channels and authorisation
`user.{id}`, `order.{id}`, `booking.{id}`, `conversation.{id}`, `vendor.{id}`, `rider.{id}`, `dispatch.zone.{id}`, `presence.{scope}`.
Subscription requires a channel-authorisation call to the owning service; **membership is derived server-side from the entity, never from a client claim**. Tokens are short-lived and re-issued on reconnect.

### 5.3 Event set
`order.status_changed`, `order.eta_updated`, `delivery.location`, `assignment.offered|accepted|reassigned`, `booking.status_changed`, `message.created|read|deleted`, `typing.started|stopped`, `presence.changed`, `notification.created`, `call.offer|answer|ice|hangup`.

### 5.4 Reliability
Sequence numbers per channel; clients may request replay from a last-seen sequence within a bounded window. Heartbeats every 25 s; exponential reconnect with jitter; state re-sync via REST on reconnect. Location events are throttled server-side to at most one per second per assignment.

### 5.5 WebRTC signalling
`call.offer` → `call.answer` → `call.ice` (bidirectional, trickled) → `call.hangup`, plus `call.ringing`, `call.busy`, `call.timeout`. The gateway relays only signalling; media is peer-to-peer via STUN with managed TURN relay fallback. Eligibility is checked at offer time.

## 6. Tracking and dispatch service (Go)

| Endpoint | Purpose |
|---|---|
| `POST /internal/pings` | Batched location ingest: `[{rider_id, lat, lng, accuracy, speed, heading, ts}]`; accepts out-of-order and buffered pings, deduplicates by `(rider_id, ts)` |
| `GET /internal/riders/nearby` | Candidate riders within a radius/zone with load and score inputs |
| `POST /internal/dispatch/assign` | Runs the assignment algorithm for a job; returns the offer |
| `POST /internal/dispatch/reassign` | Revokes and re-offers atomically |
| `GET /internal/assignments/{id}/eta` | Current ETA and route progress |
| `GET /internal/traces/{assignment_id}` | Downsampled trace for payout and disputes |

Ingest target: 10k pings/second sustained. Geofence entry/exit and route-deviation detection run in-stream and emit events.

## 7. Media workers (Go)

`POST /internal/media/uploads` returns a pre-signed direct-to-object-storage URL plus an upload id. On completion the client calls `POST /internal/media/uploads/{id}/complete`, which enqueues derivation. `GET /internal/media/{id}` returns status and the derived variant set. Jobs are idempotent per upload id and publish `media.ready` or `media.failed`.

## 8. Notification workers

Job contract: `{ template_key, locale, channels[], recipient{account_id|phone|email|token}, variables{}, dedupe_key, priority, scheduled_at }`. Workers resolve preferences and quiet hours, render the template, dispatch per channel with provider fallback, record delivery receipts, and suppress duplicates by `dedupe_key`.

## 9. Webhooks

- **Inbound** (payment gateways, SMS, IDV, bots): signature verified, replay-protected by event id, processed idempotently and asynchronously; a raw copy of every payload is retained for reconciliation.
- **Outbound** (partners, ERP): subscription per event type with HMAC signing, at-least-once delivery, exponential retry, and a DLQ with manual replay from admin.

## 10. Acceptance criteria

1. Every money- or state-moving endpoint is idempotent and proven so by replaying a request.
2. No endpoint returns another tenant's or user's data under any parameter manipulation.
3. Public registration endpoints succeed unauthenticated and return field-specific validation errors.
4. A realtime client cannot subscribe to a channel it is not authorised for.
5. Contract tests exist for every inter-service call and run in CI for both sides.
