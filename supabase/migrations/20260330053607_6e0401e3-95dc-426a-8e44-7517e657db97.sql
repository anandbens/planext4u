
-- Property types enum
CREATE TYPE public.property_transaction_type AS ENUM ('rent', 'sale', 'lease', 'pg');
CREATE TYPE public.property_type AS ENUM ('apartment', 'independent_house', 'villa', 'plot', 'pg_hostel', 'commercial_office', 'commercial_shop', 'commercial_warehouse', 'commercial_showroom');
CREATE TYPE public.property_posted_by AS ENUM ('owner', 'agent', 'builder');
CREATE TYPE public.property_furnishing AS ENUM ('unfurnished', 'semi_furnished', 'fully_furnished');
CREATE TYPE public.property_facing AS ENUM ('north', 'south', 'east', 'west', 'north_east', 'north_west', 'south_east', 'south_west');
CREATE TYPE public.property_status AS ENUM ('draft', 'submitted', 'active', 'rejected', 'paused', 'expired', 'sold');
CREATE TYPE public.property_parking AS ENUM ('none', 'two_wheeler', 'four_wheeler', 'both');

-- Main properties table
CREATE TABLE public.properties (
  id TEXT NOT NULL PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT DEFAULT '',
  transaction_type property_transaction_type NOT NULL DEFAULT 'rent',
  property_type property_type NOT NULL DEFAULT 'apartment',
  posted_by property_posted_by NOT NULL DEFAULT 'owner',
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  city TEXT DEFAULT '',
  locality TEXT DEFAULT '',
  landmark TEXT DEFAULT '',
  pincode TEXT DEFAULT '',
  latitude DOUBLE PRECISION DEFAULT 0,
  longitude DOUBLE PRECISION DEFAULT 0,
  bhk TEXT DEFAULT '',
  area_sqft NUMERIC DEFAULT 0,
  floor_number INTEGER DEFAULT 0,
  total_floors INTEGER DEFAULT 0,
  age_of_property TEXT DEFAULT '',
  facing property_facing DEFAULT NULL,
  furnishing property_furnishing DEFAULT 'unfurnished',
  parking property_parking DEFAULT 'none',
  availability_date DATE DEFAULT NULL,
  amenities JSONB DEFAULT '[]'::jsonb,
  price NUMERIC NOT NULL DEFAULT 0,
  maintenance_charges NUMERIC DEFAULT 0,
  security_deposit NUMERIC DEFAULT 0,
  price_negotiable BOOLEAN DEFAULT false,
  preferred_tenant TEXT DEFAULT 'any',
  images JSONB DEFAULT '[]'::jsonb,
  video_url TEXT DEFAULT '',
  virtual_tour_url TEXT DEFAULT '',
  status property_status NOT NULL DEFAULT 'draft',
  rejection_reason TEXT DEFAULT '',
  views_count INTEGER DEFAULT 0,
  contact_reveals INTEGER DEFAULT 0,
  enquiry_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  is_boosted BOOLEAN DEFAULT false,
  boost_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  pg_room_type TEXT DEFAULT '',
  pg_gender_preference TEXT DEFAULT '',
  pg_meals_included JSONB DEFAULT '[]'::jsonb,
  pg_rules JSONB DEFAULT '[]'::jsonb,
  pg_facilities JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Property enquiries
CREATE TABLE public.property_enquiries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  seeker_id TEXT NOT NULL,
  seeker_name TEXT DEFAULT '',
  seeker_phone TEXT DEFAULT '',
  message TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Property visits
CREATE TABLE public.property_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  seeker_id TEXT NOT NULL,
  seeker_name TEXT DEFAULT '',
  visit_date DATE NOT NULL,
  visit_time TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested',
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Property bookmarks/saved
CREATE TABLE public.property_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(property_id, user_id)
);

