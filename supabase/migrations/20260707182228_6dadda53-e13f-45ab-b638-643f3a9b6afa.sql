
-- Enable trigram extension for fast ILIKE search on text columns.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =========================
-- products
-- =========================
-- Fast ILIKE '%q%' search on the fields used by the storefront search bar.
CREATE INDEX IF NOT EXISTS idx_products_title_trgm
  ON public.products USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_category_name_trgm
  ON public.products USING gin (category_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_vendor_name_trgm
  ON public.products USING gin (vendor_name gin_trgm_ops);

-- Category-filtered browse pages: status + category_name ORDER BY created_at DESC.
CREATE INDEX IF NOT EXISTS idx_products_status_category_created
  ON public.products (status, category_name, created_at DESC);

-- =========================
-- customers
-- =========================
-- Email lookup used by auth / registration validation.
CREATE INDEX IF NOT EXISTS idx_customers_email
  ON public.customers (email)
  WHERE status <> 'deleted';

-- Trigram search on customer name for admin search.
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
  ON public.customers USING gin (name gin_trgm_ops);

-- =========================
-- orders
-- =========================
-- "My orders" list: filter by customer_id, sort by created_at DESC.
CREATE INDEX IF NOT EXISTS idx_orders_customer_created
  ON public.orders (customer_id, created_at DESC);

-- Status-filtered order history (e.g. active vs delivered).
CREATE INDEX IF NOT EXISTS idx_orders_customer_status_created
  ON public.orders (customer_id, status, created_at DESC);

-- =========================
-- categories
-- =========================
-- Every screen queries active categories ordered by display_order, name.
CREATE INDEX IF NOT EXISTS idx_categories_status_order_name
  ON public.categories (status, display_order, name);
