// Shared mock data store with localStorage persistence
// Acts as an in-memory database that survives page refreshes

import { loadStore, saveStore } from './persist';

// ===== DEFAULT DATA =====

const DEFAULT_PRODUCTS = [
  { id: "PRD-001", vendor_id: "VND-001", category_id: "1", title: "Wireless Headphones Pro", description: "Premium wireless headphones with ANC, 30hr battery, BT 5.3. Features adaptive noise cancellation, spatial audio, and premium memory foam cushions for all-day comfort.", price: 2499, tax: 450, discount: 250, max_points_redeemable: 200, status: "active" as const, vendor_name: "TechMart", category_name: "Electronics", emoji: "🎧", image: "/images/products/wireless-headphones.jpg", rating: 4.8, reviews: 245, stock: 45, sales: 245, created_at: "2026-01-10T10:00:00Z", updated_at: "2026-03-10T14:30:00Z" },
  { id: "PRD-002", vendor_id: "VND-002", category_id: "2", title: "Cotton T-Shirt Pack", description: "Comfortable 100% cotton t-shirts, pack of 3. Pre-shrunk fabric, reinforced stitching, available in multiple colors.", price: 899, tax: 162, discount: 0, max_points_redeemable: 50, status: "active" as const, vendor_name: "FashionHub", category_name: "Fashion", emoji: "👕", image: "/images/products/tshirt-pack.jpg", rating: 4.5, reviews: 189, stock: 32, sales: 189, created_at: "2026-01-15T14:00:00Z", updated_at: "2026-03-08T09:00:00Z" },
  { id: "PRD-003", vendor_id: "VND-003", category_id: "3", title: "Ceramic Vase Set", description: "Handcrafted ceramic vases for home décor, set of 2. Each piece is unique with a matte finish and modern geometric design.", price: 1599, tax: 288, discount: 160, max_points_redeemable: 100, status: "active" as const, vendor_name: "HomeDecor", category_name: "Home & Living", emoji: "🏺", image: "/images/products/ceramic-vase.jpg", rating: 4.7, reviews: 92, stock: 28, sales: 92, created_at: "2026-01-20T09:00:00Z", updated_at: "2026-03-05T11:00:00Z" },
  { id: "PRD-004", vendor_id: "VND-004", category_id: "1", title: "Smart Watch Pro", description: "Fitness tracking, heart rate, GPS, AMOLED display. Water resistant to 50m, 7-day battery life.", price: 4999, tax: 900, discount: 500, max_points_redeemable: 500, status: "active" as const, vendor_name: "GadgetWorld", category_name: "Electronics", emoji: "⌚", image: "/images/products/smartwatch.jpg", rating: 4.3, reviews: 328, stock: 18, sales: 328, created_at: "2026-02-01T11:20:00Z", updated_at: "2026-03-12T16:00:00Z" },
  { id: "PRD-005", vendor_id: "VND-005", category_id: "5", title: "Novel Collection Box", description: "Bestseller fiction collection, 5 books. Curated by literary experts, includes award-winning titles.", price: 1299, tax: 0, discount: 130, max_points_redeemable: 100, status: "active" as const, vendor_name: "BookStore Plus", category_name: "Books", emoji: "📖", image: "/images/products/books.jpg", rating: 4.9, reviews: 156, stock: 55, sales: 156, created_at: "2026-02-10T08:45:00Z", updated_at: "2026-03-01T10:00:00Z" },
  { id: "PRD-006", vendor_id: "VND-006", category_id: "6", title: "Organic Honey 500g", description: "Pure forest honey, unprocessed, lab tested. Sourced from the Western Ghats, raw and unfiltered.", price: 599, tax: 108, discount: 0, max_points_redeemable: 50, status: "active" as const, vendor_name: "GreenGrocer", category_name: "Food & Grocery", emoji: "🍯", image: "/images/products/honey.jpg", rating: 4.6, reviews: 78, stock: 65, sales: 78, created_at: "2026-02-18T16:00:00Z", updated_at: "2026-03-06T08:00:00Z" },
  { id: "PRD-007", vendor_id: "VND-001", category_id: "1", title: "Bluetooth Speaker Mini", description: "Portable speaker with 12hr battery, IPX7 waterproof. 360° surround sound with deep bass.", price: 1799, tax: 324, discount: 180, max_points_redeemable: 150, status: "active" as const, vendor_name: "TechMart", category_name: "Electronics", emoji: "🔊", image: "/images/products/bluetooth-speaker.jpg", rating: 4.5, reviews: 134, stock: 40, sales: 134, created_at: "2026-02-25T12:30:00Z", updated_at: "2026-03-11T15:00:00Z" },
  { id: "PRD-008", vendor_id: "VND-007", category_id: "8", title: "Yoga Mat Premium", description: "6mm thick, non-slip, eco-friendly TPE material. Includes carry strap and alignment markers.", price: 1999, tax: 360, discount: 200, max_points_redeemable: 150, status: "active" as const, vendor_name: "FitLife", category_name: "Sports & Fitness", emoji: "🧘", image: "/images/products/yoga-mat.jpg", rating: 4.4, reviews: 112, stock: 22, sales: 112, created_at: "2026-03-01T10:15:00Z", updated_at: "2026-03-09T14:00:00Z" },
  { id: "PRD-009", vendor_id: "VND-008", category_id: "9", title: "Dog Food Premium 5kg", description: "Grain-free, high protein, all breed sizes. Vet recommended with real chicken as first ingredient.", price: 2199, tax: 396, discount: 0, max_points_redeemable: 200, status: "active" as const, vendor_name: "PetCare", category_name: "Pets", emoji: "🐕", image: "/images/products/dog-food.jpg", rating: 4.1, reviews: 67, stock: 35, sales: 67, created_at: "2026-03-05T14:00:00Z", updated_at: "2026-03-10T09:00:00Z" },
  { id: "PRD-010", vendor_id: "VND-009", category_id: "8", title: "Running Shoes Air", description: "Lightweight mesh, cushioned sole, breathable. Responsive foam technology for maximum energy return.", price: 3499, tax: 630, discount: 350, max_points_redeemable: 300, status: "active" as const, vendor_name: "SportsZone", category_name: "Sports & Fitness", emoji: "👟", image: "/images/products/running-shoes.jpg", rating: 4.7, reviews: 201, stock: 15, sales: 201, created_at: "2026-03-05T14:00:00Z", updated_at: "2026-03-12T11:00:00Z" },
  { id: "PRD-011", vendor_id: "VND-001", category_id: "1", title: "USB-C Hub 7-in-1", description: "HDMI 4K, USB 3.0, SD card, PD charging. Aluminum body, plug-and-play, universal compatibility.", price: 1299, tax: 234, discount: 130, max_points_redeemable: 100, status: "inactive" as const, vendor_name: "TechMart", category_name: "Electronics", emoji: "🔌", image: "/images/products/usb-hub.jpg", rating: 4.2, reviews: 89, stock: 0, sales: 89, created_at: "2026-01-15T09:00:00Z", updated_at: "2026-03-01T10:00:00Z" },
  { id: "PRD-012", vendor_id: "VND-001", category_id: "1", title: "Mechanical Keyboard RGB", description: "Cherry MX switches, per-key RGB, aluminum body. Hot-swappable switches, PBT keycaps.", price: 3499, tax: 630, discount: 0, max_points_redeemable: 300, status: "active" as const, vendor_name: "TechMart", category_name: "Electronics", emoji: "⌨️", image: "/images/products/keyboard.jpg", rating: 4.6, reviews: 78, stock: 12, sales: 78, created_at: "2026-03-10T09:00:00Z", updated_at: "2026-03-10T09:00:00Z" },
  { id: "PRD-013", vendor_id: "VND-004", category_id: "1", title: "Laptop Pro 15-inch", description: "Intel i7, 16GB RAM, 512GB SSD, 15.6\" FHD IPS display. Perfect for professionals and creators.", price: 54999, tax: 9900, discount: 5500, max_points_redeemable: 500, status: "active" as const, vendor_name: "GadgetWorld", category_name: "Electronics", emoji: "💻", image: "/images/products/laptop.jpg", rating: 4.7, reviews: 312, stock: 8, sales: 312, created_at: "2026-01-05T10:00:00Z", updated_at: "2026-03-12T09:00:00Z" },
  { id: "PRD-014", vendor_id: "VND-004", category_id: "1", title: "Smartphone Ultra 5G", description: "6.7\" AMOLED, 108MP camera, 5000mAh battery, 256GB storage. Flagship performance at mid-range price.", price: 29999, tax: 5400, discount: 3000, max_points_redeemable: 500, status: "active" as const, vendor_name: "GadgetWorld", category_name: "Electronics", emoji: "📱", image: "/images/products/smartphone.jpg", rating: 4.5, reviews: 456, stock: 22, sales: 456, created_at: "2026-02-01T10:00:00Z", updated_at: "2026-03-11T09:00:00Z" },
];

