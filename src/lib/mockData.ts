// Shared mock data store - central place for all dummy data
// This acts as an in-memory database for the demo

export const MOCK_PRODUCTS = [
  { id: "PRD-001", vendor_id: "VND-001", category_id: "1", title: "Wireless Headphones Pro", description: "Premium wireless headphones with ANC, 30hr battery, BT 5.3. Features adaptive noise cancellation, spatial audio, and premium memory foam cushions for all-day comfort.", price: 2499, tax: 450, discount: 250, max_points_redeemable: 200, status: "active" as const, vendor_name: "TechMart", category_name: "Electronics", emoji: "🎧", rating: 4.8, reviews: 245, stock: 45, sales: 245, created_at: "2026-01-10T10:00:00Z", updated_at: "2026-03-10T14:30:00Z" },
  { id: "PRD-002", vendor_id: "VND-002", category_id: "2", title: "Cotton T-Shirt Pack", description: "Comfortable 100% cotton t-shirts, pack of 3. Pre-shrunk fabric, reinforced stitching, available in multiple colors.", price: 899, tax: 162, discount: 0, max_points_redeemable: 50, status: "active" as const, vendor_name: "FashionHub", category_name: "Fashion", emoji: "👕", rating: 4.5, reviews: 189, stock: 32, sales: 189, created_at: "2026-01-15T14:00:00Z", updated_at: "2026-03-08T09:00:00Z" },
  { id: "PRD-003", vendor_id: "VND-003", category_id: "3", title: "Ceramic Vase Set", description: "Handcrafted ceramic vases for home décor, set of 2. Each piece is unique with a matte finish and modern geometric design.", price: 1599, tax: 288, discount: 160, max_points_redeemable: 100, status: "active" as const, vendor_name: "HomeDecor", category_name: "Home", emoji: "🏺", rating: 4.7, reviews: 92, stock: 28, sales: 92, created_at: "2026-01-20T09:00:00Z", updated_at: "2026-03-05T11:00:00Z" },
  { id: "PRD-004", vendor_id: "VND-004", category_id: "1", title: "Smart Watch Pro", description: "Fitness tracking, heart rate, GPS, AMOLED display. Water resistant to 50m, 7-day battery life.", price: 4999, tax: 900, discount: 500, max_points_redeemable: 500, status: "active" as const, vendor_name: "GadgetWorld", category_name: "Electronics", emoji: "⌚", rating: 4.3, reviews: 328, stock: 18, sales: 328, created_at: "2026-02-01T11:20:00Z", updated_at: "2026-03-12T16:00:00Z" },
  { id: "PRD-005", vendor_id: "VND-005", category_id: "5", title: "Novel Collection Box", description: "Bestseller fiction collection, 5 books. Curated by literary experts, includes award-winning titles.", price: 1299, tax: 0, discount: 130, max_points_redeemable: 100, status: "active" as const, vendor_name: "BookStore Plus", category_name: "Books", emoji: "📖", rating: 4.9, reviews: 156, stock: 55, sales: 156, created_at: "2026-02-10T08:45:00Z", updated_at: "2026-03-01T10:00:00Z" },
  { id: "PRD-006", vendor_id: "VND-006", category_id: "6", title: "Organic Honey 500g", description: "Pure forest honey, unprocessed, lab tested. Sourced from the Western Ghats, raw and unfiltered.", price: 599, tax: 108, discount: 0, max_points_redeemable: 50, status: "active" as const, vendor_name: "GreenGrocer", category_name: "Food", emoji: "🍯", rating: 4.6, reviews: 78, stock: 65, sales: 78, created_at: "2026-02-18T16:00:00Z", updated_at: "2026-03-06T08:00:00Z" },
  { id: "PRD-007", vendor_id: "VND-001", category_id: "1", title: "Bluetooth Speaker Mini", description: "Portable speaker with 12hr battery, IPX7 waterproof. 360° surround sound with deep bass.", price: 1799, tax: 324, discount: 180, max_points_redeemable: 150, status: "active" as const, vendor_name: "TechMart", category_name: "Electronics", emoji: "🔊", rating: 4.5, reviews: 134, stock: 40, sales: 134, created_at: "2026-02-25T12:30:00Z", updated_at: "2026-03-11T15:00:00Z" },
  { id: "PRD-008", vendor_id: "VND-007", category_id: "8", title: "Yoga Mat Premium", description: "6mm thick, non-slip, eco-friendly TPE material. Includes carry strap and alignment markers.", price: 1999, tax: 360, discount: 200, max_points_redeemable: 150, status: "active" as const, vendor_name: "FitLife", category_name: "Sports", emoji: "🧘", rating: 4.4, reviews: 112, stock: 22, sales: 112, created_at: "2026-03-01T10:15:00Z", updated_at: "2026-03-09T14:00:00Z" },
  { id: "PRD-009", vendor_id: "VND-008", category_id: "9", title: "Dog Food Premium 5kg", description: "Grain-free, high protein, all breed sizes. Vet recommended with real chicken as first ingredient.", price: 2199, tax: 396, discount: 0, max_points_redeemable: 200, status: "active" as const, vendor_name: "PetCare", category_name: "Pets", emoji: "🐕", rating: 4.1, reviews: 67, stock: 35, sales: 67, created_at: "2026-03-05T14:00:00Z", updated_at: "2026-03-10T09:00:00Z" },
  { id: "PRD-010", vendor_id: "VND-009", category_id: "8", title: "Running Shoes Air", description: "Lightweight mesh, cushioned sole, breathable. Responsive foam technology for maximum energy return.", price: 3499, tax: 630, discount: 350, max_points_redeemable: 300, status: "active" as const, vendor_name: "SportsZone", category_name: "Sports", emoji: "👟", rating: 4.7, reviews: 201, stock: 15, sales: 201, created_at: "2026-03-05T14:00:00Z", updated_at: "2026-03-12T11:00:00Z" },
  { id: "PRD-011", vendor_id: "VND-001", category_id: "1", title: "USB-C Hub 7-in-1", description: "HDMI 4K, USB 3.0, SD card, PD charging. Aluminum body, plug-and-play, universal compatibility.", price: 1299, tax: 234, discount: 130, max_points_redeemable: 100, status: "inactive" as const, vendor_name: "TechMart", category_name: "Electronics", emoji: "🔌", rating: 4.2, reviews: 89, stock: 0, sales: 89, created_at: "2026-01-15T09:00:00Z", updated_at: "2026-03-01T10:00:00Z" },
  { id: "PRD-012", vendor_id: "VND-001", category_id: "1", title: "Mechanical Keyboard RGB", description: "Cherry MX switches, per-key RGB, aluminum body. Hot-swappable switches, PBT keycaps.", price: 3499, tax: 630, discount: 0, max_points_redeemable: 300, status: "draft" as const, vendor_name: "TechMart", category_name: "Electronics", emoji: "⌨️", rating: 0, reviews: 0, stock: 12, sales: 0, created_at: "2026-03-10T09:00:00Z", updated_at: "2026-03-10T09:00:00Z" },
];

