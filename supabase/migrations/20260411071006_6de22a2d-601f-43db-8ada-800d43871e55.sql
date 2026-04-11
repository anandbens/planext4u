
-- Create CMS pages table
CREATE TABLE public.cms_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active',
  meta_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CMS pages are publicly readable"
ON public.cms_pages FOR SELECT
USING (status = 'active');

CREATE POLICY "Admins can manage CMS pages"
ON public.cms_pages FOR ALL
TO authenticated
USING (public.is_admin_user(auth.uid()))
WITH CHECK (public.is_admin_user(auth.uid()));

CREATE TRIGGER update_cms_pages_updated_at
BEFORE UPDATE ON public.cms_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add cooling_status to points_transactions
ALTER TABLE public.points_transactions
ADD COLUMN IF NOT EXISTS cooling_status TEXT NOT NULL DEFAULT 'credited';

-- Add platform variables for expiry and cooling
INSERT INTO public.platform_variables (id, key, value, description)
VALUES
  (gen_random_uuid()::text, 'points_expiry_days', '60', 'Number of days after which earned points expire (FIFO)'),
  (gen_random_uuid()::text, 'expiry_reminder_days', '10', 'Days before expiry to send reminder notification to user'),
  (gen_random_uuid()::text, 'referral_cooling_enabled', '1', 'Enable referral cooling period (1=on, 0=off). When on, referral points stay pending until referred user places first order')
ON CONFLICT DO NOTHING;

-- Seed default CMS pages
INSERT INTO public.cms_pages (slug, title, content, status) VALUES
('terms-and-conditions', 'Terms and Conditions', '<h2>Wallet Points Terms & Conditions</h2>
<p>Wallet Points can be redeemed Based on the P4U Vendor/Service Provider as per the Category from 5% to 100%.</p>
<p>Limited Period (Management Decision based on the vendor offers) points should be redeemed within the mentioned period. Otherwise that points will be Expired.</p>
<p>1 point is equals to 1 ruppee.</p>
<p>Wallet points should not be withdrawn by Cash(INR).</p>
<p>Wallet points can only redeem it through P4U registered vendors or service providers.</p>
<p>Users can redeem the points from the available vendors/Service Providers in P4U App only.</p>
<p>We may terminate or modify the Program at any time without notice.</p>
<p>We are not responsible for any taxes or fees associated with rewards.</p>
<p>These Terms shall be governed by and construed in accordance with Indian Government law.</p>
<p>By participating in the Program, you acknowledge that you have read, understand, and agree to these Terms and Conditions.</p>
<p>We may update these Terms at any time. Your continued participation in the Program constitutes acceptance of any changes.</p>', 'active'),
('privacy-policy', 'Privacy Policy', '<h2>Privacy Policy</h2>
<p>Your privacy is important to us. This policy outlines how we collect, use, and protect your personal information when using the P4U platform.</p>
<p>We collect information you provide during registration, orders, and interactions with the platform.</p>
<p>Your data is used to provide services, process transactions, and improve your experience.</p>
<p>We do not sell your personal information to third parties.</p>
<p>We implement industry-standard security measures to protect your data.</p>
<p>You may request deletion of your account and associated data at any time.</p>', 'active'),
('wallet-points-structure', 'Wallet Points Structure', '<h2>How Points Work</h2>
<p><strong>Welcome Bonus:</strong> Get 300 points when you register on P4U.</p>
<p><strong>Customer Referral:</strong> Earn 100 points when your referred friend makes their first purchase.</p>
<p><strong>Vendor Referral:</strong> Earn 200 points when a vendor you referred registers successfully.</p>
<p><strong>Post Share:</strong> Earn 1 point every time you share a post on Socio.</p>
<p><strong>Post Liked:</strong> Earn 1 point when someone likes your post.</p>
<p><strong>Story Liked:</strong> Earn 1 point when someone likes your story.</p>
<h3>Redemption Rules</h3>
<p>1 point = ₹1. Points can be redeemed against orders placed on P4U platform only.</p>
<p>Points expire 60 days after earning if not redeemed.</p>
<p>Maximum redemption percentage depends on the vendor/product configuration.</p>', 'active')
ON CONFLICT (slug) DO NOTHING;
