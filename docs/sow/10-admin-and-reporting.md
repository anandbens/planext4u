# 10 — Admin, Configuration and Reporting

Owner: `admin-bff` + `platform-svc` (configuration, CMS, audit, reporting read models). Admin never talks to a service database directly; it consumes the same service APIs as every other client, through the admin BFF.

## 1. Admin shell

- Left navigation grouped by domain: Dashboard, Catalog, Orders, Customers, Vendors, Franchise, Food, Homes, Socio, Classifieds, Services, Logistics, Promotions, Payments & Settlements, Advertisements, Content, Reports, Configuration, Security, System.
- Global search across orders, customers, vendors, products and registrations.
- Every list screen has the same contract: server-side pagination, server-side sorting, a filter panel, saved filter presets, column chooser, bulk actions, row-level actions, and CSV + PDF export of the **filtered** result set (not just the visible page).
- Every detail screen has an activity/audit tab.

## 2. Multi-language admin (i18n)

- Admin UI strings live in locale bundles keyed by a stable identifier; no user-visible string is hardcoded in a component.
- Supported locales are configuration; the initial set is English plus the operator-selected regional languages, with fallback to English for missing keys.
- Locale is resolved per user profile, overridable per session; number, currency and date formatting follow the locale, and currency follows the country context rather than the locale.
- Right-to-left support is a layout requirement, not a translation-only concern.
- Content translation (categories, CMS pages, notification templates, emails) is a separate mechanism: translatable entities carry a per-locale translation row, with an admin editor showing source and target side by side and marking stale translations when the source changes.

## 3. Platform configuration

A central, typed, versioned configuration store (`platform_variables` equivalent) drives runtime behaviour without deployment. Categories:

| Group | Examples |
|---|---|
| Commerce | commission defaults, tax classes, currency, rounding, return windows, cooling periods |
| Wallet | earn rates, expiry period, max redemption percent and absolute cap |
| Delivery | zone defaults, per-km rates, surge rules, free-delivery thresholds |
| Content | home banners, splash screens, promotional strips, popup campaigns |
| Mobile | minimum supported app version per platform, force-update messaging, store URLs |
| Integrations | enabled payment gateways, SMS provider, maps provider, analytics IDs, bot toggles |
| Feature flags | per-module and per-country enablement, gradual rollout percentages |

Rules: every value is typed and validated; every change is audited with old and new values; changes are effective-dated where they affect money; a change never rewrites already-snapshotted historical values. Secrets are referenced **by name**, resolved from the secret store at runtime, and never displayed or exported.

### 3.1 Mandatory app update
`min_app_version` per platform is compared against the native client's reported version at launch and on resume. A client below the minimum receives a blocking overlay with the store link and cannot proceed. A soft-update threshold shows a dismissible prompt.

### 3.2 Dynamic assets
Home banners, splash screens, category art and promotional imagery are configuration-driven, not bundled. Splash screens are drawn from an active set with a short branded delay and randomised selection where multiple are active. All assets follow the media standard and carry explicit dimensions to avoid layout shift.

## 4. Content management

- **CMS pages** — legal and informational content (terms, privacy, refund policy, about, FAQ, help articles) with slug, locale, rich-text body, publish state, and SEO metadata. Rendered on web and inside the apps.
- **Notification and email templates** — per channel and locale, with a declared variable set, a preview renderer, and versioning.
- **Master data** — countries, states, districts, cities, localities, categories, attributes, amenities, occupations, cancellation reasons, report reasons, tax classes and HSN codes; each with import/export and change auditing. District is the canonical level for city-style selection.

## 5. Advertisements

- **Placements** — feed banner (injected after every 4 organic items in Socio), home hero, category strip, search result slot, order-tracking slot, and app-builder widget slots.
- **Creatives** — image **and video**, with separate desktop and mobile assets, an optional video thumbnail/poster, click-through target, and alt text. Every creative field must be optional-safe: missing video, mobile variant or poster must never break the modal, the banner or the feed.
- **Campaigns** — advertiser, budget, schedule, targeting (geography, module, category, audience segment, platform), frequency capping, and priority.
- **Delivery and measurement** — impressions, viewable impressions, clicks, CTR and conversions attributed through a click identifier; reporting per campaign, placement and creative.
- Video creatives autoplay muted, loop, and respect data-saver settings; a poster image renders immediately as a fallback.

## 6. Audit logging

- Every create, update and delete on an administratively significant entity writes an audit record: actor id and role, impersonation chain if any, timestamp, service, entity type and id, action, changed fields with old and new values, request id, IP and user agent.
- Sensitive values (bank details, documents, tokens) are recorded as changed-but-masked.
- Audit records are append-only and retained per the retention policy; they are queryable by actor, entity, action and date range, and exportable.
- Soft deletion renames unique identifiers with a `_DEL_` suffix so the unique constraint remains satisfied while the record stays recoverable and auditable.

## 7. Analytics dashboards

Rendered with **Chart.js** against pre-aggregated read models, never against live transactional tables.

| Dashboard | Content |
|---|---|
| Executive | GMV, net revenue, orders, AOV, active customers, new customers, cancellation and return rate, take rate — with period comparison |
| Revenue overview | Revenue by module, category, vendor, geography and payment method; trend lines and stacked composition |
| Points trend | Points issued, redeemed, expired and outstanding liability over time |
| Operations | Order funnel by status, SLA breach rate, average preparation and delivery times, rider utilisation, zone heat map |
| Vendor performance | Top vendors by GMV, ratings, cancellation rate, fulfilment SLA, settlement ageing |
| Customer analytics | Cohort retention, repeat rate, lifetime value, RFM segments, churn indicators |
| Marketing | Coupon and campaign performance, cost of discount, referral funnel, ad performance |
| Module dashboards | Food, Homes, Socio, Classifieds and Services each with their own operating metrics |

