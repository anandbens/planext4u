-- Move wrongly-placed product vendors from service_vendors to vendors (only columns that exist in vendors)
INSERT INTO public.vendors (
  id, name, business_name, mobile, email, category_id, city_id, area_id,
  commission_rate, membership, status, rating, plan_id, plan_payment_status,
  plan_transaction_id, shop_photo_url, max_redemption_percentage, kyc_status,
  referred_by, vendor_category, created_at
)
SELECT
  sv.id, sv.name, sv.business_name, sv.mobile, sv.email, sv.category_id, sv.city_id, sv.area_id,
  COALESCE(sv.commission_rate, 10), COALESCE(sv.membership, 'basic'), sv.status,
  COALESCE(sv.rating, 0), sv.plan_id, sv.plan_payment_status, sv.plan_transaction_id,
  COALESCE(sv.shop_photo_url, ''), sv.max_redemption_percentage, sv.kyc_status,
  sv.referred_by, 'product', COALESCE(sv.created_at, now())
FROM public.service_vendors sv
WHERE sv.id IN ('VND-1776101367604', 'VND-1776082606830')
  AND NOT EXISTS (SELECT 1 FROM public.vendors v WHERE v.id = sv.id);

DELETE FROM public.service_vendors WHERE id IN ('VND-1776101367604', 'VND-1776082606830');