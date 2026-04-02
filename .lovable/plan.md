## Phase 1: Admin Image Upload Infrastructure
1. Create a `vendor-assets` storage bucket for product/service/category images
2. Build a reusable `ImageUploader` component that uploads to storage and returns the URL
3. Wire image upload into Product, Service, Category, and Banner admin modals

## Phase 2: Vendor Plans Database & Admin UI
1. **Migration**: Extend `property_plans` or create a new `vendor_plans` table with fields:
   - plan_name, plan_type (local/vip), price, validity_days
   - visibility_type (radius_based/city/state/pan_india), radius_km
   - commission_percentage, max_redemption_percentage
   - promotion_flags (banner_ads, video_ads, priority_listing)
2. Seed default plans: Basic, Standard, Premium, Bronze, Silver, Gold, Diamond, Platinum
3. Build Admin "Vendor Plans" management page
4. Link vendors to plans via `plan_id` column on vendors table

## Phase 3: Vendor Geo-location in KYC
1. Add latitude/longitude/address fields to `vendor_applications` table
2. Integrate Google Maps pin-drop (reuse existing customer location component) in vendor registration
3. Validate serviceable region (admin-configured radius)

## Phase 4: Distance-based Product Visibility
1. Add Haversine distance utility function
2. Update product listing to filter by vendor plan visibility type and user location
3. Add "X KM away" display and plan badges on product cards

## Phase 5: Inventory & Redemption Enhancements
1. Stock deduction on order success
2. Plan-based redemption percentage calculation at checkout
3. Promotion flag checks for banner/video ads

**Starting with Phases 1-3 in this session.**
