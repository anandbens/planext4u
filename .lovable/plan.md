# Franchise Management Module & Payment Receipt Generation

This is a large, multi-part enhancement. I'll deliver it in ordered phases so each part is reviewable, testable, and preserves the existing Vendor Management flow. Nothing existing is removed.

## Phase 1 — Database Schema (Lovable Cloud migration)

New tables (all with RLS + admin/service_role grants, following existing vendor pattern):

1. **franchise_plans** — Plan master
   - name, category, investment_amount, security_deposit, delivery_radius_km
   - coverage_type (radius | city | district | state)
   - validity_months, description, benefits (jsonb array), features (jsonb array)
   - commission_structure (jsonb, future use), status (active/inactive)

2. **franchise_registrations** — Applications
   - registration_no (auto: `P4U-FR-REG-YYYY-######`)
   - applicant_name, company_name, email, mobile, address, city, district, state, pincode
   - plan_id → franchise_plans, requested_territory
   - status: draft | pending | approved | rejected | converted | closed
   - approved_by, approved_at, rejection_reason, notes

3. **active_franchises** — Post-approval records
   - franchise_id (auto: `P4U-FR-YYYY-######`)
   - registration_id, plan_id, owner_name, company_name, contact info
   - territory, coverage details, started_at, expires_at
   - status: active | suspended | expired | cancelled

4. **payment_records** — Unified payment history for both vendor & franchise
   - entity_type ('vendor' | 'franchise'), entity_id (uuid)
   - plan_amount, amount_paid, balance (generated column)
   - payment_status (paid | pending | partial)
   - payment_mode (upi | bank_transfer | neft | rtgs | cash | cheque)
   - transaction_ref, payment_date, remarks, received_by

5. **payment_receipts** — Generated receipts
   - receipt_no (auto: `P4U-VR-YYYY-######` or `P4U-FR-YYYY-######`)
   - entity_type, entity_id, payment_record_id
   - snapshot (jsonb — frozen plan + payment data at time of generation)
   - pdf_url (optional, if we cache), issued_at, issued_by

6. **receipt_sequences** — Yearly counters for receipt numbering (atomic RPC).

RPCs:
- `generate_receipt_number(entity_type, year)` — atomic sequence.
- `convert_registration_to_franchise(registration_id)` — creates active_franchise row + audit log.

Seed 4 default plans: Nano, Micro, Mini, Master (values from spec). Admin can fully modify.

## Phase 2 — Admin UI: Franchise Management Menu

Add new top-level admin menu **Franchise Management** with three sub-pages, mirroring the Vendors module structure/components:

- `/admin/franchise/plans` — CRUD grid for franchise_plans
- `/admin/franchise/registrations` — CRUD + approve/reject/convert/print
- `/admin/franchise/active` — Manage active franchises (edit, suspend, reactivate, change plan, renew, view payments/territory/documents)

Reuse existing shadcn table/grid, modal, form, and filter components from Vendor pages. Same pagination, search, filters, role-based permissions.

## Phase 3 — Payment Recording (Vendor + Franchise)

- Add a **Payment** section to Vendor Registration form and Franchise Registration form:
  - Payment Status, Amount Paid, Txn Ref, Payment Date, Payment Mode, Remarks
  - Auto-computed Plan Amount / Advance Paid / Remaining Balance
- Every save writes to `payment_records` (full history, not overwrite).
- Payment History tab on both Vendor detail and Franchise detail pages.

## Phase 4 — Receipt Generation

- Utility `src/lib/receipt-pdf.ts` — branded PDF (jsPDF/html2pdf, same stack as existing `orders-summary-pdf.ts`).
- Receipt content: P4U logo, company name `PLANEXT4U ALL SOLUTIONS INDIA PRIVATE LIMITED`, receipt no, date, applicant, company, registration no, category, selected plan, plan amount, amount paid, balance, txn ref, payment mode, payment date, status, received by, footer.
- **Plan summary block** — dynamically pulls benefits/features/coverage from plan master (vendor_plans or franchise_plans). Nothing hardcoded.
- Trigger: when payment_status flips to `paid`, auto-create a `payment_receipts` row + open PDF.
- Buttons: Download PDF / Print / Re-download — available to admin (both modules), vendor (self), franchise (self). Always regenerates from latest DB snapshot.

## Phase 5 — Notifications

- On `paid`: insert into vendor/customer notifications, optionally email receipt via existing email queue (`send-transactional-email` if email is configured for the entity).
- Toast confirmation in admin UI.

## Phase 6 — QA

- Verify: create plan → create registration → record payment → mark paid → receipt PDF opens with correct plan summary → approve → convert to active franchise → renew/suspend flows.
- Backward compat: existing Vendor Management pages untouched aside from the additive Payment section + Download Receipt button.

## Technical notes

- All plan/benefit/coverage data read live from `franchise_plans` / `vendor_plans` — no constants.
- Receipt numbers atomic via sequence table + RPC to avoid duplicates under concurrency.
- Follows existing patterns: `src/lib/api.ts` field whitelisting, semantic tokens, `RichTextEditor` for descriptions/benefits, Radix Select non-empty values, mobile safe-area, audit_logs on every CRUD.

## Delivery order

1. Migration (Phase 1) — needs your approval before I can run it.
2. Admin UI for Franchise Plans (Phase 2a).
3. Admin UI for Registrations + Active Franchises (Phase 2b).
4. Payment recording on Vendor + Franchise (Phase 3).
5. Receipt PDF + download buttons (Phase 4).
6. Notifications + polish (Phase 5–6).

Reply **approve** to start with the migration, or tell me any changes (field names, statuses, receipt layout, numbering format) you want first.
