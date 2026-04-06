
## WooCommerce-Like Product Management System

### Phase 1: Database Schema Redesign

**1.1 Update `products` table**
- Add `product_type` enum: `simple`, `variable`, `service`
- Add `sku`, `slug` (unique, SEO-friendly)
- Add `meta_title`, `meta_description` (SEO)
- Add `manage_stock` boolean, `stock_status` enum
- Add `weight`, `dimensions` JSONB
- Keep existing fields (price, tax, discount, etc.)

**1.2 Create `product_variants` table**
- `id`, `product_id` (FK → products), `sku` (unique)
- `price`, `compare_at_price` (MRP)
- `stock_quantity`, `stock_status`
- `weight`, `dimensions`
- `variant_attributes` JSONB — e.g. `{"Color": "Red", "Size": "M"}`
- `image_url`, `is_active`, `sort_order`
- Unique constraint on `(product_id, variant_attributes)` to prevent duplicates

**1.3 Create `product_variant_images` table**
- `id`, `variant_id` (FK → product_variants)
- `image_url`, `sort_order`, `is_primary`

**1.4 Rename existing tables for clarity**
- Keep `product_attributes` (global master: Color, Size, Weight, etc.)
- Keep `product_attribute_values` (master values: Red, Blue, S, M, L)
- Create `product_attribute_map` — links attributes to a specific product (which attributes apply to this product)

**1.5 Create `inventory_log` table**
- `id`, `product_id`, `variant_id`, `change_qty`, `reason`, `created_at`
- Tracks stock changes for audit

### Phase 2: Admin — Attribute & Variant Management

- Update `AdminProductAttributesPage` with:
  - Color attribute values show **hex color** field + swatch preview
  - Size values show display labels
- Update `ProductModal` (admin):
  - Product type selector (Simple / Variable / Service)
  - **Simple**: single price, stock, SKU
  - **Variable**: select applicable attributes → auto-generate variant combinations
  - **Service**: duration fields, no stock
  - Variant table: inline edit price, stock, SKU, image per variant
  - Bulk variant generation from attribute combinations
  - SEO fields (slug, meta title, meta description)

### Phase 3: Vendor Portal — Product Management

- Vendor product creation mirrors admin but scoped to own products
- Select category → system shows applicable attributes
- Auto-generate variants from selected attribute values
- Manage stock per variant
- Vendor can only edit allowed fields on approved products

### Phase 4: Customer Frontend — Attribute Selection

- **Color swatches**: circular color buttons with hex values
- **Size selector**: pill/chip buttons (S, M, L, XL)
- **Other attributes**: dropdown selectors
- Only show **available combinations** (in-stock variants)
- When user selects Color=Red → only show sizes available for Red
- Price updates dynamically based on selected variant
- Image changes based on variant selection

### Phase 5: Filtering & Search

- Category page: faceted filtering by attributes (Color, Size, Price range)
- Attribute filters are dynamic based on products in category
- Server-side pagination with attribute filters

### Phase 6: Integrations

- Razorpay: already integrated — variant price flows to checkout
- Loyalty points: `max_redemption_percentage` per product (inherited by variants)
- Geo filter: existing vendor distance logic applies

### Phase 7: Performance & Validation

- Cache categories & attributes with React Query stale times
- Unique constraint on variant attribute combinations per product
- No duplicate global attributes (unique name constraint)
- Slug auto-generation with uniqueness check
- API-first: all operations via Supabase client

### Migration Strategy
- Non-breaking: existing simple products get `product_type = 'simple'`
- No data loss: existing price/stock fields remain on products table as defaults
- Variants are additive — simple products don't need variants