const DEFAULT_SERVICES = [
  { id: "SRV-001", vendor_id: "VND-011", category_id: "10", title: "Home Deep Cleaning", description: "Professional deep cleaning for 2BHK/3BHK homes. Includes kitchen, bathrooms, floors, and window cleaning.", price: 2499, tax: 450, discount: 250, max_points_redeemable: 200, status: "active" as const, vendor_name: "CleanPro Services", category_name: "Home Services", emoji: "🧹", image: "/images/services/cleaning.jpg", rating: 4.8, reviews: 312, service_area: "Coimbatore", duration: "4-5 hours", created_at: "2026-01-10T10:00:00Z" },
  { id: "SRV-002", vendor_id: "VND-012", category_id: "11", title: "AC Service & Repair", description: "Complete AC servicing including gas refill, jet cleaning, and filter replacement for split/window ACs.", price: 799, tax: 144, discount: 0, max_points_redeemable: 50, status: "active" as const, vendor_name: "CoolTech", category_name: "Appliance Repair", emoji: "❄️", image: "/images/services/ac-repair.jpg", rating: 4.6, reviews: 189, service_area: "Coimbatore", duration: "1-2 hours", created_at: "2026-01-15T14:00:00Z" },
  { id: "SRV-003", vendor_id: "VND-013", category_id: "12", title: "Salon at Home - Women", description: "Professional salon services at your doorstep. Includes haircut, facial, waxing, manicure & pedicure.", price: 1999, tax: 360, discount: 200, max_points_redeemable: 150, status: "active" as const, vendor_name: "GlamSquad", category_name: "Beauty & Wellness", emoji: "💅", image: "/images/services/beauty-salon.jpg", rating: 4.9, reviews: 456, service_area: "Coimbatore", duration: "2-3 hours", created_at: "2026-01-20T09:00:00Z" },
  { id: "SRV-004", vendor_id: "VND-014", category_id: "13", title: "Plumbing - Tap & Pipe Repair", description: "Expert plumber for tap installation, pipe leak repair, bathroom fitting, and drainage solutions.", price: 399, tax: 72, discount: 0, max_points_redeemable: 30, status: "active" as const, vendor_name: "Selvam Plumbing & Electrical", category_name: "Home Repairs", emoji: "🔧", image: "/images/services/plumbing.jpg", rating: 4.3, reviews: 234, service_area: "Coimbatore", duration: "1-2 hours", created_at: "2026-02-05T11:00:00Z" },
  { id: "SRV-005", vendor_id: "VND-015", category_id: "14", title: "Pest Control - Full Home", description: "Comprehensive pest control for cockroaches, ants, bed bugs, and termites. Safe chemicals, 3-month warranty.", price: 1499, tax: 270, discount: 150, max_points_redeemable: 100, status: "active" as const, vendor_name: "BugFree India", category_name: "Pest Control", emoji: "🛡️", image: "/images/services/pest-control.jpg", rating: 4.5, reviews: 167, service_area: "Coimbatore", duration: "2-3 hours", created_at: "2026-02-15T16:00:00Z" },
  { id: "SRV-006", vendor_id: "VND-011", category_id: "10", title: "Sofa & Carpet Cleaning", description: "Professional upholstery and carpet deep cleaning using steam technology. Removes stains, odor, and allergens.", price: 1299, tax: 234, discount: 130, max_points_redeemable: 100, status: "active" as const, vendor_name: "CleanPro Services", category_name: "Home Services", emoji: "🛋️", image: "/images/services/cleaning.jpg", rating: 4.7, reviews: 98, service_area: "Coimbatore", duration: "2-3 hours", created_at: "2026-02-25T08:00:00Z" },
  { id: "SRV-007", vendor_id: "VND-016", category_id: "15", title: "Yoga & Fitness Training", description: "Certified personal trainer for home sessions. Customized workout plans, yoga, and meditation.", price: 999, tax: 180, discount: 0, max_points_redeemable: 80, status: "active" as const, vendor_name: "FitGuru", category_name: "Fitness", emoji: "🏋️", image: "/images/services/fitness.jpg", rating: 4.8, reviews: 143, service_area: "Coimbatore", duration: "1 hour", created_at: "2026-02-25T08:00:00Z" },
  { id: "SRV-008", vendor_id: "VND-012", category_id: "11", title: "Washing Machine Repair", description: "Expert repair for all brands. Drum issues, motor problems, water leakage, and part replacement.", price: 599, tax: 108, discount: 0, max_points_redeemable: 40, status: "active" as const, vendor_name: "CoolTech", category_name: "Appliance Repair", emoji: "🧺", image: "/images/services/ac-repair.jpg", rating: 4.4, reviews: 76, service_area: "Coimbatore", duration: "1-2 hours", created_at: "2026-03-01T10:15:00Z" },
  { id: "SRV-009", vendor_id: "VND-014", category_id: "13", title: "Electrical Wiring & Repair", description: "Switch/socket repair, wiring replacement, MCB installation. Licensed electrician with safety certification.", price: 349, tax: 63, discount: 0, max_points_redeemable: 25, status: "active" as const, vendor_name: "Selvam Plumbing & Electrical", category_name: "Home Repairs", emoji: "⚡", image: "/images/services/electrical.jpg", rating: 4.5, reviews: 198, service_area: "Coimbatore", duration: "1-2 hours", created_at: "2026-02-10T10:00:00Z" },
  { id: "SRV-010", vendor_id: "VND-017", category_id: "16", title: "Wedding Event Planning", description: "Complete wedding planning and coordination. Venue decoration, catering management, and photography.", price: 49999, tax: 9000, discount: 5000, max_points_redeemable: 500, status: "active" as const, vendor_name: "Dream Events", category_name: "Events", emoji: "💒", image: "/images/services/plumbing.jpg", rating: 4.8, reviews: 67, service_area: "Coimbatore", duration: "Full day", created_at: "2026-01-15T10:00:00Z" },
];