// ===== SERVICES =====
export const MOCK_SERVICES = [
  { id: "SRV-001", vendor_id: "VND-011", category_id: "10", title: "Home Deep Cleaning", description: "Professional deep cleaning for 2BHK/3BHK homes. Includes kitchen, bathrooms, floors, and window cleaning.", price: 2499, tax: 450, discount: 250, max_points_redeemable: 200, status: "active" as const, vendor_name: "CleanPro Services", category_name: "Home Services", emoji: "🧹", rating: 4.8, reviews: 312, service_area: "Mumbai", duration: "4-5 hours", created_at: "2026-01-10T10:00:00Z" },
  { id: "SRV-002", vendor_id: "VND-012", category_id: "11", title: "AC Service & Repair", description: "Complete AC servicing including gas refill, jet cleaning, and filter replacement for split/window ACs.", price: 799, tax: 144, discount: 0, max_points_redeemable: 50, status: "active" as const, vendor_name: "CoolTech", category_name: "Appliance Repair", emoji: "❄️", rating: 4.6, reviews: 189, service_area: "Mumbai", duration: "1-2 hours", created_at: "2026-01-15T14:00:00Z" },
  { id: "SRV-003", vendor_id: "VND-013", category_id: "12", title: "Salon at Home - Women", description: "Professional salon services at your doorstep. Includes haircut, facial, waxing, manicure & pedicure.", price: 1999, tax: 360, discount: 200, max_points_redeemable: 150, status: "active" as const, vendor_name: "GlamSquad", category_name: "Beauty & Wellness", emoji: "💅", rating: 4.9, reviews: 456, service_area: "Mumbai", duration: "2-3 hours", created_at: "2026-01-20T09:00:00Z" },
  { id: "SRV-004", vendor_id: "VND-014", category_id: "13", title: "Plumbing - Tap & Pipe Repair", description: "Expert plumber for tap installation, pipe leak repair, bathroom fitting, and drainage solutions.", price: 399, tax: 72, discount: 0, max_points_redeemable: 30, status: "active" as const, vendor_name: "FixIt Home", category_name: "Home Repairs", emoji: "🔧", rating: 4.3, reviews: 234, service_area: "Mumbai", duration: "1-2 hours", created_at: "2026-02-05T11:00:00Z" },
  { id: "SRV-005", vendor_id: "VND-015", category_id: "14", title: "Pest Control - Full Home", description: "Comprehensive pest control for cockroaches, ants, bed bugs, and termites. Safe chemicals, 3-month warranty.", price: 1499, tax: 270, discount: 150, max_points_redeemable: 100, status: "active" as const, vendor_name: "BugFree India", category_name: "Pest Control", emoji: "🐛", rating: 4.5, reviews: 167, service_area: "Mumbai", duration: "2-3 hours", created_at: "2026-02-15T16:00:00Z" },
  { id: "SRV-006", vendor_id: "VND-011", category_id: "10", title: "Sofa & Carpet Cleaning", description: "Professional upholstery and carpet deep cleaning using steam technology. Removes stains, odor, and allergens.", price: 1299, tax: 234, discount: 130, max_points_redeemable: 100, status: "active" as const, vendor_name: "CleanPro Services", category_name: "Home Services", emoji: "🛋️", rating: 4.7, reviews: 98, service_area: "Mumbai", duration: "2-3 hours", created_at: "2026-02-25T08:00:00Z" },
  { id: "SRV-007", vendor_id: "VND-016", category_id: "15", title: "Yoga & Fitness Training", description: "Certified personal trainer for home sessions. Customized workout plans, yoga, and meditation.", price: 999, tax: 180, discount: 0, max_points_redeemable: 80, status: "active" as const, vendor_name: "FitGuru", category_name: "Fitness", emoji: "🏋️", rating: 4.8, reviews: 143, service_area: "Mumbai", duration: "1 hour", created_at: "2026-02-25T08:00:00Z" },
  { id: "SRV-008", vendor_id: "VND-012", category_id: "11", title: "Washing Machine Repair", description: "Expert repair for all brands. Drum issues, motor problems, water leakage, and part replacement.", price: 599, tax: 108, discount: 0, max_points_redeemable: 40, status: "active" as const, vendor_name: "CoolTech", category_name: "Appliance Repair", emoji: "🧺", rating: 4.4, reviews: 76, service_area: "Mumbai", duration: "1-2 hours", created_at: "2026-03-01T10:15:00Z" },
];

export const MOCK_SERVICE_VENDORS = [
  { id: "VND-011", name: "Suresh Patil", business_name: "CleanPro Services", mobile: "+91 99887 76553", email: "suresh@cleanpro.com", category_id: "10", city_id: "1", area_id: "1", commission_rate: 15, membership: "premium", status: "verified" as const, created_at: "2026-01-10T10:00:00Z", rating: 4.8, total_products: 5, total_orders: 890, total_revenue: 425000 },
  { id: "VND-012", name: "Rahul Verma", business_name: "CoolTech", mobile: "+91 99887 76554", email: "rahul@cooltech.com", category_id: "11", city_id: "1", area_id: "2", commission_rate: 12, membership: "basic", status: "verified" as const, created_at: "2026-01-15T14:00:00Z", rating: 4.6, total_products: 3, total_orders: 560, total_revenue: 245000 },
  { id: "VND-013", name: "Deepa Menon", business_name: "GlamSquad", mobile: "+91 99887 76555", email: "deepa@glamsquad.com", category_id: "12", city_id: "1", area_id: "3", commission_rate: 18, membership: "premium", status: "verified" as const, created_at: "2026-01-20T09:00:00Z", rating: 4.9, total_products: 8, total_orders: 1240, total_revenue: 680000 },
  { id: "VND-014", name: "Mohan Das", business_name: "FixIt Home", mobile: "+91 99887 76556", email: "mohan@fixithome.com", category_id: "13", city_id: "1", area_id: "4", commission_rate: 10, membership: "basic", status: "verified" as const, created_at: "2026-02-05T11:00:00Z", rating: 4.3, total_products: 4, total_orders: 780, total_revenue: 198000 },
  { id: "VND-015", name: "Anil Kumar", business_name: "BugFree India", mobile: "+91 99887 76557", email: "anil@bugfree.com", category_id: "14", city_id: "1", area_id: "5", commission_rate: 15, membership: "basic", status: "level2_approved" as const, created_at: "2026-02-15T16:00:00Z", rating: 4.5, total_products: 3, total_orders: 340, total_revenue: 145000 },
  { id: "VND-016", name: "Nisha Kapoor", business_name: "FitGuru", mobile: "+91 99887 76558", email: "nisha@fitguru.com", category_id: "15", city_id: "1", area_id: "1", commission_rate: 12, membership: "basic", status: "verified" as const, created_at: "2026-02-25T08:00:00Z", rating: 4.8, total_products: 2, total_orders: 420, total_revenue: 168000 },
];

