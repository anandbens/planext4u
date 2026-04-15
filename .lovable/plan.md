## Phase 1: Database Schema ✅
- **service_bookings** table enhancements (completion_photo, otp_code, otp_verified, assigned_vendor_id, completion_status)
- **reviews** table (user_id, entity_type [product/service], entity_id, rating, comment, order_id/booking_id)
- **complaints** table (user_id, entity_type, entity_id, booking_id, category, description, status, priority, assigned_to, resolution_notes)
- **vendor_onboarding_screens** table (title, description, image_url, display_order, is_active)
- **orders** table shipping columns (shipping_type, courier_name, tracking_number, tracking_url, shipping_notes, pod_confirmed, pod_confirmed_at)

## Phase 2: Wishlist on Service Pages ✅
- Add wishlist heart icon to service cards (CustomerServicesPage, CustomerHomePage)
- Ensure all CTAs across customer pages are functional

## Phase 3: Vendor Onboarding Screens ✅

## Phase 4: Service Booking Complete Flow
- Slot blocking (prevent double-booking)
- Payment via Razorpay for services
- Vendor assignment after booking

## Phase 5: Rich Text Editor + Shipping Flow ✅
- Rich text editor preview/edit toggle mode
- Vendor shipping flow: Own Delivery vs Courier Partner selection with structured fields
- Admin order modal: Same shipping flow with courier details
- Customer order detail: Shipping info display with tracking link
- Order grid: Shipping type and POD columns

## Phase 6: POD + Product/Service Rating System (NEXT)
- Product POD: 3-step popup (Delivery Confirmation → Product Reviews → Seller Rating)
- POD is mandatory, ratings are skippable
- Product reviews saved to reviews table, shown on product detail page
- Service POD: Vendor photo upload + Customer confirmation popup
- Service rating and seller rating (skippable)
- Show reviews with usernames on product/service detail pages

## Phase 7: Complaints System
- Quick complaint raising from service detail/booking
- Admin complaints dashboard with grouping/filtering
- Status tracking (open, in-progress, resolved, closed)