-- Property plans / subscriptions
CREATE TABLE public.property_plans (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  price NUMERIC NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 30,
  listing_limit INTEGER NOT NULL DEFAULT 5,
  contact_reveal_limit INTEGER NOT NULL DEFAULT 10,
  visibility_boost BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Property localities (for admin-managed locality list)
CREATE TABLE public.property_localities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  city TEXT NOT NULL,
  name TEXT NOT NULL,
  is_popular BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Property reports (abuse/fraud)
CREATE TABLE public.property_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id TEXT NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  details TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS for properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Properties are publicly readable" ON public.properties FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage properties" ON public.properties FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Users can insert own properties" ON public.properties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own properties" ON public.properties FOR UPDATE TO authenticated USING (user_id = get_customer_id(auth.uid()));

-- RLS for property_enquiries
ALTER TABLE public.property_enquiries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enquiries are publicly readable" ON public.property_enquiries FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert enquiries" ON public.property_enquiries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage enquiries" ON public.property_enquiries FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- RLS for property_visits
ALTER TABLE public.property_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visits are publicly readable" ON public.property_visits FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can insert visits" ON public.property_visits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage visits" ON public.property_visits FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- RLS for property_bookmarks
ALTER TABLE public.property_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bookmarks are publicly readable" ON public.property_bookmarks FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated can manage bookmarks" ON public.property_bookmarks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Anon can read bookmarks" ON public.property_bookmarks FOR SELECT TO anon USING (true);

-- RLS for property_plans
ALTER TABLE public.property_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plans are publicly readable" ON public.property_plans FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage plans" ON public.property_plans FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- RLS for property_localities
ALTER TABLE public.property_localities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Localities are publicly readable" ON public.property_localities FOR SELECT TO public USING (true);
CREATE POLICY "Admins can manage localities" ON public.property_localities FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- RLS for property_reports
ALTER TABLE public.property_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reports are publicly readable" ON public.property_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert reports" ON public.property_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage reports" ON public.property_reports FOR ALL TO authenticated USING (is_admin_user(auth.uid())) WITH CHECK (is_admin_user(auth.uid()));

-- Seed some demo data
INSERT INTO public.property_plans (id, name, description, price, duration_days, listing_limit, contact_reveal_limit, visibility_boost) VALUES
  ('PLAN-FREE', 'Free', 'Basic listing plan', 0, 30, 1, 5, false),
  ('PLAN-STD', 'Standard', 'Standard listing plan with more features', 499, 60, 5, 25, false),
  ('PLAN-PREM', 'Premium', 'Premium plan with unlimited features', 999, 90, 20, 100, true);

-- Seed some localities
INSERT INTO public.property_localities (city, name, is_popular) VALUES
  ('Coimbatore', 'RS Puram', true),
  ('Coimbatore', 'Gandhipuram', true),
  ('Coimbatore', 'Peelamedu', true),
  ('Coimbatore', 'Saibaba Colony', true),
  ('Coimbatore', 'Singanallur', false),
  ('Coimbatore', 'Ganapathy', false),
  ('Coimbatore', 'Vadavalli', false),
  ('Coimbatore', 'Thudiyalur', false),
  ('Chennai', 'Anna Nagar', true),
  ('Chennai', 'T Nagar', true),
  ('Chennai', 'Adyar', true),
  ('Chennai', 'Velachery', true),
  ('Bangalore', 'Koramangala', true),
  ('Bangalore', 'Whitefield', true),
  ('Bangalore', 'Indiranagar', true),
  ('Bangalore', 'HSR Layout', true);

-- Seed demo properties
INSERT INTO public.properties (id, user_id, user_name, transaction_type, property_type, posted_by, title, description, city, locality, pincode, bhk, area_sqft, floor_number, total_floors, age_of_property, facing, furnishing, parking, price, maintenance_charges, security_deposit, price_negotiable, preferred_tenant, amenities, images, status, is_verified) VALUES
  ('PROP-001', 'USR-001', 'Rahul Sharma', 'rent', 'apartment', 'owner', '2 BHK Fully Furnished Apartment in RS Puram', 'Spacious 2 BHK apartment with modern amenities. Well-maintained building with 24/7 security. Close to schools, hospitals, and shopping malls. Ideal for small families.', 'Coimbatore', 'RS Puram', '641002', '2', 1100, 3, 5, '1-3', 'east', 'fully_furnished', 'both', 18000, 2000, 50000, true, 'family', '["Lift", "Security Guard", "CCTV", "Power Backup", "Water Supply 24x7", "Gym"]', '[]', 'active', true),
  ('PROP-002', 'USR-001', 'Priya Kumar', 'sale', 'villa', 'owner', 'Luxurious 4 BHK Villa with Garden in Saibaba Colony', 'Beautiful independent villa with private garden and parking. Premium location with all amenities nearby. Modern interiors with Italian marble flooring.', 'Coimbatore', 'Saibaba Colony', '641011', '4', 2800, 0, 2, '3-5', 'north', 'fully_furnished', 'both', 15000000, 5000, 0, true, 'any', '["Swimming Pool", "Garden", "Power Backup", "Water Supply 24x7", "CCTV", "Security Guard", "Club House", "Children Play Area"]', '[]', 'active', true),
  ('PROP-003', 'USR-001', 'Arun M', 'rent', 'apartment', 'agent', '1 BHK Semi-Furnished near Gandhipuram Bus Stand', 'Affordable 1 BHK apartment close to bus stand. Perfect for bachelors or working professionals. All basic amenities available.', 'Coimbatore', 'Gandhipuram', '641012', '1', 650, 2, 4, '5-10', 'west', 'semi_furnished', 'two_wheeler', 8500, 500, 20000, false, 'bachelors', '["Power Backup", "Water Supply 24x7"]', '[]', 'active', false),
  ('PROP-004', 'USR-001', 'Meena R', 'rent', 'pg_hostel', 'owner', 'PG for Working Women in Peelamedu', 'Safe and secure PG accommodation for working women. Meals included. Near IT companies and public transport.', 'Coimbatore', 'Peelamedu', '641004', 'studio', 200, 1, 3, '0-1', 'south', 'fully_furnished', 'two_wheeler', 6500, 0, 6500, false, 'female', '["WiFi", "Power Backup", "Water Supply 24x7", "CCTV", "Security Guard"]', '[]', 'active', true),
  ('PROP-005', 'USR-001', 'Karthik S', 'sale', 'plot', 'builder', 'Premium Plot in Vadavalli - 2400 sq.ft', 'DTCP approved residential plot in prime location. Clear title with all legal documents. Near upcoming metro station.', 'Coimbatore', 'Vadavalli', '641041', '', 2400, 0, 0, '0-1', 'north_east', 'unfurnished', 'none', 4800000, 0, 0, true, 'any', '[]', '[]', 'active', true),
  ('PROP-006', 'USR-001', 'Vijay Kumar', 'rent', 'commercial_office', 'agent', 'Furnished Office Space in Gandhipuram - 1500 sq.ft', 'Fully furnished office space with conference room, workstations, and pantry. High-speed internet ready. Prime commercial location.', 'Coimbatore', 'Gandhipuram', '641012', '', 1500, 5, 8, '3-5', 'north', 'fully_furnished', 'four_wheeler', 45000, 8000, 100000, true, 'company', '["Lift", "Security Guard", "CCTV", "Power Backup", "Intercom", "Fire Safety", "Visitor Parking"]', '[]', 'active', true),
  ('PROP-007', 'USR-001', 'Lakshmi N', 'sale', 'independent_house', 'owner', '3 BHK Independent House in Singanallur', 'Well-built independent house with car parking. Centrally located with easy access to railway station and airport. Vastu-compliant construction.', 'Coimbatore', 'Singanallur', '641005', '3', 1800, 0, 2, '5-10', 'south_east', 'semi_furnished', 'both', 8500000, 3000, 0, true, 'any', '["Power Backup", "Water Supply 24x7", "Garden", "Rainwater Harvesting"]', '[]', 'active', false),
  ('PROP-008', 'USR-001', 'Suresh P', 'rent', 'apartment', 'owner', 'Studio Apartment near IT Park Peelamedu', 'Modern studio apartment ideal for IT professionals. Walking distance to major IT parks. Fully furnished with all appliances.', 'Coimbatore', 'Peelamedu', '641004', 'studio', 450, 8, 12, '0-1', 'west', 'fully_furnished', 'two_wheeler', 12000, 1500, 25000, false, 'any', '["Lift", "Security Guard", "CCTV", "Gym", "Power Backup", "Water Supply 24x7", "Intercom"]', '[]', 'active', true);
