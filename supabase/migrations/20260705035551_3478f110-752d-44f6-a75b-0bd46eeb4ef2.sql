
-- coupon_campaigns.vendor_ids uuid[] → text[]
ALTER TABLE public.coupon_campaigns
  ALTER COLUMN vendor_ids TYPE text[] USING COALESCE(vendor_ids::text[], ARRAY[]::text[]);

-- coupon_product_mapping.product_id uuid → text
ALTER TABLE public.coupon_product_mapping
  ALTER COLUMN product_id TYPE text USING product_id::text;
