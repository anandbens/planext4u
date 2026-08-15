# 06 — Homes (Real Estate)

Owner: `homes-svc`. Collaborators: `identity-svc`, `payments-svc`, `search-svc`, `media-workers`, `notification-workers`, `realtime-gateway`.

A NoBroker-style listing marketplace: owners, agents and builders publish properties; seekers search, shortlist, enquire, book visits and track rent.

## 1. Domain model

```text
locality (city → locality tree, geometry)
   └── property ── amenities (m:n)
                ├── media (images, floor plans, video walkthrough)
                ├── enquiries → messages
                ├── visits (scheduled site visits)
                ├── bookmarks, reports
                └── plan (listing package purchased by the poster)
saved_search (seeker) → alerts
rent_payment (tenant ledger)
```

## 2. Property record

| Group | Fields |
|---|---|
| Classification | `property_type` (apartment, independent_house, villa, plot, pg_hostel, commercial_office, commercial_shop, commercial_warehouse, commercial_showroom), `transaction_type` (rent, sale, lease, pg), `posted_by` (owner, agent, builder) |
| Location | country, state, district, city, locality, address line, landmark, pincode, **geometry point** (GiST-indexed) |
| Physical | bedrooms, bathrooms, balconies, carpet/built-up/super built-up area with unit, floor, total floors, age, `facing` (8-point), `furnishing` (unfurnished, semi_furnished, fully_furnished), `parking` (none, two_wheeler, four_wheeler, both) |
| Commercial | price or monthly rent, deposit, maintenance charge and frequency, price negotiable flag, price per unit area (derived), available-from date, preferred tenant, lease duration |
| Content | title, rich-text description, amenities, highlights, media set, SEO slug and meta |
| Lifecycle | `status` (draft, submitted, active, rejected, paused, expired, sold), plan, expiry date, boost/featured flags |

Descriptions use the rich-text editor; plain textareas are not acceptable. Media follows the platform standard (WebP 70% / 2048 px; walkthrough video H.264 480p / 45 s) and supports swipeable multi-image galleries with floor plans as a distinct media role.

## 3. Listing lifecycle and moderation

```text
draft → submitted → (moderation) → active → paused ⇄ active → expired
                            ↘ rejected (reason required)
active → sold / rented (terminal, with a closure reason)
```

- Moderation queue in admin with bulk approve/reject, reason codes, and a re-submission path.
- Duplicate detection on submit: same poster + same locality + overlapping area and price within a tolerance raises a soft warning to the moderator.
- Automatic expiry at the plan's listing duration, with reminder notifications at T−7 and T−1 days and a one-click renewal.
- Reported listings (`property_reports`) escalate into the moderation queue with the report reasons aggregated.

## 4. Listing plans and monetisation

`property_plans` define listing packages: free tier limits, paid tiers with listing count, duration, featured/boost slots, photo limits, video allowance, contact-reveal quota, and relationship-manager inclusion. Purchase goes through `payments-svc` with the standard gateway drivers and produces a receipt. Plan entitlement is enforced at publish time, not just at purchase.

## 5. Search and discovery

- Facets: transaction type, property type, budget range, bedrooms, area range, furnishing, availability date, amenities, posted-by, age, floor, parking, facing, tenant preference.
- Geospatial: search within a drawn map area, within N km of a point, or by locality selection. Backed by PostGIS `ST_DWithin` / `ST_Contains`, with results ranked by a blend of relevance, recency, boost status and distance.
- Locality pages are first-class SEO landing pages with aggregate statistics (average rent, average price per sq ft, listing count, trend).
- Map view and list view are two projections of the same query; the map clusters at low zoom.
- **Saved searches** persist the full filter set and run on a schedule; new matches trigger notification-worker alerts by push and email at the user's chosen frequency.

## 6. Enquiries, messaging and visits

- **Enquiry** — a seeker expresses interest; the poster's contact details are revealed subject to the poster's privacy setting and the seeker's plan/quota. Every reveal is logged.
- **Messaging** — threaded conversations scoped to a property and a pair of participants, delivered live through the realtime gateway. Participants are derived server-side from the enquiry; contact details are masked until reveal.
- **Site visits** — a seeker proposes slots from the poster's availability; the poster confirms, reschedules or declines. Reminders fire at T−24 h and T−2 h. Outcome is captured after the slot (`completed`, `no_show_seeker`, `no_show_poster`, `cancelled`) and feeds a reliability score.
- **Bookmarks / shortlist** — per-seeker saved properties with optional notes and comparison view.

## 7. Tools

### 7.1 EMI calculator
Inputs: loan amount (defaulting to price minus down payment), annual interest rate, tenure in months.
```text
r    = annual_rate / 12 / 100
EMI  = P × r × (1+r)^n / ((1+r)^n − 1)      (r > 0)
EMI  = P / n                                 (r = 0)
```
Outputs: monthly EMI, total interest, total payable, and an amortisation schedule. Purely client-computable but the formula is normative; results must match to the rupee.

### 7.2 Value estimator
Estimates a price band from locality statistics: median price per unit area for the locality, property type and configuration, adjusted for floor, age, furnishing, facing and amenities, with a confidence band derived from sample size. Where sample size is below a threshold, the estimator must say so rather than emit a spurious number.

### 7.3 Rent tracker
A tenant-side ledger of rent obligations and payments: monthly due amount, due date, paid date, mode, receipt reference, and arrears. Generates rent receipts as PDFs, sends due-date reminders, and produces an annual statement usable for HRA claims.

## 8. Owner and seeker dashboards

- **My properties** — listing status, views, enquiries, shortlists, visit requests, plan usage and expiry, with per-listing analytics.
- **Seeker dashboard** — shortlist, saved searches and their alert settings, enquiry history, upcoming visits, rent tracker.
- **Admin homes screens** — properties, localities, amenities master, plans, reports, moderation, homes CMS, and homes users.

## 9. Content management

`homes_cms` drives the vertical's editorial surface: hero content, curated collections, city guides, FAQ and legal copy, all locale-aware and editable from admin.

## 10. Privacy and abuse controls

- Contact reveal is gated, quota-limited and logged; bulk scraping patterns trigger throttling from the fraud engine.
- Posters may hide their phone number entirely and receive only in-app messages.
- Listings must not display exact coordinates for PG/shared accommodation until an enquiry is accepted; show an approximate marker instead.

## 11. Acceptance criteria

1. A property is only visible to seekers in `active` status with an unexpired plan.
2. A map-area search returns exactly the listings whose point lies within the drawn polygon.
3. Plan limits (listing count, photos, contact reveals) are enforced server-side at the moment of use.
4. Saved-search alerts fire once per new match, never duplicate.
5. Expiry, reminders and renewal work without operator intervention.
6. EMI outputs match the reference formula for a fixed set of test inputs.
