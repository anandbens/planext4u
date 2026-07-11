
ALTER TABLE public.franchise_plans
  ADD COLUMN IF NOT EXISTS territory text,
  ADD COLUMN IF NOT EXISTS promotion_benefits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS product_visibility text,
  ADD COLUMN IF NOT EXISTS reward_benefits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS redemption_benefits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS key_features jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.vendor_plans
  ADD COLUMN IF NOT EXISTS coverage_type text,
  ADD COLUMN IF NOT EXISTS delivery_radius_km numeric,
  ADD COLUMN IF NOT EXISTS product_visibility text,
  ADD COLUMN IF NOT EXISTS promotion_benefits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS reward_benefits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS redemption_benefits jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS key_features jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS vendor_type text;

CREATE TABLE IF NOT EXISTS public.business_projection_master (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario text NOT NULL,
  scenario_label text NOT NULL,
  scenario_order integer NOT NULL DEFAULT 0,
  category text NOT NULL,
  category_order integer NOT NULL DEFAULT 0,
  investment numeric NOT NULL DEFAULT 0,
  members integer NOT NULL DEFAULT 0,
  turnover numeric NOT NULL DEFAULT 0,
  gross_profit numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  share_pct numeric NOT NULL DEFAULT 0,
  category_profit numeric NOT NULL DEFAULT 0,
  profit_per_person numeric NOT NULL DEFAULT 0,
  spend_1 numeric NOT NULL DEFAULT 0,
  spend_10 numeric NOT NULL DEFAULT 0,
  spend_100 numeric NOT NULL DEFAULT 0,
  spend_1000 numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scenario, category)
);

GRANT SELECT ON public.business_projection_master TO anon, authenticated;
GRANT ALL ON public.business_projection_master TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.business_projection_master TO authenticated;

