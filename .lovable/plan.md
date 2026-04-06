## Phase 1: Vendor Plans & Commission (This session)
1. Replace "Membership" dropdown with "Vendor Plans" in admin VendorModal
2. Wire commission/redemption logic to plan settings
3. Add "P4U Commission Rate" label, max redemption override at product level

## Phase 2: Product Image Carousel & Multi-image Support
1. Support multiple images in product listings (carousel slider)
2. Product detail page carousel for multiple images
3. Same for services

## Phase 3: Categories & Subcategories System
1. Add `parent_id` based subcategory support to existing categories/service_categories tables
2. Admin CRUD for categories + subcategories with tag-style chips
3. Bulk upload (CSV/JSON), deduplication, active/inactive toggle
4. Wire vendor registration to category/subcategory selection
5. Frontend: category → subcategory → products flow

## Phase 4: Radius-based Product Visibility (DB function)
1. Create PostgreSQL function for Haversine distance filtering
2. Add bounding-box pre-filter + indexes on vendor lat/lng
3. Update product listing API to filter by customer's default address
4. Show "Results within X km" in UI
5. Recalculate on address change

## Phase 5: Socio Enhancements
1. Fix stories horizontal scroll + viewing others' stories
2. Video upload from camera + gallery with H.264 compression
3. Separate storage bucket for socio videos
4. Ensure all socio features work end-to-end

## Phase 6: Category-level Enhancements
1. Category-based commission configuration
2. Category-level promotions & banners
3. Map categories to vendor discovery + geo filtering