# 00 — Overview

## 1. Product definition

**Planext4U** is a multi-vertical, multi-vendor commerce and community platform for the Indian market with multi-country capability. A single account gives a person one identity across every vertical; vendors, riders and franchise partners operate their own portals against the same core.

The platform combines nine business verticals that most competitors ship separately:

| # | Vertical | One-line definition |
|---|---|---|
| 1 | **Ecommerce** | Multi-vendor product marketplace with variants, inventory, coupons, wallet and GST-compliant invoicing |
| 2 | **Food Delivery** | Restaurant discovery, menus and combos, zone-based delivery, live rider tracking, order chat |
| 3 | **Homes** | Real-estate listings (rent/sale/lease/PG), enquiries, site visits, rent tracker, EMI and value estimators |
| 4 | **Socio** | Full social network — posts, reels, stories, channels, follows, DMs, audio/video calling, shoppable tags |
| 5 | **Classifieds** | Peer-to-peer buy/sell of used goods with local, category-scoped listings |
| 6 | **Service Booking** | Appointment scheduling against provider availability, with a service-provider dashboard and OTP fulfilment |
| 7 | **Transportation & Logistics** | Courier dispatch, rider assignment, real-time fleet tracking, proof of delivery, rider payouts |
| 8 | **Franchise** | Public franchise registration, plan catalogue, business projections, territory allocation, registration payments |
| 9 | **Admin / Back-office** | Configuration, moderation, CMS, drag-and-drop app builder, settlements, statutory reporting |

## 2. Scale of the specification

Measured from the reference implementation this specification documents:

| Dimension | Count |
|---|---|
| Distinct application routes / screens | 214 |
| Relational tables | 185 |
| Business routines to re-home into services | ~180 |
| Access-control rules to restate as authorization policies | 524 |
| Backend endpoints (serverless) to re-home onto target services | 19 |
| Object-storage buckets | 7 |
| Roles | 6 — `admin`, `finance`, `sales`, `vendor`, `customer`, `rider` |
| Statutory / operational reports | 19 |
| Client applications | 4 — web + 3 native (Customer, Vendor, Rider) |

## 3. Portals

The product is one logical system exposed through six portal surfaces. Each portal has its own authentication realm, its own token storage key, and hard isolation: a session in one portal must never satisfy a request in another.

| Portal | Base path | Primary audience | Native app |
|---|---|---|---|
| Customer | `/app/*` | Shoppers, diners, renters, social users | Yes (Customer app) |
| Vendor | `/vendor/*` | Sellers, restaurants, service providers | Yes (Vendor app) |
| Rider | `/rider/*` | Delivery and courier partners | Yes (Rider app) |
| Admin | `/` and `/admin/*` | Platform operators, finance, sales | No (web) |
| Public registration | `/register/*`, `/franchise/*` | Prospective vendors and franchisees | No (web) |
| Public content | `/app/cms/:slug`, share pages | Anonymous visitors, crawlers | No (web) |

### 3.1 Screen inventory

The full route list is normative; every route below must exist in the rebuild with equivalent behaviour. Detailed per-screen behaviour is specified in the module chapters.

**Customer portal (`/app`)** — `home`, `browse`, `categories`, `deals`, `trending`, `product/:id`, `service/:id`, `services`, `vendor/:id`, `cart`, `payment`, `orders`, `orders/:orderId`, `wallet`, `wishlist`, `coupons`, `referrals`, `profile`, `profile/edit`, `kyc`, `set-location`, `account-control`, `change-password`, `set-password`, `support`, `calls`, `privacy`, `terms`, `cms/:slug`, `vendor-register`.

**Customer auth** — `login`, `phone-login`, `register`, `forgot-password`, `reset-password`, `/auth/callback`.

**Food (`/app/food`)** — `food`, `food/restaurant/:id`, `food/cart`, `food/orders`, `food/orders/:id`.

**Homes (`/app/find-home`)** — root listing, `:id`, `post`, `my-properties`, `saved`, `saved-searches`, `messages`, `emi`, `value-estimator`, `rent-tracker`.

**Classifieds (`/app/classifieds`)** — root, `:id`, `post`.