export const MOCK_CUSTOMERS = [
  { id: "USR-001", name: "Rahul Sharma", mobile: "+91 98765 43210", email: "rahul@example.com", city_id: "1", area_id: "1", latitude: 19.076, longitude: 72.877, wallet_points: 1250, referral_code: "REF0001", referred_by: null, status: "active" as const, created_at: "2026-01-05T10:30:00Z", occupation: "Software Engineer" },
  { id: "USR-002", name: "Priya Patel", mobile: "+91 98765 43211", email: "priya@example.com", city_id: "1", area_id: "2", latitude: 19.054, longitude: 72.840, wallet_points: 890, referral_code: "REF0002", referred_by: "USR-001", status: "active" as const, created_at: "2026-01-12T14:20:00Z", occupation: "Doctor" },
  { id: "USR-003", name: "Amit Kumar", mobile: "+91 98765 43212", email: "amit@example.com", city_id: "1", area_id: "3", latitude: 19.117, longitude: 72.906, wallet_points: 2100, referral_code: "REF0003", referred_by: null, status: "active" as const, created_at: "2026-01-18T09:15:00Z", occupation: "Business Owner" },
  { id: "USR-004", name: "Sneha Reddy", mobile: "+91 98765 43213", email: "sneha@example.com", city_id: "1", area_id: "4", latitude: 19.103, longitude: 72.826, wallet_points: 450, referral_code: "REF0004", referred_by: "USR-001", status: "inactive" as const, created_at: "2026-01-25T11:45:00Z", occupation: "Teacher" },
  { id: "USR-005", name: "Vikram Singh", mobile: "+91 98765 43214", email: "vikram@example.com", city_id: "1", area_id: "5", latitude: 19.017, longitude: 72.856, wallet_points: 1800, referral_code: "REF0005", referred_by: null, status: "active" as const, created_at: "2026-02-02T16:30:00Z", occupation: "Chartered Accountant" },
  { id: "USR-006", name: "Anita Gupta", mobile: "+91 98765 43215", email: "anita@example.com", city_id: "1", area_id: "1", latitude: 19.076, longitude: 72.877, wallet_points: 320, referral_code: "REF0006", referred_by: "USR-003", status: "active" as const, created_at: "2026-02-10T08:00:00Z", occupation: "Homemaker" },
  { id: "USR-007", name: "Rajesh Nair", mobile: "+91 98765 43216", email: "rajesh@example.com", city_id: "1", area_id: "2", latitude: 19.054, longitude: 72.840, wallet_points: 50, referral_code: "REF0007", referred_by: null, status: "suspended" as const, created_at: "2026-02-15T13:10:00Z", occupation: "Lawyer" },
  { id: "USR-008", name: "Meera Joshi", mobile: "+91 98765 43217", email: "meera@example.com", city_id: "1", area_id: "3", latitude: 19.117, longitude: 72.906, wallet_points: 975, referral_code: "REF0008", referred_by: "USR-005", status: "active" as const, created_at: "2026-02-20T10:45:00Z", occupation: "Designer" },
  { id: "USR-009", name: "Karan Mehta", mobile: "+91 98765 43218", email: "karan@example.com", city_id: "1", area_id: "4", latitude: 19.103, longitude: 72.826, wallet_points: 1600, referral_code: "REF0009", referred_by: null, status: "active" as const, created_at: "2026-02-28T15:20:00Z", occupation: "Architect" },
  { id: "USR-010", name: "Pooja Iyer", mobile: "+91 98765 43219", email: "pooja@example.com", city_id: "1", area_id: "5", latitude: 19.017, longitude: 72.856, wallet_points: 700, referral_code: "REF0010", referred_by: "USR-003", status: "active" as const, created_at: "2026-03-05T09:30:00Z", occupation: "Student" },
];

export const MOCK_VENDORS = [
  { id: "VND-001", name: "Ravi Kumar", business_name: "TechMart", mobile: "+91 99887 76543", email: "ravi@techmart.com", category_id: "1", city_id: "1", area_id: "1", commission_rate: 8, membership: "premium", status: "verified" as const, created_at: "2026-01-02T10:00:00Z", rating: 4.8, total_products: 42, total_orders: 1240, total_revenue: 485000 },
  { id: "VND-002", name: "Sanjay Patel", business_name: "FashionHub", mobile: "+91 99887 76544", email: "sanjay@fashionhub.com", category_id: "2", city_id: "1", area_id: "2", commission_rate: 10, membership: "basic", status: "verified" as const, created_at: "2026-01-08T14:30:00Z", rating: 4.5, total_products: 38, total_orders: 980, total_revenue: 392000 },
  { id: "VND-003", name: "Neha Singh", business_name: "HomeDecor", mobile: "+91 99887 76545", email: "neha@homedecor.com", category_id: "3", city_id: "1", area_id: "3", commission_rate: 12, membership: "premium", status: "level2_approved" as const, created_at: "2026-01-15T09:00:00Z", rating: 4.7, total_products: 29, total_orders: 756, total_revenue: 321000 },
  { id: "VND-004", name: "Arjun Reddy", business_name: "GadgetWorld", mobile: "+91 99887 76546", email: "arjun@gadgetworld.com", category_id: "1", city_id: "1", area_id: "4", commission_rate: 8, membership: "basic", status: "pending" as const, created_at: "2026-02-01T11:20:00Z", rating: 4.3, total_products: 22, total_orders: 654, total_revenue: 278000 },
  { id: "VND-005", name: "Priya Sharma", business_name: "BookStore Plus", mobile: "+91 99887 76547", email: "priya@bookstoreplus.com", category_id: "5", city_id: "1", area_id: "5", commission_rate: 10, membership: "basic", status: "verified" as const, created_at: "2026-02-10T08:45:00Z", rating: 4.9, total_products: 55, total_orders: 520, total_revenue: 195000 },
  { id: "VND-006", name: "Deepak Gupta", business_name: "GreenGrocer", mobile: "+91 99887 76548", email: "deepak@greengrocer.com", category_id: "6", city_id: "1", area_id: "1", commission_rate: 15, membership: "premium", status: "level1_approved" as const, created_at: "2026-02-18T16:00:00Z", rating: 4.6, total_products: 18, total_orders: 340, total_revenue: 142000 },
  { id: "VND-007", name: "Anjali Nair", business_name: "FitLife", mobile: "+91 99887 76549", email: "anjali@fitlife.com", category_id: "8", city_id: "1", area_id: "2", commission_rate: 10, membership: "basic", status: "verified" as const, created_at: "2026-02-25T12:30:00Z", rating: 4.4, total_products: 15, total_orders: 280, total_revenue: 98000 },
  { id: "VND-008", name: "Rohit Joshi", business_name: "PetCare", mobile: "+91 99887 76550", email: "rohit@petcare.com", category_id: "9", city_id: "1", area_id: "3", commission_rate: 12, membership: "premium", status: "rejected" as const, created_at: "2026-03-01T10:15:00Z", rating: 4.1, total_products: 12, total_orders: 180, total_revenue: 65000 },
  { id: "VND-009", name: "Kavita Mehta", business_name: "SportsZone", mobile: "+91 99887 76551", email: "kavita@sportszone.com", category_id: "8", city_id: "1", area_id: "4", commission_rate: 10, membership: "basic", status: "verified" as const, created_at: "2026-03-05T14:00:00Z", rating: 4.7, total_products: 25, total_orders: 420, total_revenue: 156000 },
  { id: "VND-010", name: "Suresh Iyer", business_name: "ElectroParts", mobile: "+91 99887 76552", email: "suresh@electroparts.com", category_id: "1", city_id: "1", area_id: "5", commission_rate: 8, membership: "basic", status: "pending" as const, created_at: "2026-03-10T09:00:00Z", rating: 0, total_products: 0, total_orders: 0, total_revenue: 0 },
];

