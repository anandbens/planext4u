# 08 — Classifieds and Services

Two distinct modules sharing this chapter because both are listing-plus-lead products rather than cart-and-checkout products.

---

# Part A — Classifieds

Owner: `classifieds-svc`.

An OLX-style buy-and-sell marketplace for used goods, vehicles, property adverts, jobs and local offers.

## A1. Domain model

```text
ad_category (tree, with per-category dynamic field schema)
   └── ad ── images (ordered gallery)
          ├── ad_plan (free / paid / featured / urgent)
          ├── enquiries → chat (WhatsApp handoff or in-app)
          ├── favourites, reports
          └── boosts
```

## A2. Ad record

Title, rich-text description, category, **dynamic category-specific attributes** (a JSON schema per category rendered as a form — e.g. brand/model/year/km for vehicles, RAM/storage/condition for electronics), price with a "negotiable" flag or "free"/"ask price", condition, location (state, district, city, locality plus a geometry point), seller contact preferences, and an ordered image gallery with a designated cover.

## A3. Lifecycle

```text
draft → submitted → (moderation) → active → paused ⇄ active → expired
                             ↘ rejected (reason)
active → sold / closed (terminal, with reason)
```
Ads auto-expire at the plan's duration with reminder notifications and one-click renewal. Bumping/boosting refreshes position in listings for a paid duration. Reported ads escalate to moderation.

## A4. Plans and monetisation

Free tier with a monthly ad quota per category; paid plans adding extra ads, longer duration, more photos, featured placement, urgent badges and top-of-category slots. Purchases run through `payments-svc` with a receipt. Entitlements are enforced at publish and at boost time.

## A5. Discovery

Category browse, keyword search, and filters combining shared facets (price, location, radius, condition, posted date, seller type) with the category's dynamic attributes. Radius search uses PostGIS. Sorting by relevance, date, price and distance. Saved searches with alerts.

## A6. Lead handling

- **In-app chat** thread per ad and buyer, delivered through the realtime gateway, with offer/counter-offer messages as structured message types.
- **WhatsApp handoff**: a deep link pre-filled with the ad reference and a templated opening message, subject to the seller's contact preference. Phone reveal is logged and quota-limited.
- **Call** with number masking where a telephony provider is configured.
- Favourites, recently viewed, and "similar ads" recommendations.

## A7. Safety

Prohibited-category enforcement (weapons, drugs, counterfeit, live animals, adult content) via a maintained blocklist plus automated text and image screening. Scam-pattern detection on messages (advance-payment requests, off-platform payment links) raising warnings to the buyer. Seller reliability score from response rate, completed sales and report history.

## A8. Acceptance criteria (classifieds)

1. Category-specific attribute schemas render, validate and persist without code changes per category.
2. Ad quotas and photo limits are enforced server-side.
3. Expired ads disappear from all discovery surfaces including direct search.
4. Phone reveal and WhatsApp handoff respect the seller's contact preference in every path.

---

# Part B — Services and Bookings

Owner: `services-svc`. Collaborators: `vendor-svc`, `orders-svc` (shared money rails), `payments-svc`, `logistics-svc` (technician travel where applicable).

Appointment-based service commerce: a customer books a time slot with a service provider, the provider fulfils it, and completion is verified.

## B1. Domain model

```text
service_category (tree) → service → service_variant (duration / tier / price)
service_provider (vendor) → provider_service (offering + pricing override)
                          → weekly_schedule → schedule_exception
                          → service_area (geometry / radius)
booking → slot → assignment → fulfilment (OTP + photos) → invoice → review
```

## B2. Service catalogue

A service carries: name, rich-text description, category, images, base price or price range, pricing model (fixed, hourly, per-unit, quote-on-request), duration, inclusions and exclusions, prerequisites, cancellation policy, tax class, and whether it is delivered at the customer's location, at the provider's location, or remotely. Providers attach to services with their own price and duration overrides, subject to platform floors and ceilings.

## B3. Availability

- **Weekly schedule** per provider: for each weekday, zero or more working windows plus break windows, a slot granularity, and a concurrency limit (how many bookings may overlap).
- **Exceptions**: date-specific closures, holidays, and one-off extended hours override the weekly pattern.
- **Lead time and horizon**: minimum notice before the earliest bookable slot, and how far ahead booking is permitted.
- **Buffer**: pre- and post-appointment padding, plus travel time when the service is at the customer's location and a distance is computable.
- Slot generation is computed on read from schedule + exceptions + existing bookings; generated slots are never stored as rows of record.

## B4. Booking flow

1. Customer selects service, provider (or lets the platform assign), address, and date.
2. Server returns available slots for the horizon.
3. Customer selects a slot; the server places a **short-lived slot hold** (TTL, default 10 minutes) to prevent double booking.
4. Pricing is computed: base price, add-ons, visit/travel fee by distance, taxes, coupon (services coupon namespace), points redemption under the same maximum-redeemable rules as `04 §6.3`.
5. Payment: full prepay, partial advance, or pay-after-service, per service configuration.
6. Booking is confirmed, the hold converts to a booking, and confirmations are sent to customer and provider.

Double-booking must be impossible: slot capacity is enforced with a database-level constraint or a serialisable transaction, not an application-level read-then-write.

## B5. Booking lifecycle

```text
pending → confirmed → provider_assigned → en_route → in_progress → work_completed → completed
        ↘ rejected      ↘ rescheduled (→ confirmed)      ↘ cancelled → refunded
                                                          ↘ no_show_customer / no_show_provider
```

- **Rescheduling** by either party within policy re-runs slot availability and preserves the booking id and payment.
- **Cancellation** applies a policy-driven fee schedule keyed on the time remaining before the slot; the fee split between provider and platform is configured and snapshotted.

## B6. Fulfilment verification

- **Start OTP** — the customer receives a code; the provider enters it to move the booking to `in_progress`. This proves attendance.
- **Completion evidence** — the provider uploads work-completion photos (minimum count configurable per category) and notes, then requests completion.
- **Completion OTP** — the customer confirms with a second code, moving the booking to `work_completed`.
- If the customer is unreachable, an escalation path allows an operator to complete the booking on the evidence, recorded as an override with the operator's identity.
- Only after `work_completed` does the booking become `completed`, releasing settlement and enabling review.

## B7. Extras and variations

Providers may add on-site extras (additional parts, extra hours, additional units) which generate a supplementary charge the customer approves in-app before it is captured. Unapproved extras are never chargeable.

## B8. Provider dashboard

Today's schedule, upcoming bookings, calendar view, availability editor, service and pricing management, service-area map, earnings and settlements, ratings, and cancellation/no-show metrics feeding a provider quality score.

## B9. Money

Commission uses the same cascade as `04 §9` (service-level → provider-level → plan → category → platform default). Settlement follows `09` with its cooling period. Refunds mirror the cancellation policy, with the bearer recorded.

## B10. Reviews

Only on `completed` bookings, rating the provider on quality, punctuality and behaviour, with optional photos. Aggregates recompute via events and feed provider ranking.

## B11. Acceptance criteria (services)

1. Concurrent booking of the last slot capacity results in exactly one confirmed booking.
2. Generated slots always respect weekly schedule, exceptions, buffers, lead time and existing bookings.
3. A booking cannot reach `completed` without both OTPs (or a recorded operator override) and the required completion photos.
4. Cancellation fees computed by the server match the published policy for every boundary case.
5. Rescheduling preserves the booking id, payment and audit trail.