Aggregations are maintained incrementally by event consumers into daily and hourly rollups, partitioned by date, with a scheduled backfill/repair job. Dashboard queries must complete within the latency budget in `00-overview.md`.

## 8. Reports with drill-down

All reports share one framework: a parameter bar (date range, country, module, vendor, category, geography, status), a summary strip, a grid, and export to CSV and branded PDF. Every aggregate cell is **drillable** — clicking descends from summary → group → transaction → source document, each level preserving the parent filters and remaining exportable.

### 8.1 Report catalogue

| Report | Grouping | Key columns |
|---|---|---|
| Sales report | Date / vendor / category / geography | Order no, date, customer, **customer mobile**, vendor, items, subtotal, discount, **discount code**, tax, delivery, **grand total**, payment mode, status |
| Order detail | Transaction | Full order lines with per-line tax, discount and commission |
| Daybook | Date | Opening balance, receipts, payments, closing balance by account head |
| Settlement report | Vendor / cycle | Gross, commission, fees, discounts borne, adjustments, TDS, net payable, payout status |
| Commission report | Vendor / category / product | Applicable rate, rate source (the cascade level), base, commission earned |
| Payment reconciliation | Gateway / date | Captured, refunded, chargebacks, gateway fees, settled to bank, variance |
| Wallet / points ledger | Customer / date | Issued, redeemed, expired, outstanding liability |
| Coupon performance | Campaign / code | Issued, reserved, redeemed, rolled back, discount value, bearer split, incremental orders |
| Inventory / stock movement | Product / vendor | Opening, in, out, adjustments, closing, valuation |
| Customer report | Customer | Orders, GMV, returns, points balance, last order, segment |
| Vendor report | Vendor | Onboarding date, plan, catalogue size, GMV, ratings, SLA, settlement ageing |
| Rider report | Rider | Deliveries, distance, earnings, cash in hand, acceptance and completion rates |
| Delivery performance | Zone / date | Orders, on-time %, average delivery minutes, surge incidence, cancellations |
| Franchise report | Franchise / territory | Registrations, payments, plan, status, territory performance |
| Refund and return | Reason / category | Volume, value, bearer, turnaround time |

### 8.2 Statutory reports (India)

| Report | Content |
|---|---|
| **GSTR-1** | B2B, B2C large and B2C small invoice tables; credit/debit notes; HSN summary; document series — in the prescribed layout and export format |
| **GSTR-3B** | Summary of outward supplies, inward supplies liable to reverse charge, ITC and tax payable |
| **GSTR-9** | Annual consolidation of the above with reconciliation to books |
| **HSN summary** | HSN, description, UQC, quantity, taxable value, CGST/SGST/IGST/cess |
| **TCS (Sec 52)** | Per-vendor net taxable supplies through the platform and TCS collected, in the GSTR-8 shape |
| **TDS 194-O** | Per-vendor gross amount, TDS deducted, PAN, quarter — in the return-filing layout |
| **E-invoice / e-way bill registers** | Where thresholds apply, with IRN and e-way bill numbers where the integration is enabled |

All statutory outputs are generated from immutable order and invoice snapshots, must be regenerable for any past period with identical results, and record who generated them and when.

### 8.3 Export requirements

- **CSV** — the full filtered result set, streamed for large exports, with a stable column order matching the on-screen grid. Formula injection must be prevented by prefixing any cell beginning with `=`, `+`, `-` or `@`.
- **PDF** — brand-styled (logo, colours, report title, parameter summary, generated-by, page numbers), multi-page with repeating headers, and containing the same columns as the grid including discount code, subtotal and grand total so it is usable directly for settlement.
- Large exports run as background jobs producing a downloadable artefact with a notification on completion, rather than blocking the request.

## 9. Operations consoles

- **Dispatch console** — live map of riders and jobs, manual assignment and reassignment, SLA breach queue.
- **Moderation queue** — unified across Socio, Homes, Classifieds and reviews, with reason taxonomy, bulk actions and appeals.
- **Support console** — the ticketing system: tickets with category, priority, SLA timer, assignment, internal notes, customer-visible replies, attachments and linked entities (order, booking, listing). Tickets are visible only to their owner and authorised staff.
- **Fraud console** — rule management, flagged entities, review outcomes and blocklists.
- **Impersonation** — a controlled "view as user" mode, time-boxed, banner-visible, fully audited, and unavailable for privileged accounts.

## 10. Security administration

Role and permission management, staff invitations, session and device management, API key issuance for partners, IP allow-listing for privileged roles, mandatory MFA for administrative roles, and a security event log.

## 11. Acceptance criteria

1. Every list export contains exactly the filtered rows, not the current page.
2. Every drill-down level preserves parent filters and reconciles to its parent total.
3. Statutory reports regenerated for a closed period produce byte-identical output.
4. No administrative mutation exists without a corresponding audit record containing old and new values.
5. Configuration changes take effect without deployment and never alter historical snapshots.
6. Every admin string is translatable and the UI renders correctly in a right-to-left locale.