export const MOCK_ORDERS = [
  { id: "ORD-001", customer_id: "USR-001", vendor_id: "VND-001", subtotal: 2499, tax: 450, discount: 250, points_used: 0, total: 2699, status: "placed" as const, created_at: "2026-03-13T10:30:00Z", updated_at: "2026-03-13T10:30:00Z", customer_name: "Rahul Sharma", vendor_name: "TechMart", items: [{ title: "Wireless Headphones Pro", qty: 1, emoji: "🎧", price: 2499 }] },
  { id: "ORD-002", customer_id: "USR-002", vendor_id: "VND-002", subtotal: 1798, tax: 324, discount: 0, points_used: 100, total: 2022, status: "paid" as const, created_at: "2026-03-13T09:15:00Z", updated_at: "2026-03-13T09:30:00Z", customer_name: "Priya Patel", vendor_name: "FashionHub", items: [{ title: "Cotton T-Shirt Pack", qty: 2, emoji: "👕", price: 899 }] },
  { id: "ORD-003", customer_id: "USR-003", vendor_id: "VND-003", subtotal: 1599, tax: 288, discount: 160, points_used: 0, total: 1727, status: "delivered" as const, created_at: "2026-03-12T16:45:00Z", updated_at: "2026-03-13T08:00:00Z", customer_name: "Amit Kumar", vendor_name: "HomeDecor", items: [{ title: "Ceramic Vase Set", qty: 1, emoji: "🏺", price: 1599 }] },
  { id: "ORD-004", customer_id: "USR-004", vendor_id: "VND-001", subtotal: 1799, tax: 324, discount: 180, points_used: 50, total: 1893, status: "completed" as const, created_at: "2026-03-12T14:20:00Z", updated_at: "2026-03-13T06:00:00Z", customer_name: "Sneha Reddy", vendor_name: "TechMart", items: [{ title: "Bluetooth Speaker Mini", qty: 1, emoji: "🔊", price: 1799 }] },
  { id: "ORD-005", customer_id: "USR-005", vendor_id: "VND-004", subtotal: 4999, tax: 900, discount: 500, points_used: 0, total: 5399, status: "in_progress" as const, created_at: "2026-03-12T11:00:00Z", updated_at: "2026-03-12T14:00:00Z", customer_name: "Vikram Singh", vendor_name: "GadgetWorld", items: [{ title: "Smart Watch Pro", qty: 1, emoji: "⌚", price: 4999 }] },
  { id: "ORD-006", customer_id: "USR-006", vendor_id: "VND-005", subtotal: 1299, tax: 0, discount: 130, points_used: 0, total: 1169, status: "accepted" as const, created_at: "2026-03-11T15:30:00Z", updated_at: "2026-03-11T16:00:00Z", customer_name: "Anita Gupta", vendor_name: "BookStore Plus", items: [{ title: "Novel Collection Box", qty: 1, emoji: "📖", price: 1299 }] },
  { id: "ORD-007", customer_id: "USR-008", vendor_id: "VND-006", subtotal: 1198, tax: 216, discount: 0, points_used: 200, total: 1214, status: "completed" as const, created_at: "2026-03-11T10:00:00Z", updated_at: "2026-03-12T09:00:00Z", customer_name: "Meera Joshi", vendor_name: "GreenGrocer", items: [{ title: "Organic Honey 500g", qty: 2, emoji: "🍯", price: 599 }] },
  { id: "ORD-008", customer_id: "USR-009", vendor_id: "VND-007", subtotal: 1999, tax: 360, discount: 200, points_used: 0, total: 2159, status: "cancelled" as const, created_at: "2026-03-10T09:45:00Z", updated_at: "2026-03-10T10:00:00Z", customer_name: "Karan Mehta", vendor_name: "FitLife", items: [{ title: "Yoga Mat Premium", qty: 1, emoji: "🧘", price: 1999 }] },
  { id: "ORD-009", customer_id: "USR-010", vendor_id: "VND-009", subtotal: 3499, tax: 630, discount: 350, points_used: 100, total: 3679, status: "paid" as const, created_at: "2026-03-09T14:15:00Z", updated_at: "2026-03-09T15:00:00Z", customer_name: "Pooja Iyer", vendor_name: "SportsZone", items: [{ title: "Running Shoes Air", qty: 1, emoji: "👟", price: 3499 }] },
  { id: "ORD-010", customer_id: "USR-001", vendor_id: "VND-001", subtotal: 2598, tax: 468, discount: 260, points_used: 0, total: 2806, status: "placed" as const, created_at: "2026-03-09T08:30:00Z", updated_at: "2026-03-09T08:30:00Z", customer_name: "Rahul Sharma", vendor_name: "TechMart", items: [{ title: "USB-C Hub 7-in-1", qty: 2, emoji: "🔌", price: 1299 }] },
  { id: "ORD-011", customer_id: "USR-001", vendor_id: "VND-011", subtotal: 2499, tax: 450, discount: 250, points_used: 0, total: 2699, status: "completed" as const, created_at: "2026-03-08T09:00:00Z", updated_at: "2026-03-09T10:00:00Z", customer_name: "Rahul Sharma", vendor_name: "CleanPro Services", items: [{ title: "Home Deep Cleaning", qty: 1, emoji: "🧹", price: 2499 }] },
  { id: "ORD-012", customer_id: "USR-003", vendor_id: "VND-013", subtotal: 1999, tax: 360, discount: 200, points_used: 0, total: 2159, status: "in_progress" as const, created_at: "2026-03-13T11:00:00Z", updated_at: "2026-03-13T11:30:00Z", customer_name: "Amit Kumar", vendor_name: "GlamSquad", items: [{ title: "Salon at Home - Women", qty: 1, emoji: "💅", price: 1999 }] },
];

