## Phase 1: Database Schema
- **service_bookings** table enhancements (completion_photo, otp_code, otp_verified, assigned_vendor_id, completion_status)
- **reviews** table (user_id, entity_type [product/service], entity_id, rating, comment, order_id/booking_id)
- **complaints** table (user_id, entity_type, entity_id, booking_id, category, description, status, priority, assigned_to, resolution_notes)
- **vendor_onboarding_screens** table (title, description, image_url, display_order, is_active)

## Phase 2: Wishlist on Service Pages
- Add wishlist heart icon to service cards (CustomerServicesPage, CustomerHomePage)
- Ensure all CTAs across customer pages are functional

## Phase 3: Vendor Onboarding Screens
- Generate vendor onboarding images
- Create admin management for vendor onboarding screens
- Add vendor splash + onboarding carousel in vendor app

## Phase 4: Service Booking Complete Flow
- Slot blocking (prevent double-booking)
- Payment via Razorpay for services
- Vendor assignment after booking

## Phase 5: Service Completion Workflow
- Vendor submits completion photo
- OTP generation & verification
- Customer rating popup after completion
- Photo visible to customer & admin

## Phase 6: Reviews & Ratings
- Review submission UI (1-5 stars + comment)
- Average rating calculation (DB function)
- Display reviews on service/product detail pages
- Rating-based vendor comparison

## Phase 7: Complaints System
- Quick complaint raising from service detail/booking
- Admin complaints dashboard with grouping/filtering
- Status tracking (open, in-progress, resolved, closed)
