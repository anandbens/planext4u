# 09 — Vendor, Franchise, Rider and Logistics

Owners: `vendor-svc`, `franchise-svc`, `logistics-svc`, `tracking-svc` (Go), with `payments-svc` for money movement.

---

## 1. Vendor onboarding

### 1.1 Public registration

A publicly reachable registration flow (no authentication required) collects, in steps:

1. **Account** — name, mobile, email, password; mobile and email must be unique across the entire platform (customers, vendors, riders, staff). Uniqueness is enforced by a database constraint, not only by an application check.
2. **Business** — legal name, trade name, business type (individual, proprietorship, partnership, LLP, private limited), category of operation (product seller, service provider, restaurant, or a combination), description, year established.
3. **Location** — address, state, district, city, pincode, geometry point, and the intended service area (radius or drawn zone).
4. **Compliance** — GSTIN, PAN, FSSAI (food), professional licences (services), shop-and-establishment registration; each with a document upload.
5. **Banking** — account holder name, account number, IFSC, bank, branch, cancelled-cheque upload; or UPI VPA.
6. **Plan selection** — the subscription plan and, where applicable, the registration fee.
7. **Payment** — registration/subscription payment through `payments-svc`.
8. **Review and submit**.

The submission endpoint is public and therefore must be rate-limited, CAPTCHA-protected, and validated strictly server-side. It writes a `vendor_application`, never a live vendor. Errors must be returned as specific, human-readable messages naming the offending field — a generic failure is not acceptable.

On successful payment, a **multi-page registration receipt PDF** is generated and offered for download and sent by email (see §3.4).

### 1.2 Application lifecycle

```text
draft → submitted → under_review → (docs_requested → resubmitted → under_review)*
      → approved → active
      ↘ rejected (reason required)
```

- Admin-created vendors may bypass `submitted` and enter review or approval directly, with the bypass recorded in the audit log.
- Approval provisions the vendor account, the vendor's portal access, the default catalogue scaffolding, and the settlement profile.
- **A service-provider application must appear in the service-vendor list from the moment it is submitted, not only after approval** — filtering pending applications out of operational lists is a known defect class and is explicitly disallowed.

### 1.3 Identity verification (IDV)

Multi-stage verification with independent statuses per artefact (identity document, address proof, business proof, bank account). Partial auto-approval is supported: artefacts that pass automated checks are approved automatically while the remainder queue for manual review. Integration with a third-party IDV provider is behind a driver interface so the provider can be swapped. Every state change is audited.

## 2. Vendor operations

### 2.1 Portal scope

Dashboard (orders, revenue, ratings, payouts, alerts), catalogue (products and services in separate tabs), inventory and SKU tracking, orders and bookings, delivery settings, promotions, reviews, notifications, settlements and payouts, documents and compliance, staff and roles, store settings, and analytics.

### 2.2 Store configuration

Store name and branding, opening hours with holiday overrides, an accepting-orders toggle, service area (radius or attached zones), preparation/handling time, own-delivery versus platform-delivery, packaging charges, minimum order value, and return policy.

### 2.3 Vendor staff

A vendor may create staff accounts with scoped roles (manager, catalogue, orders, finance, support). Staff permissions are a subset of the vendor's own and are enforced server-side per request.

### 2.4 Subscription plans

Plans define catalogue limits, commission rate, featured slots, analytics depth, staff seats, and support tier. Plan changes are effective-dated; commission changes never retroactively alter settled orders.

## 3. Franchise module

### 3.1 Public franchise registration

A public, unauthenticated multi-step form: applicant details, business background, investment capacity, preferred state/district/city and territory, selected franchise plan, document uploads, and payment. Like vendor registration, it is rate-limited, CAPTCHA-protected and strictly validated, and it writes a `franchise_registration` with status `pending`.

Failure modes that must be handled with precise, user-facing messages: invalid UUID or numeric input, enum value mismatches, and authorisation failures on the public submission path. Public submissions must succeed without an authenticated session — access control on the write path is handled by a dedicated, tightly-scoped server-side procedure, never by loosening table permissions.

The registration route must be reachable at its public URL on every host and must not be intercepted by portal-prefix redirects. Deployment configuration for this is specified in `18-deployment-and-environments.md`.

### 3.2 Franchise plans and projections

- **Franchise plans**: name, territory type (city, district, region), investment amount, registration fee, royalty percentage, term, inclusions, and support commitments.
- **Business projection master**: per-plan revenue, cost and profit projections by month and year, editable in admin and rendered into the registration receipt so the applicant sees the projection they were sold.

### 3.3 Franchise lifecycle and administration

```text
pending → under_review → approved → agreement_signed → active → suspended ⇄ active → terminated
        ↘ rejected (reason)
```

Admin surfaces:
- **Franchise Registrations** — full list with advanced search and filters by plan, status, state, district, city, mobile and email; free-text search; date range; and CSV/PDF export. State and district must be both filterable and displayed as columns.
- **Active Franchises** — approved and operating franchises with their territories, performance and payouts.
- **Registration Payments** — payment records with status, gateway reference, amount, and receipt re-download.
- **Reconcile** — an explicit action that re-fetches registrations from the service and reports a count and status summary, so an operator can confirm data visibility immediately.
- **Verified save** — after an edit, the record is re-read from the server and the persisted values are displayed back; a save is only reported as successful once the re-read confirms it.
- **Audit log** — every change to a franchise registration records actor, timestamp, field, old value and new value, surfaced in a per-record history panel.