export const MOCK_SETTLEMENTS = [
  { id: "STL-001", vendor_id: "VND-001", order_id: "ORD-004", amount: 1893, commission: 151, net_amount: 1742, status: "settled" as const, settled_at: "2026-03-10T00:00:00Z", created_at: "2026-03-08T00:00:00Z", vendor_name: "TechMart" },
  { id: "STL-002", vendor_id: "VND-002", order_id: "ORD-002", amount: 2022, commission: 202, net_amount: 1820, status: "eligible" as const, settled_at: null, created_at: "2026-03-09T00:00:00Z", vendor_name: "FashionHub" },
  { id: "STL-003", vendor_id: "VND-003", order_id: "ORD-003", amount: 1727, commission: 207, net_amount: 1520, status: "pending" as const, settled_at: null, created_at: "2026-03-10T00:00:00Z", vendor_name: "HomeDecor" },
  { id: "STL-004", vendor_id: "VND-004", order_id: "ORD-005", amount: 5399, commission: 432, net_amount: 4967, status: "pending" as const, settled_at: null, created_at: "2026-03-11T00:00:00Z", vendor_name: "GadgetWorld" },
  { id: "STL-005", vendor_id: "VND-005", order_id: "ORD-006", amount: 1169, commission: 117, net_amount: 1052, status: "eligible" as const, settled_at: null, created_at: "2026-03-11T00:00:00Z", vendor_name: "BookStore Plus" },
  { id: "STL-006", vendor_id: "VND-006", order_id: "ORD-007", amount: 1214, commission: 182, net_amount: 1032, status: "settled" as const, settled_at: "2026-03-12T00:00:00Z", created_at: "2026-03-10T00:00:00Z", vendor_name: "GreenGrocer" },
  { id: "STL-007", vendor_id: "VND-001", order_id: "ORD-001", amount: 2699, commission: 216, net_amount: 2483, status: "pending" as const, settled_at: null, created_at: "2026-03-12T00:00:00Z", vendor_name: "TechMart" },
  { id: "STL-008", vendor_id: "VND-007", order_id: "ORD-008", amount: 2159, commission: 216, net_amount: 1943, status: "on_hold" as const, settled_at: null, created_at: "2026-03-12T00:00:00Z", vendor_name: "FitLife" },
  { id: "STL-009", vendor_id: "VND-009", order_id: "ORD-009", amount: 3679, commission: 368, net_amount: 3311, status: "eligible" as const, settled_at: null, created_at: "2026-03-09T00:00:00Z", vendor_name: "SportsZone" },
  { id: "STL-010", vendor_id: "VND-001", order_id: "ORD-010", amount: 2806, commission: 225, net_amount: 2581, status: "pending" as const, settled_at: null, created_at: "2026-03-09T00:00:00Z", vendor_name: "TechMart" },
];

export const MOCK_CLASSIFIEDS = [
  { id: "AD-001", title: "iPhone 14 Pro 256GB", description: "1 year old, excellent condition, all accessories included", price: 65000, category: "Electronics", city: "Mumbai", area: "Andheri", images: [], user_id: "USR-001", status: "pending" as const, created_at: "2026-03-13T08:00:00Z", user_name: "Rahul Sharma" },
  { id: "AD-002", title: "Honda Civic 2023 Automatic", description: "Single owner, 15k km driven, full insurance", price: 1200000, category: "Vehicles", city: "Mumbai", area: "Bandra", images: [], user_id: "USR-002", status: "approved" as const, created_at: "2026-03-12T10:30:00Z", user_name: "Priya Patel" },
  { id: "AD-003", title: "2BHK Flat for Rent Powai", description: "Furnished, lake view, near Hiranandani, parking", price: 45000, category: "Real Estate", city: "Mumbai", area: "Powai", images: [], user_id: "USR-003", status: "approved" as const, created_at: "2026-03-11T14:00:00Z", user_name: "Amit Kumar" },
  { id: "AD-004", title: "MacBook Air M2 2023", description: "Mint condition, 256GB, 8GB RAM, charger included", price: 89000, category: "Electronics", city: "Mumbai", area: "Juhu", images: [], user_id: "USR-004", status: "pending" as const, created_at: "2026-03-10T11:15:00Z", user_name: "Sneha Reddy" },
  { id: "AD-005", title: "L-Shape Sofa Set", description: "6 seater, fabric, 2 years old, no damage", price: 35000, category: "Furniture", city: "Mumbai", area: "Dadar", images: [], user_id: "USR-005", status: "approved" as const, created_at: "2026-03-09T09:30:00Z", user_name: "Vikram Singh" },
  { id: "AD-006", title: "Yamaha Guitar Acoustic", description: "F310 model, with bag and picks, barely used", price: 12000, category: "Music", city: "Mumbai", area: "Worli", images: [], user_id: "USR-006", status: "rejected" as const, created_at: "2026-03-08T16:45:00Z", user_name: "Anita Gupta" },
  { id: "AD-007", title: "MTB Bicycle 21-Speed", description: "Hero Sprint, front suspension, disc brakes", price: 8000, category: "Sports", city: "Mumbai", area: "Malad", images: [], user_id: "USR-007", status: "approved" as const, created_at: "2026-03-07T12:00:00Z", user_name: "Rajesh Nair" },
  { id: "AD-008", title: "PS5 Console + 3 Games", description: "Digital edition, 2 controllers, great condition", price: 45000, category: "Gaming", city: "Mumbai", area: "Goregaon", images: [], user_id: "USR-008", status: "expired" as const, created_at: "2026-03-06T10:30:00Z", user_name: "Meera Joshi" },
  { id: "AD-009", title: "Study Table with Shelf", description: "Engineered wood, adjustable shelf, compact design", price: 5500, category: "Furniture", city: "Mumbai", area: "Thane", images: [], user_id: "USR-009", status: "approved" as const, created_at: "2026-03-05T08:00:00Z", user_name: "Karan Mehta" },
  { id: "AD-010", title: "Gold Necklace 22K 15g", description: "Traditional design, with hallmark certificate", price: 120000, category: "Jewelry", city: "Mumbai", area: "Navi Mumbai", images: [], user_id: "USR-010", status: "sold" as const, created_at: "2026-03-04T14:00:00Z", user_name: "Pooja Iyer" },
];