**Socio (`/app/social`)** — `social`, `explore`, `reels`, `channels`, `live`, `shop`, `create`, `dashboard`, `suggestions`, `friends`, `messages`, `messages/:recipientId`, `notifications`, `notification-settings`, `comments/:postId`, `post/:postId`, `post/:postId/edit`, `stories/:userId`, `profile`, `profile/:userId`, `@:username`, `:username/followers`, `:username/following`, `profile/:userId/followers`, `user/:userId/posts/:postId`, `edit-profile`, `settings`, `privacy`, `security`, `change-password`, `help`.

**Vendor portal (`/vendor`)** — `login`, `register`, `set-password`, `change-password`, dashboard root, `products`, `services`, `restaurant`, `media`, `orders`, `food-orders`, `bookings`, `availability`, `coupons`, `dropshipping`, `payments`, `settlements`, `bank`, `kyc`, `profile`, `settings`, `account-control`.

**Rider portal (`/rider`)** — `login`, `register`, `kyc`, dashboard root, `orders`, `earnings`, `profile`.

**Admin** — dashboard, `products`, `categories`, `parent-items`, `product-attributes`, `services`, `customers`, `vendors`, `orders`, `settlements`, `points`, `referrals`, `coupons` (+ `dashboard`, `generate`, `inventory`, `analytics`, `reports`, `audit`, `fraud`), `food-coupons`, `food-orders`, `restaurants`, `classifieds`, `banners`, `popup-banners`, `advertisements`, `homepage-cms`, `cms`, `cms-pages`, `media-library`, `splash-screens`, `onboarding`, `vendor-onboarding`, `vendor-plans`, `module-visibility`, `platform-variables`, `integrations`, `settings`, `tax`, `occupations`, `localities`, `properties`, `property-plans`, `property-reports`, `homes/*` (`amenities`, `cms`, `moderation`, `users`), `social`, `riders`, `rider-kyc`, `rider-settlements`, `dropshipping`, `file-uploads`, `complaints`, `support-tickets`, `website-queries`, `notifications`, `report-log`, `franchise/*` (`registrations`, `active`, `plans`, `projections`), `registration-payments`, `cf/*` catalogue-filter views (`categories`, `products`, `services`, `vendors`, `city`, `area`).

**Reports** — `sales`, `revenue`, `payments`, `invoices`, `credit-notes`, `settlements`, `tax`, `gstr1`, `gstr3b`, `gstr9`, `hsn`, `tcs`, `tds-194o`, `daybook`, `points`, `referrals`, `customers`, `vendors`, `classifieds`.

**Public registration** — `/register/vendor`, `/vendor/register`, `/register/franchise`, `/franchise/register`.

## 4. Key highlights — feature matrix

Every item below is a hard requirement, specified in the referenced chapter.

| Highlight | Requirement summary | Spec |
|---|---|---|
| Drag-and-drop app builder | Visual designer for the mobile home screen; no code required | `11` |
| Unlimited app designs | Widget library × layout styles × colour themes × backgrounds, composable without limit | `11` |
| Multi-vendor ready | Seller registration, store approval workflow, commission management | `09` |
| Zone-based delivery | Map-drawn polygons, per-zone fees, surge pricing, per-km rates | `05`, `14` |
| AI product assistant | One-click product name, description and SEO content generation | `15` |
| Live order tracking | Real-time GPS over SSE, WebSocket and Pusher | `07`, `12` |
| Wallet + cashback + referral | Digital wallet, points, cashback and referral rewards engine | `04` |
| Full REST API v1 | Sanctum-authenticated API sufficient to build iOS and Android clients | `12` |
| 12 payment gateways | Razorpay, Stripe, PayPal, Paystack, PhonePe, Paytm, Flutterwave, Midtrans, Cashfree, Mollie, 2Checkout, bank transfer | `16` |
| 6-step installation wizard | Server-less deployment onboarding | `01` |
| Classifieds | Local buy/sell of used goods | `08` |
| Service booking | Appointment scheduling + provider dashboard | `08` |
| Transportation & logistics | Courier dispatch, real-time fleet tracking | `09` |
| WhatsApp & Telegram bots | Order alerts and status updates | `16` |
| Advanced analytics | Chart.js dashboards with drill-down reports | `10` |
| Multi-language admin | Full i18n in the admin panel | `10` |

## 5. Personas

