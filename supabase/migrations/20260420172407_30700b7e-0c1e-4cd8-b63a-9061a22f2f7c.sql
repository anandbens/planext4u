ALTER TABLE public.points_transactions DROP CONSTRAINT IF EXISTS points_transactions_type_check;
ALTER TABLE public.points_transactions ADD CONSTRAINT points_transactions_type_check
  CHECK (type IN ('welcome','referral','order_reward','post_like','post_share','story_liked','vendor_referral','refund','redemption'));