export const MOCK_POINTS_TRANSACTIONS = [
  { id: "PT-001", user_id: "USR-001", type: "welcome" as const, points: 200, description: "Welcome bonus on registration", created_at: "2026-01-05T10:30:00Z", user_name: "Rahul Sharma" },
  { id: "PT-002", user_id: "USR-001", type: "referral" as const, points: 100, description: "Referral reward: Priya Patel joined", created_at: "2026-01-12T14:20:00Z", user_name: "Rahul Sharma" },
  { id: "PT-003", user_id: "USR-002", type: "welcome" as const, points: 200, description: "Welcome bonus on registration", created_at: "2026-01-12T14:20:00Z", user_name: "Priya Patel" },
  { id: "PT-004", user_id: "USR-003", type: "welcome" as const, points: 200, description: "Welcome bonus on registration", created_at: "2026-01-18T09:15:00Z", user_name: "Amit Kumar" },
  { id: "PT-005", user_id: "USR-001", type: "order_reward" as const, points: 54, description: "2% reward on order ORD-001", created_at: "2026-03-13T10:30:00Z", user_name: "Rahul Sharma" },
  { id: "PT-006", user_id: "USR-001", type: "referral" as const, points: 100, description: "Referral reward: Sneha Reddy joined", created_at: "2026-01-25T11:45:00Z", user_name: "Rahul Sharma" },
  { id: "PT-007", user_id: "USR-005", type: "welcome" as const, points: 200, description: "Welcome bonus on registration", created_at: "2026-02-02T16:30:00Z", user_name: "Vikram Singh" },
  { id: "PT-008", user_id: "USR-003", type: "referral" as const, points: 100, description: "Referral reward: Anita Gupta joined", created_at: "2026-02-10T08:00:00Z", user_name: "Amit Kumar" },
  { id: "PT-009", user_id: "USR-005", type: "order_reward" as const, points: 108, description: "2% reward on order ORD-005", created_at: "2026-03-12T11:00:00Z", user_name: "Vikram Singh" },
  { id: "PT-010", user_id: "USR-003", type: "referral" as const, points: 100, description: "Referral reward: Pooja Iyer joined", created_at: "2026-03-05T09:30:00Z", user_name: "Amit Kumar" },
];

export const MOCK_REFERRALS = [
  { id: "REF-001", referrer_id: "USR-001", referee_id: "USR-002", status: "completed" as const, points_awarded: 100, created_at: "2026-01-12T14:20:00Z", referrer_name: "Rahul Sharma", referee_name: "Priya Patel" },
  { id: "REF-002", referrer_id: "USR-001", referee_id: "USR-004", status: "completed" as const, points_awarded: 100, created_at: "2026-01-25T11:45:00Z", referrer_name: "Rahul Sharma", referee_name: "Sneha Reddy" },
  { id: "REF-003", referrer_id: "USR-003", referee_id: "USR-006", status: "completed" as const, points_awarded: 100, created_at: "2026-02-10T08:00:00Z", referrer_name: "Amit Kumar", referee_name: "Anita Gupta" },
  { id: "REF-004", referrer_id: "USR-005", referee_id: "USR-008", status: "completed" as const, points_awarded: 100, created_at: "2026-02-20T10:45:00Z", referrer_name: "Vikram Singh", referee_name: "Meera Joshi" },
  { id: "REF-005", referrer_id: "USR-003", referee_id: "USR-010", status: "pending" as const, points_awarded: 0, created_at: "2026-03-05T09:30:00Z", referrer_name: "Amit Kumar", referee_name: "Pooja Iyer" },
];

export const MOCK_CATEGORIES = [
  { id: "1", name: "Electronics", parent_id: null, image: "⚡", status: "active" as const, count: 4520, created_at: "2025-12-01T10:00:00Z" },
  { id: "2", name: "Fashion", parent_id: null, image: "👗", status: "active" as const, count: 3890, created_at: "2025-12-01T10:00:00Z" },
  { id: "3", name: "Home & Living", parent_id: null, image: "🏠", status: "active" as const, count: 2750, created_at: "2025-12-01T10:00:00Z" },
  { id: "5", name: "Books", parent_id: null, image: "📚", status: "active" as const, count: 1820, created_at: "2025-12-01T10:00:00Z" },
  { id: "6", name: "Food & Grocery", parent_id: null, image: "🍕", status: "active" as const, count: 1450, created_at: "2025-12-05T10:00:00Z" },
  { id: "8", name: "Sports & Fitness", parent_id: null, image: "🏃", status: "active" as const, count: 980, created_at: "2025-12-10T10:00:00Z" },
  { id: "9", name: "Pets", parent_id: null, image: "🐾", status: "active" as const, count: 420, created_at: "2025-12-15T10:00:00Z" },
];

export const MOCK_SERVICE_CATEGORIES = [
  { id: "10", name: "Home Services", parent_id: null, image: "🏠", status: "active" as const, count: 890, created_at: "2025-12-01T10:00:00Z" },
  { id: "11", name: "Appliance Repair", parent_id: null, image: "🔧", status: "active" as const, count: 560, created_at: "2025-12-01T10:00:00Z" },
  { id: "12", name: "Beauty & Wellness", parent_id: null, image: "💆", status: "active" as const, count: 1240, created_at: "2025-12-05T10:00:00Z" },
  { id: "13", name: "Home Repairs", parent_id: null, image: "🔨", status: "active" as const, count: 780, created_at: "2025-12-10T10:00:00Z" },
  { id: "14", name: "Pest Control", parent_id: null, image: "🛡️", status: "active" as const, count: 340, created_at: "2025-12-15T10:00:00Z" },
  { id: "15", name: "Fitness", parent_id: null, image: "💪", status: "active" as const, count: 420, created_at: "2025-12-20T10:00:00Z" },
];