ALTER TABLE public.business_projection_master ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Projections readable by all" ON public.business_projection_master;
CREATE POLICY "Projections readable by all"
  ON public.business_projection_master FOR SELECT
  USING (status = 'active' OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage projections" ON public.business_projection_master;
CREATE POLICY "Admins manage projections"
  ON public.business_projection_master FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.set_bpm_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_bpm_updated ON public.business_projection_master;
CREATE TRIGGER trg_bpm_updated
  BEFORE UPDATE ON public.business_projection_master
  FOR EACH ROW EXECUTE FUNCTION public.set_bpm_updated_at();

INSERT INTO public.franchise_plans (name, category, investment_amount, delivery_radius_km, coverage_type, validity_months, description, sort_order, status, territory, product_visibility, key_features, benefits, features)
SELECT v.name, v.category, v.investment_amount, v.delivery_radius_km, v.coverage_type::public.franchise_coverage_type, v.validity_months, v.description, v.sort_order, v.status::public.franchise_plan_status, v.territory, v.product_visibility, v.key_features::jsonb, v.benefits::jsonb, v.features::jsonb
FROM (VALUES
  ('Nano',   'Nano',   100000::numeric,   2::numeric,   'radius', 12, '₹1 Lakh investment — 2 KM radius neighbourhood franchise', 1, 'active',   'Neighbourhood', 'Local',   '["Neighbourhood coverage","Local promotion","Standard rewards"]', '["Local delivery","Community outreach"]', '["Local delivery","Community outreach"]'),
  ('Micro',  'Micro',  500000::numeric,   5::numeric,   'radius', 12, '₹5 Lakhs investment — 5 KM radius micro franchise',       2, 'active',   'Locality',      'City',    '["5 KM coverage","Enhanced promotion","Priority rewards"]', '["Extended delivery","City-level promotion"]', '["Extended delivery","City-level promotion"]'),
  ('Mini',   'Mini',   1000000::numeric,  10::numeric,  'city',   24, '₹10 Lakhs investment — 10 KM radius mini franchise',      3, 'active',   'Zone',          'City+',   '["10 KM coverage","Zone promotion","Premium rewards"]', '["Zone-wide delivery","Enhanced visibility"]', '["Zone-wide delivery","Enhanced visibility"]'),
  ('Master', 'Master', 10000000::numeric, 100::numeric, 'state',  60, '₹1 Crore investment — 100 KM radius master franchise',    4, 'active',   'District/State','Regional','["100 KM coverage","State-level promotion","Elite rewards","Territory rights"]', '["Regional distribution","Master rights","Elite visibility"]', '["Regional distribution","Master rights","Elite visibility"]')
) AS v(name, category, investment_amount, delivery_radius_km, coverage_type, validity_months, description, sort_order, status, territory, product_visibility, key_features, benefits, features)
WHERE NOT EXISTS (SELECT 1 FROM public.franchise_plans fp WHERE lower(fp.name) = lower(v.name));

INSERT INTO public.business_projection_master
(scenario, scenario_label, scenario_order, category, category_order, investment, members, turnover, gross_profit, net_profit, share_pct, category_profit, profit_per_person, spend_1, spend_10, spend_100, spend_1000)
VALUES
('1_lakh','1 Lakh Users',1,'Micro',1,500000,100,3000000,300000,150000,9,13500,135,135,1350,13500,135000),
('1_lakh','1 Lakh Users',1,'Mini',2,1000000,22,3000000,300000,150000,8,12000,545.45,545,5450,54500,545000),
('1_lakh','1 Lakh Users',1,'Master',3,10000000,2,3000000,300000,150000,7,10500,5250,5250,52500,525000,5250000),
('5_lakh','5 Lakh Users',2,'Micro',1,500000,100,15000000,1500000,750000,9,67500,675,675,6750,67500,675000),
('5_lakh','5 Lakh Users',2,'Mini',2,1000000,22,15000000,1500000,750000,8,60000,2727.27,2727,27270,272700,2727000),
('5_lakh','5 Lakh Users',2,'Master',3,10000000,2,15000000,1500000,750000,7,52500,26250,26250,262500,2625000,26250000),
('10_lakh','10 Lakh Users',3,'Micro',1,500000,100,30000000,3000000,1500000,9,135000,1350,1350,13500,135000,1350000),
('10_lakh','10 Lakh Users',3,'Mini',2,1000000,22,30000000,3000000,1500000,8,120000,5454.55,5455,54550,545500,5455000),
('10_lakh','10 Lakh Users',3,'Master',3,10000000,2,30000000,3000000,1500000,7,105000,52500,52500,525000,5250000,52500000),
('50_lakh','50 Lakh Users',4,'Micro',1,500000,100,150000000,15000000,7500000,9,675000,6750,6750,67500,675000,6750000),
('50_lakh','50 Lakh Users',4,'Mini',2,1000000,22,150000000,15000000,7500000,8,600000,27272.73,27272,272720,2727200,27272000),
('50_lakh','50 Lakh Users',4,'Master',3,10000000,2,150000000,15000000,7500000,7,525000,262500,262500,2625000,26250000,262500000),
('1_crore','1 Crore Users',5,'Micro',1,500000,100,300000000,30000000,15000000,9,1350000,13500,13500,135000,1350000,13500000),
('1_crore','1 Crore Users',5,'Mini',2,1000000,22,300000000,30000000,15000000,8,1200000,54545.45,54545,545450,5454500,54545000),
('1_crore','1 Crore Users',5,'Master',3,10000000,2,300000000,30000000,15000000,7,1050000,525000,525000,5250000,52500000,525000000)
ON CONFLICT (scenario, category) DO NOTHING;

INSERT INTO public.platform_variables (id, key, value, description)
VALUES (
  'company_bank_details',
  'company_bank_details',
  '{"account_name":"PLANEXT4U ALL SOLUTIONS INDIA PRIVATE LIMITED","account_number":"20430210003619","account_type":"CAA","ifsc":"UCBA0002043","bank":"UCO Bank","branch":"COIMBATORE MCC","branch_address":"671/449 Avinashi Road, Coimbatore, Tamil Nadu 641004","upi_id":""}',
  'Company bank account for vendor & franchise registration payments'
)
ON CONFLICT (id) DO NOTHING;