Admin list endpoints for these screens run under a server-side authorisation check that admits every role authorised for franchise administration (including finance and sales roles, not only a single super-admin role). Role scoping that silently returns an empty list to an authorised operator is a defect.

### 3.4 Registration receipts

Multi-page, brand-styled PDF generated server-side (never assembled only in the browser) containing:

1. **Page 1 — Receipt**: brand header, receipt number, date, applicant details, plan, amount breakdown (fee, tax, total), payment mode, gateway reference, and payment status.
2. **Page 2 — Plan summary**: plan inclusions, territory, term, royalty and obligations.
3. **Page 3 — Business projections**: the projection table for the selected plan.
4. Terms, signature block and support contact.

Receipts are stored in object storage, downloadable from both the applicant's confirmation screen and the admin payment record, and emailed on generation. Generation is idempotent per payment.

## 4. Rider (delivery partner)

### 4.1 Onboarding

Registration, identity and address documents, driving licence, vehicle registration and insurance, bank/UPI details, and a background-check hook. Verification stages mirror vendor IDV. Approved riders receive rider-portal access.

### 4.2 Rider state

`offline → online_idle → assigned → en_route_pickup → at_pickup → picked_up → en_route_drop → at_drop → delivered → online_idle`, plus `on_break` and `suspended`. Shift start/end, break management, and a daily earnings summary.

### 4.3 Assignment and dispatch

Dispatch runs in `logistics-svc` with a scoring function over candidate riders:

```text
score = w1 × proximity_to_pickup
      + w2 × current_load_inverse
      + w3 × acceptance_rate
      + w4 × completion_rate
      + w5 × rating
      − w6 × recent_rejections
      − w7 × idle_penalty_or_fairness_adjustment
```
Weights are configuration. The algorithm supports:
- **Batching** — combining nearby orders from the same or adjacent pickups into one trip, bounded by a maximum detour and a maximum batch size.
- **Offer and accept** — an assignment is offered to the top candidate with a countdown; on timeout or rejection it cascades to the next.
- **Auto-assign** — for fleets configured without acceptance, the top candidate is assigned directly.
- **Manual override** — an operator may assign, reassign or unassign from the dispatch console, with the reason recorded.
- **Reassignment** on rider inactivity, repeated rejection, breakdown, or SLA breach.

### 4.4 Tracking

`tracking-svc` (Go) ingests location pings (batched, compressed, with client-side buffering during connectivity loss), snaps them to the active assignment, computes ETA, detects route deviation and geofence entry/exit at pickup and drop, and publishes updates to the realtime gateway for customer, vendor and operator views. Raw pings are downsampled for storage; the retained trace supports payout distance and dispute resolution.

### 4.5 Rider earnings

Per-delivery payout = base + per-km component + surge share + incentives + tips (tips pass through in full). Incentive programmes support daily/weekly delivery targets, peak-hour bonuses and streaks. Earnings roll up into a rider payout cycle with the same ledger discipline as vendor settlement. Cash-on-delivery collections create a rider cash-in-hand balance that must be reconciled against deposits; a rider over the configured cash ceiling is blocked from further COD assignments.

## 5. Courier and logistics dispatch

Beyond food and ecommerce delivery, the platform supports standalone courier jobs: a sender books a pickup and a drop with parcel details, the job is priced by distance, weight band and service level, dispatched through the same engine, and tracked identically. Fleet management covers vehicles, maintenance records, document expiry alerts, and driver-to-vehicle assignment. A live fleet map shows all active riders and jobs with filtering by zone, status and vehicle type.

## 6. Settlement

### 6.1 Vendor and provider settlement

- Settlement is computed per fulfilled order line, not per order: `payable = net_sale_value − commission − platform_fees − bearer_attributed_discounts − adjustments + reimbursements`.
- A **cooling period** (configurable per vendor, plan or category) delays eligibility until the return window has closed.
- A scheduled daily job aggregates eligible lines into settlement batches, generates statements, and initiates payouts through the payout driver.
- Every settlement links to its constituent order lines; every adjustment (penalty, chargeback, damage claim, manual credit) is a ledger entry with a reason and an actor.
- Vendors see a statement with opening balance, earnings, deductions, payouts and closing balance, downloadable as CSV and PDF.

### 6.2 Reconciliation

Three-way reconciliation between order records, gateway settlement reports and bank credits. Discrepancies raise exceptions into an operator queue. No settlement batch closes with unexplained variance.

## 7. Acceptance criteria

1. A duplicate mobile or email is rejected at registration for every portal, enforced at the database level.
2. A submitted service-provider application is visible in the service-vendor list immediately.
3. A public franchise or vendor registration succeeds without a session and returns field-specific errors on failure.
4. Public registration routes load directly at their URL on every configured host without redirect.
5. Every authorised admin role sees the full franchise registration list; none receives a silently empty result.
6. An admin edit is confirmed by re-reading the persisted row before being reported as saved, and appears in the audit log with old and new values.
7. Payment success always produces exactly one multi-page receipt, retrievable later from admin.
8. Two riders can never hold the same assignment; reassignment revokes the prior hold atomically.
9. Settlement totals reconcile to the penny against order lines and gateway reports.