const DEFAULT_SERVICE_VENDORS = [
  { id: "VND-011", name: "Suresh Patil", business_name: "CleanPro Services", mobile: "+91 99887 76553", email: "suresh@cleanpro.com", category_id: "10", city_id: "1", area_id: "1", commission_rate: 15, membership: "premium", status: "verified" as const, created_at: "2026-01-10T10:00:00Z", rating: 4.8, total_products: 5, total_orders: 890, total_revenue: 425000 },
  { id: "VND-012", name: "Rahul Verma", business_name: "CoolTech", mobile: "+91 99887 76554", email: "rahul@cooltech.com", category_id: "11", city_id: "1", area_id: "2", commission_rate: 12, membership: "basic", status: "verified" as const, created_at: "2026-01-15T14:00:00Z", rating: 4.6, total_products: 3, total_orders: 560, total_revenue: 245000 },
  { id: "VND-013", name: "Deepa Menon", business_name: "GlamSquad", mobile: "+91 99887 76555", email: "deepa@glamsquad.com", category_id: "12", city_id: "1", area_id: "3", commission_rate: 18, membership: "premium", status: "verified" as const, created_at: "2026-01-20T09:00:00Z", rating: 4.9, total_products: 8, total_orders: 1240, total_revenue: 680000 },
  { id: "VND-014", name: "Selvam K", business_name: "Selvam Plumbing & Electrical", mobile: "+91 99887 76556", email: "selvam@fixithome.com", category_id: "13", city_id: "1", area_id: "4", commission_rate: 10, membership: "basic", status: "verified" as const, created_at: "2026-02-05T11:00:00Z", rating: 4.3, total_products: 4, total_orders: 780, total_revenue: 198000 },
  { id: "VND-015", name: "Anil Kumar", business_name: "BugFree India", mobile: "+91 99887 76557", email: "anil@bugfree.com", category_id: "14", city_id: "1", area_id: "5", commission_rate: 15, membership: "basic", status: "level2_approved" as const, created_at: "2026-02-15T16:00:00Z", rating: 4.5, total_products: 3, total_orders: 340, total_revenue: 145000 },
  { id: "VND-016", name: "Nisha Kapoor", business_name: "FitGuru", mobile: "+91 99887 76558", email: "nisha@fitguru.com", category_id: "15", city_id: "1", area_id: "1", commission_rate: 12, membership: "basic", status: "verified" as const, created_at: "2026-02-25T08:00:00Z", rating: 4.8, total_products: 2, total_orders: 420, total_revenue: 168000 },
  { id: "VND-017", name: "Prakash Rajan", business_name: "Dream Events", mobile: "+91 99887 76559", email: "prakash@dreamevents.com", category_id: "16", city_id: "1", area_id: "2", commission_rate: 20, membership: "premium", status: "verified" as const, created_at: "2026-01-15T10:00:00Z", rating: 4.8, total_products: 3, total_orders: 120, total_revenue: 580000 },
];

const DEFAULT_CUSTOMERS = [
  { id: "USR-001", name: "Rahul Sharma", mobile: "+91 98765 43210", email: "rahul@example.com", city_id: "1", area_id: "1", latitude: 11.0168, longitude: 76.9558, wallet_points: 1250, referral_code: "REF0001", referred_by: null, status: "active" as const, created_at: "2026-01-05T10:30:00Z", occupation: "Software Engineer" },
  { id: "USR-002", name: "Priya Patel", mobile: "+91 98765 43211", email: "priya@example.com", city_id: "1", area_id: "2", latitude: 11.004, longitude: 76.961, wallet_points: 890, referral_code: "REF0002", referred_by: "USR-001", status: "active" as const, created_at: "2026-01-12T14:20:00Z", occupation: "Doctor" },
  { id: "USR-003", name: "Amit Kumar", mobile: "+91 98765 43212", email: "amit@example.com", city_id: "1", area_id: "3", latitude: 11.025, longitude: 76.935, wallet_points: 2100, referral_code: "REF0003", referred_by: null, status: "active" as const, created_at: "2026-01-18T09:15:00Z", occupation: "Business Owner" },
  { id: "USR-004", name: "Sneha Reddy", mobile: "+91 98765 43213", email: "sneha@example.com", city_id: "1", area_id: "4", latitude: 11.010, longitude: 76.970, wallet_points: 450, referral_code: "REF0004", referred_by: "USR-001", status: "inactive" as const, created_at: "2026-01-25T11:45:00Z", occupation: "Teacher" },
  { id: "USR-005", name: "Vikram Singh", mobile: "+91 98765 43214", email: "vikram@example.com", city_id: "1", area_id: "5", latitude: 11.008, longitude: 76.945, wallet_points: 1800, referral_code: "REF0005", referred_by: null, status: "active" as const, created_at: "2026-02-02T16:30:00Z", occupation: "Chartered Accountant" },
  { id: "USR-006", name: "Anita Gupta", mobile: "+91 98765 43215", email: "anita@example.com", city_id: "1", area_id: "1", latitude: 11.016, longitude: 76.955, wallet_points: 320, referral_code: "REF0006", referred_by: "USR-003", status: "active" as const, created_at: "2026-02-10T08:00:00Z", occupation: "Homemaker" },
  { id: "USR-007", name: "Rajesh Nair", mobile: "+91 98765 43216", email: "rajesh@example.com", city_id: "1", area_id: "2", latitude: 11.004, longitude: 76.961, wallet_points: 50, referral_code: "REF0007", referred_by: null, status: "suspended" as const, created_at: "2026-02-15T13:10:00Z", occupation: "Lawyer" },
  { id: "USR-008", name: "Meera Joshi", mobile: "+91 98765 43217", email: "meera@example.com", city_id: "1", area_id: "3", latitude: 11.025, longitude: 76.935, wallet_points: 975, referral_code: "REF0008", referred_by: "USR-005", status: "active" as const, created_at: "2026-02-20T10:45:00Z", occupation: "Designer" },
  { id: "USR-009", name: "Karan Mehta", mobile: "+91 98765 43218", email: "karan@example.com", city_id: "1", area_id: "4", latitude: 11.010, longitude: 76.970, wallet_points: 1600, referral_code: "REF0009", referred_by: null, status: "active" as const, created_at: "2026-02-28T15:20:00Z", occupation: "Architect" },
  { id: "USR-010", name: "Pooja Iyer", mobile: "+91 98765 43219", email: "pooja@example.com", city_id: "1", area_id: "5", latitude: 11.008, longitude: 76.945, wallet_points: 700, referral_code: "REF0010", referred_by: "USR-003", status: "active" as const, created_at: "2026-03-05T09:30:00Z", occupation: "Student" },
];

