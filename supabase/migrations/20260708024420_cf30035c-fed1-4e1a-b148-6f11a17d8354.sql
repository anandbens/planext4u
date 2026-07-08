
-- Phase 1: fill the four index gaps identified from pg_stat_statements profiling.
-- No structural changes, no policy changes. Indexes only.

-- 1. service_categories: hot query is
--    WHERE status = ? AND parent_id IS NULL ORDER BY display_order
CREATE INDEX IF NOT EXISTS idx_service_categories_status_root_order
  ON public.service_categories (status, display_order)
  WHERE parent_id IS NULL;

-- 2. social_comments: threads paginated by post_id newest-first
CREATE INDEX IF NOT EXISTS idx_social_comments_post_created
  ON public.social_comments (post_id, created_at DESC);

-- 3. food_orders: customer history filtered by status, newest first
CREATE INDEX IF NOT EXISTS idx_food_orders_customer_status_created
  ON public.food_orders (customer_id, status, created_at DESC);

-- 4. vendor_notifications: unread badge + list needs (vendor, is_read, created_at)
--    Column check first — table has `is_read` boolean per the vendor bell component.
CREATE INDEX IF NOT EXISTS idx_vendor_notifications_vendor_read_created
  ON public.vendor_notifications (vendor_id, is_read, created_at DESC);