| Persona | Needs | Primary portal |
|---|---|---|
| **Customer** | Buy products, order food, find homes, post classifieds, book services, use social features, spend wallet points | Customer |
| **Vendor — retail** | List products, manage inventory and pricing, fulfil orders, view settlements | Vendor |
| **Vendor — restaurant** | Manage menus, combos, availability, accept and track food orders | Vendor |
| **Vendor — service provider** | Publish services, set weekly availability and date overrides, accept bookings, complete with OTP | Vendor |
| **Rider** | Accept assignments, navigate, stream location, capture proof of delivery, track earnings | Rider |
| **Franchise partner** | Register publicly, choose a plan, pay, receive a receipt, operate a territory | Public + Admin |
| **Admin operator** | Configure the platform, moderate content, approve vendors, design the app home screen | Admin |
| **Finance operator** | Settlements, payouts, TDS, statutory reports and exports | Admin |
| **Sales operator** | Vendor and franchise pipelines, coupons and campaigns | Admin |

## 6. Non-functional requirements

### 6.1 Performance budgets

| Metric | Target |
|---|---|
| API p50 / p95 (read) | ≤ 120 ms / ≤ 400 ms server time |
| API p95 (write) | ≤ 800 ms server time |
| Login end-to-end (OTP submit → authenticated home) | ≤ 3 s |
| Mobile first meaningful paint on 4G | ≤ 2.5 s |
| Largest Contentful Paint (web) | ≤ 2.5 s |
| Cumulative Layout Shift | ≤ 0.1 |
| Live tracking location fan-out latency | ≤ 2 s from device to viewer |
| Search query p95 | ≤ 250 ms |
| Report generation (≤ 100k rows) | ≤ 10 s, streamed export |

### 6.2 Scale targets

Design for 1M registered customers, 25k vendors, 5k concurrent riders streaming location at 5 s intervals, 500 orders/minute peak, 10k concurrent social feed readers, and 50M rows in the largest event tables within 24 months. Location, event and audit tables must be time-partitioned.

### 6.3 Availability and resilience

99.9% monthly availability for the customer-facing read path. No single service outage may take down checkout: catalog, search and tracking degrade gracefully to cached or reduced responses. Every inter-service call carries a timeout, a bounded retry with jitter, and a circuit breaker.

### 6.4 Mobile and offline

Native apps for Customer, Vendor and Rider. Required native capabilities: push notifications, background location (Rider), camera and gallery upload, contact matching (opt-in), biometric unlock, deep links, and mandatory-update enforcement against a minimum supported version. The Rider app must queue location pings and delivery proofs offline and flush them on reconnect.

### 6.5 Internationalisation and currency

Country is a first-class dimension: catalog, pricing, tax rules, invoice configuration, payment gateway selection and geography (state → district → city → area) are all country-scoped. Admin UI must be fully translatable (i18n) with locale-aware number, currency and date formatting. Content tables carry a translation strategy (per-locale columns are not acceptable; use a `translations` side table keyed by entity, locale and field).

### 6.6 Compliance and data protection

GST-compliant invoicing and statutory reporting (GSTR-1, GSTR-3B, GSTR-9, HSN summary, TCS, TDS 194O). KYC documents stored in a private bucket with signed, expiring URLs only. Soft delete for user data with identifier tombstoning so unique constraints survive deletion. Audit logging of every administrative mutation with actor, role, timestamp, before and after state. Configurable retention on audit and log tables.

### 6.7 Accessibility

WCAG 2.1 AA for web admin and customer web: keyboard operability, visible focus, 4.5:1 contrast for body text, labelled form controls, and accessible names on all icon-only controls.

## 7. Glossary

| Term | Meaning |
|---|---|
| **Portal** | An authentication realm and UI surface (Customer, Vendor, Rider, Admin) |
| **Module** | A business vertical (Ecommerce, Food, Homes, Socio, …) |
| **Service** | An independently deployable backend unit owning its own schema |
| **BFF** | Backend-for-frontend; the gateway layer that shapes responses per client |
| **Cart rule** | A server-evaluated automatic discount, distinct from a user-entered coupon code |
| **Bearer** | The party absorbing a discount (platform, vendor, or split) |
| **Settlement** | Payout of vendor or rider earnings after commission, tax and cooling period |
| **Cooling period** | Configurable delay between order completion and settlement eligibility |
| **P4U points** | The unified wallet currency; 1 point = ₹1 |
| **Zone** | A drawn delivery polygon with its own fee, surge and per-km rules |
| **Read model** | A locally maintained projection of another service's data, fed by events |