const DEFAULT_VENDORS = [
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

const DEFAULT_ORDERS = [
  { id: "ORD-001", customer_id: "USR-001", vendor_id: "VND-001", subtotal: 2499, tax: 450, discount: 250, points_used: 0, total: 2699, status: "placed" as const, created_at: "2026-03-13T10:30:00Z", updated_at: "2026-03-13T10:30:00Z", customer_name: "Rahul Sharma", vendor_name: "TechMart", items: [{ title: "Wireless Headphones Pro", qty: 1, emoji: "🎧", price: 2499 }] },
  { id: "ORD-002", customer_id: "USR-002", vendor_id: "VND-002", subtotal: 1798, tax: 324, discount: 0, points_used: 50, total: 2072, status: "paid" as const, created_at: "2026-03-13T09:15:00Z", updated_at: "2026-03-13T09:45:00Z", customer_name: "Priya Patel", vendor_name: "FashionHub", items: [{ title: "Cotton T-Shirt Pack", qty: 2, emoji: "👕", price: 899 }] },
  { id: "ORD-003", customer_id: "USR-003", vendor_id: "VND-003", subtotal: 1599, tax: 288, discount: 160, points_used: 0, total: 1727, status: "in_progress" as const, created_at: "2026-03-12T16:00:00Z", updated_at: "2026-03-13T08:00:00Z", customer_name: "Amit Kumar", vendor_name: "HomeDecor", items: [{ title: "Ceramic Vase Set", qty: 1, emoji: "🏺", price: 1599 }] },
  { id: "ORD-004", customer_id: "USR-001", vendor_id: "VND-004", subtotal: 4999, tax: 900, discount: 500, points_used: 200, total: 5199, status: "delivered" as const, created_at: "2026-03-11T14:20:00Z", updated_at: "2026-03-12T11:00:00Z", customer_name: "Rahul Sharma", vendor_name: "GadgetWorld", items: [{ title: "Smart Watch Pro", qty: 1, emoji: "⌚", price: 4999 }] },
  { id: "ORD-005", customer_id: "USR-005", vendor_id: "VND-001", subtotal: 5397, tax: 972, discount: 540, points_used: 0, total: 5829, status: "completed" as const, created_at: "2026-03-10T10:00:00Z", updated_at: "2026-03-12T14:00:00Z", customer_name: "Vikram Singh", vendor_name: "TechMart", items: [{ title: "Bluetooth Speaker Mini", qty: 3, emoji: "🔊", price: 1799 }] },
  { id: "ORD-006", customer_id: "USR-006", vendor_id: "VND-005", subtotal: 1299, tax: 0, discount: 130, points_used: 100, total: 1069, status: "cancelled" as const, created_at: "2026-03-09T12:30:00Z", updated_at: "2026-03-09T15:00:00Z", customer_name: "Anita Gupta", vendor_name: "BookStore Plus", items: [{ title: "Novel Collection Box", qty: 1, emoji: "📖", price: 1299 }] },
  { id: "ORD-007", customer_id: "USR-008", vendor_id: "VND-006", subtotal: 599, tax: 108, discount: 0, points_used: 0, total: 707, status: "placed" as const, created_at: "2026-03-13T07:00:00Z", updated_at: "2026-03-13T07:00:00Z", customer_name: "Meera Joshi", vendor_name: "GreenGrocer", items: [{ title: "Organic Honey 500g", qty: 1, emoji: "🍯", price: 599 }] },
  { id: "ORD-008", customer_id: "USR-009", vendor_id: "VND-009", subtotal: 3499, tax: 630, discount: 350, points_used: 300, total: 3479, status: "accepted" as const, created_at: "2026-03-12T18:00:00Z", updated_at: "2026-03-13T06:00:00Z", customer_name: "Karan Mehta", vendor_name: "SportsZone", items: [{ title: "Running Shoes Air", qty: 1, emoji: "👟", price: 3499 }] },
];

const DEFAULT_SETTLEMENTS = [
  { id: "SET-001", vendor_id: "VND-001", order_id: "ORD-005", amount: 5829, commission: 466, net_amount: 5363, status: "settled" as const, settled_at: "2026-03-12T14:00:00Z", vendor_name: "TechMart", created_at: "2026-03-12T14:00:00Z" },
  { id: "SET-002", vendor_id: "VND-003", order_id: "ORD-003", amount: 1727, commission: 207, net_amount: 1520, status: "pending" as const, settled_at: null, vendor_name: "HomeDecor", created_at: "2026-03-12T16:00:00Z" },
  { id: "SET-003", vendor_id: "VND-004", order_id: "ORD-004", amount: 5199, commission: 416, net_amount: 4783, status: "eligible" as const, settled_at: null, vendor_name: "GadgetWorld", created_at: "2026-03-11T14:20:00Z" },
  { id: "SET-004", vendor_id: "VND-002", order_id: "ORD-002", amount: 2072, commission: 207, net_amount: 1865, status: "on_hold" as const, settled_at: null, vendor_name: "FashionHub", created_at: "2026-03-13T09:15:00Z" },
  { id: "SET-005", vendor_id: "VND-001", order_id: "ORD-001", amount: 2699, commission: 216, net_amount: 2483, status: "pending" as const, settled_at: null, vendor_name: "TechMart", created_at: "2026-03-13T10:30:00Z" },
];

const DEFAULT_CLASSIFIEDS = [
  { id: "AD-001", title: "iPhone 14 Pro Max 256GB", description: "Space Black, excellent condition, battery 94%, with original box and charger", price: 85000, category: "Electronics", city: "Coimbatore", area: "JJ Nagar", images: [] as string[], user_id: "USR-001", status: "approved" as const, created_at: "2026-03-12T10:30:00Z", user_name: "Rahul Sharma" },
  { id: "AD-002", title: "Royal Enfield Classic 350", description: "2023 model, Signals edition, 12000km, first owner, all papers clear", price: 185000, category: "Vehicles", city: "Coimbatore", area: "Pattanam", images: [] as string[], user_id: "USR-002", status: "approved" as const, created_at: "2026-03-12T09:00:00Z", user_name: "Priya Patel" },
  { id: "AD-003", title: "2BHK Flat for Rent Pattanam", description: "Furnished, garden view, near schools, parking", price: 15000, category: "Real Estate", city: "Coimbatore", area: "Pattanam", images: [] as string[], user_id: "USR-003", status: "approved" as const, created_at: "2026-03-11T14:00:00Z", user_name: "Amit Kumar" },
  { id: "AD-004", title: "MacBook Air M2 2023", description: "Mint condition, 256GB, 8GB RAM, charger included", price: 89000, category: "Electronics", city: "Coimbatore", area: "RS Puram", images: [] as string[], user_id: "USR-004", status: "pending" as const, created_at: "2026-03-10T11:15:00Z", user_name: "Sneha Reddy" },
  { id: "AD-005", title: "L-Shape Sofa Set", description: "6 seater, fabric, 2 years old, no damage", price: 35000, category: "Furniture", city: "Coimbatore", area: "Gandhipuram", images: [] as string[], user_id: "USR-005", status: "approved" as const, created_at: "2026-03-09T09:30:00Z", user_name: "Vikram Singh" },
  { id: "AD-006", title: "Yamaha Guitar Acoustic", description: "F310 model, with bag and picks, barely used", price: 12000, category: "Music", city: "Coimbatore", area: "Peelamedu", images: [] as string[], user_id: "USR-006", status: "rejected" as const, created_at: "2026-03-08T16:45:00Z", user_name: "Anita Gupta" },
  { id: "AD-007", title: "MTB Bicycle 21-Speed", description: "Hero Sprint, front suspension, disc brakes", price: 8000, category: "Sports", city: "Coimbatore", area: "Saibaba Colony", images: [] as string[], user_id: "USR-007", status: "approved" as const, created_at: "2026-03-07T12:00:00Z", user_name: "Rajesh Nair" },
  { id: "AD-008", title: "PS5 Console + 3 Games", description: "Digital edition, 2 controllers, great condition", price: 45000, category: "Gaming", city: "Coimbatore", area: "Singanallur", images: [] as string[], user_id: "USR-008", status: "expired" as const, created_at: "2026-03-06T10:30:00Z", user_name: "Meera Joshi" },
  { id: "AD-009", title: "Study Table with Shelf", description: "Engineered wood, adjustable shelf, compact design", price: 5500, category: "Furniture", city: "Coimbatore", area: "Vadavalli", images: [] as string[], user_id: "USR-009", status: "approved" as const, created_at: "2026-03-05T08:00:00Z", user_name: "Karan Mehta" },
  { id: "AD-010", title: "Gold Necklace 22K 15g", description: "Traditional design, with hallmark certificate", price: 120000, category: "Jewelry", city: "Coimbatore", area: "Town Hall", images: [] as string[], user_id: "USR-010", status: "sold" as const, created_at: "2026-03-04T14:00:00Z", user_name: "Pooja Iyer" },
];

const DEFAULT_POINTS_TRANSACTIONS = [
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

const DEFAULT_REFERRALS = [
  { id: "REF-001", referrer_id: "USR-001", referee_id: "USR-002", status: "completed" as const, points_awarded: 100, created_at: "2026-01-12T14:20:00Z", referrer_name: "Rahul Sharma", referee_name: "Priya Patel" },
  { id: "REF-002", referrer_id: "USR-001", referee_id: "USR-004", status: "completed" as const, points_awarded: 100, created_at: "2026-01-25T11:45:00Z", referrer_name: "Rahul Sharma", referee_name: "Sneha Reddy" },
  { id: "REF-003", referrer_id: "USR-003", referee_id: "USR-006", status: "completed" as const, points_awarded: 100, created_at: "2026-02-10T08:00:00Z", referrer_name: "Amit Kumar", referee_name: "Anita Gupta" },
  { id: "REF-004", referrer_id: "USR-005", referee_id: "USR-008", status: "completed" as const, points_awarded: 100, created_at: "2026-02-20T10:45:00Z", referrer_name: "Vikram Singh", referee_name: "Meera Joshi" },
  { id: "REF-005", referrer_id: "USR-003", referee_id: "USR-010", status: "pending" as const, points_awarded: 0, created_at: "2026-03-05T09:30:00Z", referrer_name: "Amit Kumar", referee_name: "Pooja Iyer" },
];

const DEFAULT_CATEGORIES = [
  { id: "1", name: "Electronics", parent_id: null, image: "/images/products/smartphone.jpg", status: "active" as const, count: 4520, created_at: "2025-12-01T10:00:00Z" },
  { id: "2", name: "Fashion", parent_id: null, image: "/images/products/tshirt-pack.jpg", status: "active" as const, count: 3890, created_at: "2025-12-01T10:00:00Z" },
  { id: "3", name: "Home & Living", parent_id: null, image: "/images/products/ceramic-vase.jpg", status: "active" as const, count: 2750, created_at: "2025-12-01T10:00:00Z" },
  { id: "5", name: "Books", parent_id: null, image: "/images/products/books.jpg", status: "active" as const, count: 1820, created_at: "2025-12-01T10:00:00Z" },
  { id: "6", name: "Food & Grocery", parent_id: null, image: "/images/products/honey.jpg", status: "active" as const, count: 1450, created_at: "2025-12-05T10:00:00Z" },
  { id: "8", name: "Sports & Fitness", parent_id: null, image: "/images/products/running-shoes.jpg", status: "active" as const, count: 980, created_at: "2025-12-10T10:00:00Z" },
  { id: "9", name: "Pets", parent_id: null, image: "/images/products/dog-food.jpg", status: "active" as const, count: 420, created_at: "2025-12-15T10:00:00Z" },
];

const DEFAULT_SERVICE_CATEGORIES = [
  { id: "10", name: "Home Services", parent_id: null, image: "/images/services/cleaning.jpg", status: "active" as const, count: 890, created_at: "2025-12-01T10:00:00Z" },
  { id: "11", name: "Appliance Repair", parent_id: null, image: "/images/services/ac-repair.jpg", status: "active" as const, count: 560, created_at: "2025-12-01T10:00:00Z" },
  { id: "12", name: "Beauty & Wellness", parent_id: null, image: "/images/services/beauty-salon.jpg", status: "active" as const, count: 1240, created_at: "2025-12-05T10:00:00Z" },
  { id: "13", name: "Home Repairs", parent_id: null, image: "/images/services/plumbing.jpg", status: "active" as const, count: 780, created_at: "2025-12-10T10:00:00Z" },
  { id: "14", name: "Pest Control", parent_id: null, image: "/images/services/pest-control.jpg", status: "active" as const, count: 340, created_at: "2025-12-15T10:00:00Z" },
  { id: "15", name: "Fitness", parent_id: null, image: "/images/services/fitness.jpg", status: "active" as const, count: 420, created_at: "2025-12-20T10:00:00Z" },
  { id: "16", name: "Events", parent_id: null, image: "/images/services/plumbing.jpg", status: "active" as const, count: 120, created_at: "2025-12-25T10:00:00Z" },
];

const DEFAULT_BANNERS = [
  { id: "1", title: "Fresh Grocery Delivery", desktop_image: "/images/banners/grocery-banner.jpg", mobile_image: "/images/banners/grocery-banner.jpg", link: "/app/browse?category=Food%20%26%20Grocery", priority: 1, start_date: "2026-03-01", end_date: "2026-03-31", status: "active" as const, subtitle: "Up to 50% off on fresh vegetables & fruits", gradient: "from-primary to-primary/70", created_at: "2026-02-25T10:00:00Z" },
  { id: "2", title: "Electronics Mega Sale", desktop_image: "/images/banners/electronics-banner.jpg", mobile_image: "/images/banners/electronics-banner.jpg", link: "/app/browse?category=Electronics", priority: 2, start_date: "2026-03-01", end_date: "2026-04-30", status: "active" as const, subtitle: "Up to 60% off on gadgets & devices", gradient: "from-info to-info/70", created_at: "2026-02-25T10:00:00Z" },
  { id: "3", title: "New Fashion Arrivals", desktop_image: "/images/banners/fashion-banner.jpg", mobile_image: "/images/banners/fashion-banner.jpg", link: "/app/browse?category=Fashion", priority: 3, start_date: "2026-03-01", end_date: "2026-06-30", status: "active" as const, subtitle: "Trendy styles for the season", gradient: "from-destructive to-destructive/70", created_at: "2026-02-28T10:00:00Z" },
  { id: "4", title: "Diwali Special Offers", desktop_image: "", mobile_image: "", link: "/diwali", priority: 4, start_date: "2026-10-15", end_date: "2026-11-15", status: "inactive" as const, subtitle: "Coming soon", gradient: "from-warning to-warning/70", created_at: "2026-02-28T10:00:00Z" },
];

const DEFAULT_PLATFORM_VARIABLES = [
  { id: "1", key: "welcome_points", value: "200", description: "Points given to new customers on registration" },
  { id: "2", key: "referral_points", value: "100", description: "Points awarded for successful referral" },
  { id: "3", key: "settlement_cooling_days", value: "7", description: "Days before settlement becomes eligible" },
  { id: "4", key: "razorpay_sandbox", value: "true", description: "Razorpay sandbox mode toggle" },
  { id: "5", key: "order_reward_rate", value: "2", description: "Percentage of order value as loyalty points" },
  { id: "6", key: "max_points_per_order", value: "500", description: "Maximum points redeemable per order" },
  { id: "7", key: "auto_settlement_enabled", value: "false", description: "Enable automatic daily settlements" },
  { id: "8", key: "auto_settlement_days", value: "7", description: "Days after order completion for auto settlement" },
];

const DEFAULT_CLASSIFIED_CATEGORIES = ["Electronics", "Vehicles", "Real Estate", "Furniture", "Music", "Sports", "Gaming", "Jewelry", "Books", "Fashion"];

const DEFAULT_OCCUPATIONS = [
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

const DEFAULT_CITIES = [
  { id: "1", name: "Coimbatore", state: "Tamil Nadu", status: "active" as const, area_count: 5, created_at: "2025-11-01T10:00:00Z" },
  { id: "2", name: "Chennai", state: "Tamil Nadu", status: "active" as const, area_count: 4, created_at: "2025-11-01T10:00:00Z" },
  { id: "3", name: "Bangalore", state: "Karnataka", status: "active" as const, area_count: 3, created_at: "2025-11-15T10:00:00Z" },
  { id: "4", name: "Mumbai", state: "Maharashtra", status: "active" as const, area_count: 3, created_at: "2025-12-01T10:00:00Z" },
  { id: "5", name: "Hyderabad", state: "Telangana", status: "inactive" as const, area_count: 2, created_at: "2025-12-15T10:00:00Z" },
];

const DEFAULT_AREAS = [
  { id: "1", name: "JJ Nagar", city_id: "1", city_name: "Coimbatore", pincode: "641016", status: "active" as const, created_at: "2025-11-01T10:00:00Z" },
  { id: "2", name: "Pattanam", city_id: "1", city_name: "Coimbatore", pincode: "641016", status: "active" as const, created_at: "2025-11-01T10:00:00Z" },
  { id: "3", name: "RS Puram", city_id: "1", city_name: "Coimbatore", pincode: "641002", status: "active" as const, created_at: "2025-11-15T10:00:00Z" },
  { id: "4", name: "Gandhipuram", city_id: "1", city_name: "Coimbatore", pincode: "641012", status: "active" as const, created_at: "2025-11-15T10:00:00Z" },
  { id: "5", name: "Peelamedu", city_id: "1", city_name: "Coimbatore", pincode: "641004", status: "active" as const, created_at: "2025-12-01T10:00:00Z" },
  { id: "6", name: "Saibaba Colony", city_id: "1", city_name: "Coimbatore", pincode: "641011", status: "active" as const, created_at: "2025-12-01T10:00:00Z" },
  { id: "7", name: "Singanallur", city_id: "1", city_name: "Coimbatore", pincode: "641005", status: "active" as const, created_at: "2025-12-01T10:00:00Z" },
  { id: "8", name: "T. Nagar", city_id: "2", city_name: "Chennai", pincode: "600017", status: "active" as const, created_at: "2025-11-01T10:00:00Z" },
  { id: "9", name: "Anna Nagar", city_id: "2", city_name: "Chennai", pincode: "600040", status: "active" as const, created_at: "2025-11-01T10:00:00Z" },
  { id: "10", name: "Koramangala", city_id: "3", city_name: "Bangalore", pincode: "560034", status: "active" as const, created_at: "2025-11-15T10:00:00Z" },
  { id: "11", name: "Indiranagar", city_id: "3", city_name: "Bangalore", pincode: "560038", status: "active" as const, created_at: "2025-11-15T10:00:00Z" },
  { id: "12", name: "Whitefield", city_id: "3", city_name: "Bangalore", pincode: "560066", status: "active" as const, created_at: "2025-12-01T10:00:00Z" },
];

const DEFAULT_TAX_CONFIG = [
  { id: "TAX-001", name: "GST 18%", rate: 18, type: "GST" as const, status: "active" as const, applied_to: "Products", created_at: "2025-11-01T10:00:00Z" },
  { id: "TAX-002", name: "GST 12%", rate: 12, type: "GST" as const, status: "active" as const, applied_to: "Services", created_at: "2025-11-01T10:00:00Z" },
  { id: "TAX-003", name: "GST 5%", rate: 5, type: "GST" as const, status: "active" as const, applied_to: "Food & Grocery", created_at: "2025-11-15T10:00:00Z" },
  { id: "TAX-004", name: "Cess 1%", rate: 1, type: "Cess" as const, status: "active" as const, applied_to: "Electronics", created_at: "2025-12-01T10:00:00Z" },
  { id: "TAX-005", name: "GST 28%", rate: 28, type: "GST" as const, status: "inactive" as const, applied_to: "Luxury", created_at: "2025-12-15T10:00:00Z" },
];

const DEFAULT_POPUP_BANNERS = [
  { id: "PB-001", title: "Welcome Offer!", description: "Get 200 points on your first order", image: "", link: "/app/browse", status: "active" as const, start_date: "2026-03-01", end_date: "2026-03-31", created_at: "2026-02-25T10:00:00Z" },
  { id: "PB-002", title: "Flash Sale", description: "50% off on electronics today only", image: "", link: "/app/browse?category=electronics", status: "active" as const, start_date: "2026-03-13", end_date: "2026-03-14", created_at: "2026-03-12T10:00:00Z" },
  { id: "PB-003", title: "Rate Us!", description: "Share your experience and win rewards", image: "", link: "#", status: "inactive" as const, start_date: "2026-04-01", end_date: "2026-04-30", created_at: "2026-03-10T10:00:00Z" },
];

const DEFAULT_ADVERTISEMENTS = [
  { id: "ADV-001", title: "Premium Banner Ad - Homepage", advertiser: "Samsung India", placement: "Homepage Top", type: "banner" as const, status: "active" as const, impressions: 45200, clicks: 1205, start_date: "2026-03-01", end_date: "2026-03-31", revenue: 15000, created_at: "2026-02-25T10:00:00Z" },
  { id: "ADV-002", title: "Sidebar Ad - Browse Page", advertiser: "Nike India", placement: "Browse Sidebar", type: "sidebar" as const, status: "active" as const, impressions: 32100, clicks: 890, start_date: "2026-03-01", end_date: "2026-04-30", revenue: 12000, created_at: "2026-02-28T10:00:00Z" },
  { id: "ADV-003", title: "Sponsored Product Listing", advertiser: "Apple Reseller", placement: "Product Grid", type: "sponsored" as const, status: "active" as const, impressions: 28500, clicks: 1520, start_date: "2026-03-05", end_date: "2026-03-20", revenue: 25000, created_at: "2026-03-01T10:00:00Z" },
  { id: "ADV-004", title: "Service Page Banner", advertiser: "Urban Company", placement: "Services Top", type: "banner" as const, status: "paused" as const, impressions: 12300, clicks: 340, start_date: "2026-02-15", end_date: "2026-03-15", revenue: 8000, created_at: "2026-02-10T10:00:00Z" },
  { id: "ADV-005", title: "Footer Ad Strip", advertiser: "Flipkart", placement: "Footer", type: "strip" as const, status: "expired" as const, impressions: 56000, clicks: 1890, start_date: "2026-02-01", end_date: "2026-02-28", revenue: 18000, created_at: "2026-01-25T10:00:00Z" },
];

const DEFAULT_WEBSITE_QUERIES = [
  { id: "WQ-001", name: "Ravi Patel", email: "ravi@gmail.com", phone: "+91 98765 00001", subject: "Partnership Inquiry", message: "We would like to partner as a vendor on your platform. Please share details.", status: "new" as const, created_at: "2026-03-13T09:00:00Z" },
  { id: "WQ-002", name: "Suman Devi", email: "suman@yahoo.com", phone: "+91 98765 00002", subject: "Refund Issue", message: "I have not received my refund for order ORD-045. It's been 15 days.", status: "in_progress" as const, created_at: "2026-03-12T14:30:00Z" },
  { id: "WQ-003", name: "Kunal Shah", email: "kunal@outlook.com", phone: "+91 98765 00003", subject: "Bulk Order Inquiry", message: "Can I place bulk orders for corporate gifting? Need 500 units.", status: "resolved" as const, created_at: "2026-03-11T10:15:00Z" },
  { id: "WQ-004", name: "Meena K", email: "meena@gmail.com", phone: "+91 98765 00004", subject: "Account Deletion", message: "Please delete my account and all associated data as per GDPR.", status: "new" as const, created_at: "2026-03-10T16:45:00Z" },
  { id: "WQ-005", name: "Aditya M", email: "aditya@company.com", phone: "+91 98765 00005", subject: "API Integration", message: "We want to integrate your product catalog API with our ERP system.", status: "in_progress" as const, created_at: "2026-03-09T11:00:00Z" },
  { id: "WQ-006", name: "Pooja R", email: "pooja@domain.com", phone: "+91 98765 00006", subject: "Service Complaint", message: "The plumber sent for my booking was unprofessional. Very disappointed.", status: "resolved" as const, created_at: "2026-03-08T08:30:00Z" },
];

const DEFAULT_REPORT_LOG = [
  { id: "RL-001", report_type: "Sales Report", generated_by: "Admin", format: "CSV", status: "completed" as const, file_size: "2.4 MB", created_at: "2026-03-13T10:00:00Z" },
  { id: "RL-002", report_type: "Vendor Performance", generated_by: "Admin", format: "PDF", status: "completed" as const, file_size: "1.8 MB", created_at: "2026-03-12T14:30:00Z" },
  { id: "RL-003", report_type: "Customer Activity", generated_by: "Finance", format: "Excel", status: "completed" as const, file_size: "3.1 MB", created_at: "2026-03-11T09:00:00Z" },
  { id: "RL-004", report_type: "Tax Summary", generated_by: "Finance", format: "PDF", status: "failed" as const, file_size: "0 MB", created_at: "2026-03-10T16:00:00Z" },
  { id: "RL-005", report_type: "Settlement Report", generated_by: "Admin", format: "CSV", status: "processing" as const, file_size: "—", created_at: "2026-03-13T11:00:00Z" },
];

const DEFAULT_SUPPORT_TICKETS = [
  { id: "TKT-001", customer_id: "USR-001", customer_name: "Rahul Sharma", subject: "Order not delivered", description: "My order ORD-001 was supposed to be delivered yesterday but I haven't received it yet.", category: "Delivery", priority: "high" as const, status: "open" as const, assigned_to: "Agent Priya", resolution_notes: "", created_at: "2026-03-13T08:00:00Z", updated_at: "2026-03-13T08:00:00Z" },
  { id: "TKT-002", customer_id: "USR-002", customer_name: "Priya Patel", subject: "Wrong item received", description: "I ordered a blue t-shirt but received a red one. Please arrange for replacement.", category: "Product Quality", priority: "medium" as const, status: "in_progress" as const, assigned_to: "Agent Rahul", resolution_notes: "Replacement initiated, pickup scheduled for tomorrow.", created_at: "2026-03-12T14:00:00Z", updated_at: "2026-03-13T09:00:00Z" },
  { id: "TKT-003", customer_id: "USR-003", customer_name: "Amit Kumar", subject: "Refund not received", description: "I cancelled my order 10 days ago but haven't received the refund yet.", category: "Payment", priority: "high" as const, status: "resolved" as const, assigned_to: "Agent Deepa", resolution_notes: "Refund processed successfully. Amount credited to bank account.", created_at: "2026-03-10T10:00:00Z", updated_at: "2026-03-12T16:00:00Z" },
  { id: "TKT-004", customer_id: "USR-005", customer_name: "Vikram Singh", subject: "Points not credited", description: "I completed an order but my loyalty points were not credited to my wallet.", category: "Loyalty Points", priority: "low" as const, status: "open" as const, assigned_to: "", resolution_notes: "", created_at: "2026-03-13T06:00:00Z", updated_at: "2026-03-13T06:00:00Z" },
  { id: "TKT-005", customer_id: "USR-008", customer_name: "Meera Joshi", subject: "Service provider did not show up", description: "I booked a home cleaning service but the provider didn't arrive at the scheduled time.", category: "Service", priority: "high" as const, status: "in_progress" as const, assigned_to: "Agent Priya", resolution_notes: "Contacted service provider. Rescheduled for tomorrow 10 AM.", created_at: "2026-03-11T18:00:00Z", updated_at: "2026-03-12T10:00:00Z" },
];

// ===== STORE INITIALIZATION =====
function initStore<T>(key: string, defaults: T[]): T[] {
  const stored = loadStore<T>(key, defaults);
  if (stored && stored.length > 0) return stored;
  saveStore(key, defaults);
  return [...defaults];
}

export const MOCK_PRODUCTS = initStore('products', DEFAULT_PRODUCTS);
export const MOCK_SERVICES = initStore('services', DEFAULT_SERVICES);
export const MOCK_SERVICE_VENDORS = initStore('service_vendors', DEFAULT_SERVICE_VENDORS);
export const MOCK_CUSTOMERS = initStore('customers', DEFAULT_CUSTOMERS);
export const MOCK_VENDORS = initStore('vendors', DEFAULT_VENDORS);
export const MOCK_ORDERS = initStore('orders', DEFAULT_ORDERS);
export const MOCK_SETTLEMENTS = initStore('settlements', DEFAULT_SETTLEMENTS);
export const MOCK_CLASSIFIEDS = initStore('classifieds', DEFAULT_CLASSIFIEDS);
export const MOCK_POINTS_TRANSACTIONS = initStore('points_transactions', DEFAULT_POINTS_TRANSACTIONS);
export const MOCK_REFERRALS = initStore('referrals', DEFAULT_REFERRALS);
export const MOCK_CATEGORIES = initStore('categories', DEFAULT_CATEGORIES);
export const MOCK_SERVICE_CATEGORIES = initStore('service_categories', DEFAULT_SERVICE_CATEGORIES);
export const MOCK_BANNERS = initStore('banners', DEFAULT_BANNERS);
export const MOCK_PLATFORM_VARIABLES = initStore('platform_variables', DEFAULT_PLATFORM_VARIABLES);
export const MOCK_CLASSIFIED_CATEGORIES = initStore('classified_categories', DEFAULT_CLASSIFIED_CATEGORIES);
export const MOCK_OCCUPATIONS = initStore('occupations', DEFAULT_OCCUPATIONS);
export const MOCK_CITIES = initStore('cities', DEFAULT_CITIES);
export const MOCK_AREAS = initStore('areas', DEFAULT_AREAS);
export const MOCK_TAX_CONFIG = initStore('tax_config', DEFAULT_TAX_CONFIG);
export const MOCK_POPUP_BANNERS = initStore('popup_banners', DEFAULT_POPUP_BANNERS);
export const MOCK_ADVERTISEMENTS = initStore('advertisements', DEFAULT_ADVERTISEMENTS);
export const MOCK_WEBSITE_QUERIES = initStore('website_queries', DEFAULT_WEBSITE_QUERIES);
export const MOCK_REPORT_LOG = initStore('report_log', DEFAULT_REPORT_LOG);
export const MOCK_SUPPORT_TICKETS = initStore('support_tickets', DEFAULT_SUPPORT_TICKETS);

// Helper to persist changes
export function persist(storeName: string, _data?: any) {
  const storeMap: Record<string, any> = {
    products: MOCK_PRODUCTS, services: MOCK_SERVICES, service_vendors: MOCK_SERVICE_VENDORS,
    customers: MOCK_CUSTOMERS, vendors: MOCK_VENDORS, orders: MOCK_ORDERS,
    settlements: MOCK_SETTLEMENTS, classifieds: MOCK_CLASSIFIEDS,
    points_transactions: MOCK_POINTS_TRANSACTIONS, referrals: MOCK_REFERRALS,
    categories: MOCK_CATEGORIES, service_categories: MOCK_SERVICE_CATEGORIES,
    banners: MOCK_BANNERS, platform_variables: MOCK_PLATFORM_VARIABLES,
    classified_categories: MOCK_CLASSIFIED_CATEGORIES, occupations: MOCK_OCCUPATIONS,
    cities: MOCK_CITIES, areas: MOCK_AREAS, tax_config: MOCK_TAX_CONFIG,
    popup_banners: MOCK_POPUP_BANNERS, advertisements: MOCK_ADVERTISEMENTS,
    website_queries: MOCK_WEBSITE_QUERIES, report_log: MOCK_REPORT_LOG,
    support_tickets: MOCK_SUPPORT_TICKETS,
  };
  if (storeMap[storeName]) saveStore(storeName, storeMap[storeName]);
}