export const MOCK_BANNERS = [
  { id: "1", title: "Summer Sale — Up to 50% Off", desktop_image: "", mobile_image: "", link: "/sale", priority: 1, start_date: "2026-03-01", end_date: "2026-03-31", status: "active" as const, subtitle: "On electronics, fashion & more", gradient: "from-primary to-primary/70", created_at: "2026-02-25T10:00:00Z" },
  { id: "2", title: "Free Delivery on First Order", desktop_image: "", mobile_image: "", link: "/new", priority: 2, start_date: "2026-03-01", end_date: "2026-04-30", status: "active" as const, subtitle: "Use code: WELCOME", gradient: "from-success to-success/70", created_at: "2026-02-25T10:00:00Z" },
  { id: "3", title: "Book Home Services", desktop_image: "", mobile_image: "", link: "/app/services", priority: 3, start_date: "2026-03-01", end_date: "2026-06-30", status: "active" as const, subtitle: "Cleaning, repairs, beauty & more", gradient: "from-info to-info/70", created_at: "2026-02-28T10:00:00Z" },
  { id: "4", title: "Diwali Special Offers", desktop_image: "", mobile_image: "", link: "/diwali", priority: 4, start_date: "2026-10-15", end_date: "2026-11-15", status: "inactive" as const, subtitle: "Coming soon", gradient: "from-warning to-warning/70", created_at: "2026-02-28T10:00:00Z" },
];

export const MOCK_PLATFORM_VARIABLES = [
  { id: "1", key: "welcome_points", value: "200", description: "Points given to new customers on registration" },
  { id: "2", key: "referral_points", value: "100", description: "Points awarded for successful referral" },
  { id: "3", key: "settlement_cooling_days", value: "7", description: "Days before settlement becomes eligible" },
  { id: "4", key: "razorpay_sandbox", value: "true", description: "Razorpay sandbox mode toggle" },
  { id: "5", key: "order_reward_rate", value: "2", description: "Percentage of order value as loyalty points" },
  { id: "6", key: "max_points_per_order", value: "500", description: "Maximum points redeemable per order" },
  { id: "7", key: "auto_settlement_enabled", value: "false", description: "Enable automatic daily settlements" },
  { id: "8", key: "auto_settlement_days", value: "7", description: "Days after order completion for auto settlement" },
];

export const MOCK_CLASSIFIED_CATEGORIES = ["Electronics", "Vehicles", "Real Estate", "Furniture", "Music", "Sports", "Gaming", "Jewelry", "Books", "Fashion"];

// ===== NEW DATA FOR MISSING MODULES =====

export const MOCK_OCCUPATIONS = [
  { id: "OCC-001", name: "Software Engineer", status: "active" as const, customer_count: 3, created_at: "2025-12-01T10:00:00Z" },
  { id: "OCC-002", name: "Doctor", status: "active" as const, customer_count: 1, created_at: "2025-12-01T10:00:00Z" },
  { id: "OCC-003", name: "Business Owner", status: "active" as const, customer_count: 1, created_at: "2025-12-01T10:00:00Z" },
  { id: "OCC-004", name: "Teacher", status: "active" as const, customer_count: 1, created_at: "2025-12-05T10:00:00Z" },
  { id: "OCC-005", name: "Chartered Accountant", status: "active" as const, customer_count: 1, created_at: "2025-12-05T10:00:00Z" },
  { id: "OCC-006", name: "Homemaker", status: "active" as const, customer_count: 1, created_at: "2025-12-10T10:00:00Z" },
  { id: "OCC-007", name: "Lawyer", status: "active" as const, customer_count: 1, created_at: "2025-12-10T10:00:00Z" },
  { id: "OCC-008", name: "Designer", status: "active" as const, customer_count: 1, created_at: "2025-12-15T10:00:00Z" },
  { id: "OCC-009", name: "Architect", status: "active" as const, customer_count: 1, created_at: "2025-12-15T10:00:00Z" },
  { id: "OCC-010", name: "Student", status: "active" as const, customer_count: 1, created_at: "2025-12-20T10:00:00Z" },
  { id: "OCC-011", name: "Retired", status: "active" as const, customer_count: 0, created_at: "2026-01-05T10:00:00Z" },
  { id: "OCC-012", name: "Freelancer", status: "inactive" as const, customer_count: 0, created_at: "2026-01-10T10:00:00Z" },
];

export const MOCK_CITIES = [
  { id: "1", name: "Mumbai", state: "Maharashtra", status: "active" as const, area_count: 5, created_at: "2025-11-01T10:00:00Z" },
  { id: "2", name: "Delhi", state: "Delhi", status: "active" as const, area_count: 4, created_at: "2025-11-01T10:00:00Z" },
  { id: "3", name: "Bangalore", state: "Karnataka", status: "active" as const, area_count: 3, created_at: "2025-11-15T10:00:00Z" },
  { id: "4", name: "Pune", state: "Maharashtra", status: "active" as const, area_count: 3, created_at: "2025-12-01T10:00:00Z" },
  { id: "5", name: "Chennai", state: "Tamil Nadu", status: "inactive" as const, area_count: 2, created_at: "2025-12-15T10:00:00Z" },
];

export const MOCK_AREAS = [
  { id: "1", name: "Andheri", city_id: "1", city_name: "Mumbai", pincode: "400058", status: "active" as const, created_at: "2025-11-01T10:00:00Z" },
  { id: "2", name: "Bandra", city_id: "1", city_name: "Mumbai", pincode: "400050", status: "active" as const, created_at: "2025-11-01T10:00:00Z" },
  { id: "3", name: "Powai", city_id: "1", city_name: "Mumbai", pincode: "400076", status: "active" as const, created_at: "2025-11-15T10:00:00Z" },
  { id: "4", name: "Juhu", city_id: "1", city_name: "Mumbai", pincode: "400049", status: "active" as const, created_at: "2025-11-15T10:00:00Z" },
  { id: "5", name: "Dadar", city_id: "1", city_name: "Mumbai", pincode: "400014", status: "active" as const, created_at: "2025-12-01T10:00:00Z" },
  { id: "6", name: "Connaught Place", city_id: "2", city_name: "Delhi", pincode: "110001", status: "active" as const, created_at: "2025-11-01T10:00:00Z" },
  { id: "7", name: "Hauz Khas", city_id: "2", city_name: "Delhi", pincode: "110016", status: "active" as const, created_at: "2025-11-01T10:00:00Z" },
  { id: "8", name: "Dwarka", city_id: "2", city_name: "Delhi", pincode: "110075", status: "active" as const, created_at: "2025-12-01T10:00:00Z" },
  { id: "9", name: "Vasant Kunj", city_id: "2", city_name: "Delhi", pincode: "110070", status: "inactive" as const, created_at: "2025-12-15T10:00:00Z" },
  { id: "10", name: "Koramangala", city_id: "3", city_name: "Bangalore", pincode: "560034", status: "active" as const, created_at: "2025-11-15T10:00:00Z" },
  { id: "11", name: "Indiranagar", city_id: "3", city_name: "Bangalore", pincode: "560038", status: "active" as const, created_at: "2025-11-15T10:00:00Z" },
  { id: "12", name: "Whitefield", city_id: "3", city_name: "Bangalore", pincode: "560066", status: "active" as const, created_at: "2025-12-01T10:00:00Z" },
];

