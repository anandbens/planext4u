
# Query optimization — phased plan

## What the profiling shows

Top-30 slowest queries were pulled from `pg_stat_statements`. Findings:

- Existing indexes already cover most hot paths: products by status+created, orders by customer+status+created, points_transactions by user+created, customers by email/mobile (plain + trigram), etc.
- Two real index gaps remain (see Phase 1).
- The bigger win is client-side: ~60 files still use `select('*')` on wide tables (`products` 61 cols, `orders` 55 cols, `food_orders` 53 cols, `service_bookings` 53 cols, `vendor_applications` 44 cols). Payload is the dominant cost, not query planning.
- No feature is missing pagination outright — most already use `.range()` — but a few unbounded list fetches exist on admin pages.

## Why this is phased, not one sweep

The codebase has hundreds of `.from(...).select(...)` call sites across ~180 tables. Editing all of them in a single turn will silently break features (a component reads a column that got dropped from the select, a mapping fn returns `undefined`, etc.). Each phase below is independently shippable, independently reversible, and validated before the next starts.

## Phase 1 — Index gaps (single migration, ~2 min)

Add:
1. `service_categories(status, parent_id, display_order)` partial `WHERE parent_id IS NULL` — matches the 237-call category tree query.
2. `social_comments(post_id, created_at DESC)` — comment threads currently scan by post_id then sort in memory.
3. `food_orders(customer_id, status, created_at DESC)` — currently only single-column indexes.
4. `vendor_notifications(vendor_id, read_status, created_at DESC)` — for the "unread badge + list" pattern.

No structural changes, no data changes, no policy changes. Indexes only.

## Phase 2 — Narrow SELECTs on the 10 highest-traffic list views

Target only where the profile shows real cost and payload is wide. For each, replace `select('*')` with the columns the component actually reads, verified against JSX + downstream mappers:

1. `src/lib/api.ts` — products list (`title, image, price, mrp, status, category_name, vendor_name, vendor_id, slug, stock, unit, is_deal_of_day, created_at`) — currently 61 cols.
2. `src/lib/api.ts` — orders list for customer (`id, status, total, items, created_at, vendor_id, vendor_name`) — currently 55 cols.
3. `src/pages/customer/CustomerHomePage.tsx` — homepage feed selects.
4. `src/pages/customer/CustomerWishlistPage.tsx`.
5. `src/pages/customer/CustomerVendorPage.tsx` — vendor product grid.
6. `src/pages/CustomersPage.tsx` (admin) — grid columns only.
7. `src/pages/VendorsPage.tsx` (admin).
8. `src/pages/vendor/VendorProductsPage.tsx` — vendor's own product list.
9. `src/pages/vendor/VendorOrdersPage.tsx` — vendor's own order list.
10. `src/hooks/use-social-interactions.ts` — feed likes/comments joins.

Detail views (e.g. `ProductDetailPage`, `OrderDetailPage`) keep `select('*')` — they need the full row, and they're single-row fetches so payload doesn't matter.

## Phase 3 — Duplicate query dedup + explicit pagination caps

- `useCustomerBasics` fires `wallet_points` and `profile_photo` as two round-trips (see slow queries #14/#15, both ~1000 calls each). Merge into one selecting both columns.
- Search autocomplete (`products.title ilike ...`) triggers on every keystroke — add a 200ms debounce at the input.
- Admin `CustomersPage` and `VendorsPage` — enforce a hard `.range(0, 49)` default even if the caller forgets.

## Phase 4 — Validation

1. Re-pull `pg_stat_statements` — top-10 totals should drop noticeably.
2. Playwright smoke pass across the 15 features already covered by the existing regression harness.
3. Run `tests/load/k6-staged.js` at 100/500/1000 VUs against staging. p(95) budgets: <1000/<1500/<2500 ms. If Phase 2 lands cleanly, the payload reduction alone should keep p(95) inside budget at 500 VUs. **Cannot be run from the Lovable sandbox against production** — must run against a real staging deployment.

## What I will NOT do

- Change database schema (columns, types, constraints) — outside scope.
- Change business logic, RLS policies, or edge functions — outside scope.
- Touch `.select('*')` on single-row `.eq('id', ...).single()` fetches — no payload win.
- Add indexes speculatively for queries that aren't in the top-30 profile — index bloat has a real write cost.

## Technical notes

- Indexes are added via one migration; no `CREATE INDEX CONCURRENTLY` because migrations run in a transaction.
- Column-narrowing edits go through the API layer (`src/lib/api.ts`) where possible so callers don't drift.
- Every Phase-2 edit is preceded by grep of the returned object shape to confirm no consumer reads a dropped column.

## Deliverable per phase

| Phase | Output | Approval needed? |
|-------|--------|------------------|
| 1 | Index migration | Yes (migration approval flow) |
| 2 | ~10 file edits + regression run | No (code only) |
| 3 | ~5 file edits + debounce util | No |
| 4 | k6 report + slow-query re-pull | No |

Say "go phase 1" (or "go all phases") to start.
