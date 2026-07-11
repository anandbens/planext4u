
# Public Registration, Franchise Management & Multi-Page Receipts

Scope is large; splitting into 4 sequential phases so each is verifiable. Existing pieces I'll reuse: `PublicFranchiseRegistrationPage`, `VendorRegisterPage` (already extended with Plan & Payment step), `franchise_plans`, `franchise_registrations`, `active_franchises`, `payment_records`, `payment_receipts`, `AdminFranchisePlansPage`, `AdminFranchiseRegistrationsPage`, `AdminActiveFranchisesPage`, `AdminRegistrationPaymentsPage`, `src/lib/receipt-pdf.ts`, `src/lib/issue-receipt.ts`.

## Phase 1 — Database & Master Data

New/updated tables:
- `business_projection_master` — scenario, category (Micro/Mini/Master), investment, members, turnover, gross_profit, net_profit, share_pct, category_profit, spend_1/10/100/1000, sort_order, status.
- `franchise_plans` — verify Nano/Micro/Mini/Master seed rows with full plan detail fields (coverage_type, benefits[], features[], promotion_benefits, product_visibility, reward_benefits, redemption_benefits).
- `vendor_plans` — verify Local (Basic/Standard/Premium) + VIP (Bronze/Silver/Gold/Diamond/Platinum) rows with the same descriptive fields.
- `payment_records` — ensure fields: mode (UPI/NEFT/RTGS/IMPS/BankTransfer/Cash/Cheque), transaction_ref, amount, payment_date, remarks, status, outstanding.
- `payment_receipts` — receipt_no (sequence), pdf_path, regenerated_at.
- `platform_variables` seed: `company_bank_details` (name, a/c, IFSC, branch, address) for reuse across UIs and PDFs.

Grants + RLS on all new/updated tables. Seed the default plans and full 5×3 = 15 projection rows exactly per spec.

## Phase 2 — Public Registration UX Completion

- `/vendor/register` (existing): confirm Local vs VIP toggle; dynamically load plans from `vendor_plans`; render full benefits panel (Price, Validity, Coverage, Radius, Visibility, Promotion, Redemption, Reward, Key Features) — no hardcoded copy. Payment step shows Bank Details card + payment mode selector + advance/outstanding calc. On submit → row in `vendor_applications` (Pending Approval) + `payment_records` entry + auto-receipt if Paid.
- `/franchise/register` (existing): expand fields to full spec (Applicant, Company, Mobile, Email, Address, City, State, Pincode, Preferred Territory, Preferred Plan, Remarks). Plan selector reads `franchise_plans` and shows all benefits. Same bank + payment block. Save → `franchise_registrations` (Draft/Pending) + `payment_records` + receipt.
- Success page with Download / Print / Regenerate PDF actions.

## Phase 3 — Admin Franchise Management

Under `/admin/franchise/*` (sidebar group already exists):
- Franchise Plans (CRUD — already present; extend fields to full master).
- Franchise Registrations (list, view, approve → creates `active_franchises`, reject, convert).
- Active Franchises (list, view, edit, deactivate).
- Franchise Payments (dedicated tab pulling from `payment_records` scoped to franchise).
- Business Projection Master (new page, full CRUD, list grouped by scenario with inline edit).

All screens use existing admin table patterns: search, filter, pagination, CSV export, audit logging via `audit_logs`.

## Phase 4 — Multi-Page PDF Receipt

Rewrite `src/lib/receipt-pdf.ts` to emit up to 5 pages:
- Page 1: Payment Receipt (logo, company header, receipt#, dates, applicant/company, plan snapshot, amounts, txn info, status).
- Page 2: Plan Summary — pulled from Plan Master (name, validity, radius, territory, promotion, visibility, rewards, redemption, features).
- Pages 3-4 (franchise only): Business Projection tables per scenario, rendered from `business_projection_master`. No hardcoded numbers.
- Final Page: Disclaimer box (exact wording from spec).

Trigger: auto-generate when `payment_status = paid`; store path; expose Download / Print / Regenerate on Success page, Vendor Registration detail, Franchise Registration detail, and Payment History rows.

## Technical Details

- Reuse `issue-receipt.ts` — extend to accept `registration_type: 'vendor' | 'franchise'` and fetch projection rows for franchise.
- Receipt numbering via `receipt_sequences` (already present) with prefix `P4U/RCPT/YYYY/`.
- Bank details centralized in a single `BankDetailsCard` component reading from `platform_variables` so admin can edit without code changes.
- PDF uses existing branded HTML → jsPDF/html2canvas pipeline already in `orders-summary-pdf.ts`; share layout primitives.
- All plan/projection data fetched via React Query with 5-min stale; PDF renderer receives already-fetched data (no fetch inside canvas step).

## Deliverable Order

1. Migration + seeds (Phase 1).
2. Public registration polish + Bank card + auto-receipt hook (Phase 2).
3. Admin Business Projection Master + refinements to existing franchise admin pages (Phase 3).
4. Multi-page PDF generator + wiring across all download points (Phase 4).

Ready to start with the Phase 1 migration on approval.
