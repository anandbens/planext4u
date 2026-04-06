## Phase 1: Database Schema Changes

### 1.1 Product Attributes Master System
- Create `product_attributes` table (id, name, type, sort_order, is_active) — e.g. Color, Size, Weight, Volume
- Create `product_attribute_values` table (id, attribute_id, value, sort_order) — e.g. Red, Blue, S, M, L, 500ml
- Seed with comprehensive ecommerce attributes (Color, Size, Weight, Volume, Material, Pattern, etc.)

### 1.2 Product Schema Updates
- Add `short_description`, `long_description` columns to products
- Add `discount_type` column (enum: 'fixed' | 'percentage')
- Add `inactivation_reason` column
- Add `product_attribute_values` JSONB column for storing selected attributes per product

### 1.3 Tax Slabs Table
- Create `tax_slabs` table (id, name, rate, is_active) — e.g. GST 0%, 5%, 12%, 18%, 28%
- Products will reference tax slab instead of free-text tax

### 1.4 Vendor Media
- Use existing `vendor-assets` bucket with vendor-specific folder paths (vendor-id/products/, vendor-id/logos/, etc.)
- Add vendor_id to media_library table entries for ownership filtering

## Phase 2: Vendor Media Library
- Add media library page to vendor portal (reuse admin component with vendor_id filter)
- Vendor can only see/manage their own uploads
- Folder structure: products/, logos/, backgrounds/, icons/

## Phase 3: Product Creation/Edit Updates
- **Admin & Vendor**: Multi-image upload via media library picker
- **Tax**: Dropdown from tax_slabs table
- **Discount**: Toggle between Fixed (₹) and Percentage (%), show calculated values
- **Icon**: Pick from media library
- **Descriptions**: Short + Long description fields
- **Attributes**: Multi-select attributes with values

## Phase 4: Edit Restrictions for Vendors
- Approved products: vendor can only edit images, price, discount, status
- Status change to inactive requires reason (modal prompt)
- All other fields locked after approval

## Phase 5: Frontend Discount Display
- Calculate & show MRP, selling price, and discount % on product cards and detail pages
- Works for both fixed and percentage discount types

## Phase 6: Admin Attribute Management
- Admin page to manage product attributes and their values (CRUD)
- Integrated into existing admin navigation