export const MOCK_TAX_CONFIG = [
  { id: "TAX-001", name: "GST 18%", rate: 18, type: "GST" as const, status: "active" as const, applied_to: "Products", created_at: "2025-11-01T10:00:00Z" },
  { id: "TAX-002", name: "GST 12%", rate: 12, type: "GST" as const, status: "active" as const, applied_to: "Services", created_at: "2025-11-01T10:00:00Z" },
  { id: "TAX-003", name: "GST 5%", rate: 5, type: "GST" as const, status: "active" as const, applied_to: "Food & Grocery", created_at: "2025-11-15T10:00:00Z" },
  { id: "TAX-004", name: "Cess 1%", rate: 1, type: "Cess" as const, status: "active" as const, applied_to: "Electronics", created_at: "2025-12-01T10:00:00Z" },
  { id: "TAX-005", name: "GST 28%", rate: 28, type: "GST" as const, status: "inactive" as const, applied_to: "Luxury", created_at: "2025-12-15T10:00:00Z" },
];

export const MOCK_POPUP_BANNERS = [
  { id: "PB-001", title: "Welcome Offer!", description: "Get 200 points on your first order", image: "", link: "/app/browse", status: "active" as const, start_date: "2026-03-01", end_date: "2026-03-31", created_at: "2026-02-25T10:00:00Z" },
  { id: "PB-002", title: "Flash Sale", description: "50% off on electronics today only", image: "", link: "/app/browse?category=electronics", status: "active" as const, start_date: "2026-03-13", end_date: "2026-03-14", created_at: "2026-03-12T10:00:00Z" },
  { id: "PB-003", title: "Rate Us!", description: "Share your experience and win rewards", image: "", link: "#", status: "inactive" as const, start_date: "2026-04-01", end_date: "2026-04-30", created_at: "2026-03-10T10:00:00Z" },
];

export const MOCK_ADVERTISEMENTS = [
  { id: "ADV-001", title: "Premium Banner Ad - Homepage", advertiser: "Samsung India", placement: "Homepage Top", type: "banner" as const, status: "active" as const, impressions: 45200, clicks: 1205, start_date: "2026-03-01", end_date: "2026-03-31", revenue: 15000, created_at: "2026-02-25T10:00:00Z" },
  { id: "ADV-002", title: "Sidebar Ad - Browse Page", advertiser: "Nike India", placement: "Browse Sidebar", type: "sidebar" as const, status: "active" as const, impressions: 32100, clicks: 890, start_date: "2026-03-01", end_date: "2026-04-30", revenue: 12000, created_at: "2026-02-28T10:00:00Z" },
  { id: "ADV-003", title: "Sponsored Product Listing", advertiser: "Apple Reseller", placement: "Product Grid", type: "sponsored" as const, status: "active" as const, impressions: 28500, clicks: 1520, start_date: "2026-03-05", end_date: "2026-03-20", revenue: 25000, created_at: "2026-03-01T10:00:00Z" },
  { id: "ADV-004", title: "Service Page Banner", advertiser: "Urban Company", placement: "Services Top", type: "banner" as const, status: "paused" as const, impressions: 12300, clicks: 340, start_date: "2026-02-15", end_date: "2026-03-15", revenue: 8000, created_at: "2026-02-10T10:00:00Z" },
  { id: "ADV-005", title: "Footer Ad Strip", advertiser: "Flipkart", placement: "Footer", type: "strip" as const, status: "expired" as const, impressions: 56000, clicks: 1890, start_date: "2026-02-01", end_date: "2026-02-28", revenue: 18000, created_at: "2026-01-25T10:00:00Z" },
];

export const MOCK_WEBSITE_QUERIES = [
  { id: "WQ-001", name: "Ravi Patel", email: "ravi@gmail.com", phone: "+91 98765 00001", subject: "Partnership Inquiry", message: "We would like to partner as a vendor on your platform. Please share details.", status: "new" as const, created_at: "2026-03-13T09:00:00Z" },
  { id: "WQ-002", name: "Suman Devi", email: "suman@yahoo.com", phone: "+91 98765 00002", subject: "Refund Issue", message: "I have not received my refund for order ORD-045. It's been 15 days.", status: "in_progress" as const, created_at: "2026-03-12T14:30:00Z" },
  { id: "WQ-003", name: "Kunal Shah", email: "kunal@outlook.com", phone: "+91 98765 00003", subject: "Bulk Order Inquiry", message: "Can I place bulk orders for corporate gifting? Need 500 units.", status: "resolved" as const, created_at: "2026-03-11T10:15:00Z" },
  { id: "WQ-004", name: "Meena K", email: "meena@gmail.com", phone: "+91 98765 00004", subject: "Account Deletion", message: "Please delete my account and all associated data as per GDPR.", status: "new" as const, created_at: "2026-03-10T16:45:00Z" },
  { id: "WQ-005", name: "Aditya M", email: "aditya@company.com", phone: "+91 98765 00005", subject: "API Integration", message: "We want to integrate your product catalog API with our ERP system.", status: "in_progress" as const, created_at: "2026-03-09T11:00:00Z" },
  { id: "WQ-006", name: "Pooja R", email: "pooja@domain.com", phone: "+91 98765 00006", subject: "Service Complaint", message: "The plumber sent for my booking was unprofessional. Very disappointed.", status: "resolved" as const, created_at: "2026-03-08T08:30:00Z" },
];

export const MOCK_REPORT_LOG = [
  { id: "RL-001", report_type: "Sales Report", generated_by: "Admin", format: "CSV", status: "completed" as const, file_size: "2.4 MB", created_at: "2026-03-13T10:00:00Z" },
  { id: "RL-002", report_type: "Vendor Performance", generated_by: "Admin", format: "PDF", status: "completed" as const, file_size: "1.8 MB", created_at: "2026-03-12T14:30:00Z" },
  { id: "RL-003", report_type: "Customer Report", generated_by: "Admin", format: "CSV", status: "completed" as const, file_size: "3.1 MB", created_at: "2026-03-11T09:15:00Z" },
  { id: "RL-004", report_type: "Tax Report", generated_by: "Admin", format: "PDF", status: "failed" as const, file_size: "0 MB", created_at: "2026-03-10T16:00:00Z" },
  { id: "RL-005", report_type: "Settlement Report", generated_by: "Admin", format: "CSV", status: "completed" as const, file_size: "1.2 MB", created_at: "2026-03-09T11:45:00Z" },
  { id: "RL-006", report_type: "Points Report", generated_by: "Admin", format: "CSV", status: "processing" as const, file_size: "0 MB", created_at: "2026-03-13T12:00:00Z" },
];
