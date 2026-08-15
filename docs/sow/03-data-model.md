# 03 — Data Model

Complete relational specification, grouped by **owning service**. Each Laravel microservice owns its tables exclusively: no other service reads or writes them directly, no cross-service foreign keys, and no cross-service joins. References that cross a service boundary are stored as plain identifier columns and resolved either through the owning service's API or through a locally maintained read model kept current by domain events (see `13-events-and-async.md`).

Target engine: **PostgreSQL 16 with the PostGIS extension**. Column types below are given as the PostgreSQL type to create. `uuid` primary keys default to `gen_random_uuid()`; every table carries `created_at timestamptz not null default now()` and, where mutable, `updated_at timestamptz` maintained by a shared `set_updated_at()` trigger.

## Service ownership matrix

| Owning service | Tables | Count |
|---|---|---|
| Identity & Account | `customer_addresses`, `customers`, `login_logs`, `occupations`, `otp_requests`, `points_transactions`, `profiles`, `referrals`, `user_devices`, `user_roles` | 10 |
| Catalog | `categories`, `inventory_log`, `media_library`, `parent_items`, `product_attribute_map`, `product_attribute_values`, `product_attributes`, `product_variant_images`, `product_variants`, `products`, `reviews`, `service_categories`, `services` | 13 |
| Orders | `cart_rule_applications`, `cart_rules`, `delivery_proofs`, `dropshipping_orders`, `order_invoices`, `order_payments`, `order_refunds`, `orders`, `service_bookings` | 9 |
| Payments & Settlement | `country_invoice_config`, `country_payment_gateways`, `country_tax_rules`, `credit_notes`, `invoice_sequences`, `payment_receipts`, `payment_records`, `platform_fee_invoices`, `receipt_sequences`, `rent_payments`, `settlements`, `tax_config`, `tax_slabs`, `vendor_tds_ledger` | 14 |
| Promotions & Content | `advertisements`, `banners`, `cms_pages`, `coupon_analytics`, `coupon_audit_log`, `coupon_campaigns`, `coupon_codes`, `coupon_customer_mapping`, `coupon_geo_mapping`, `coupon_notifications`, `coupon_popup_config`, `coupon_popup_dismissals`, `coupon_product_mapping`, `coupon_recommendation_log`, `coupon_redemptions`, `coupon_reservations`, `coupon_rollback_history`, `coupon_usage_history`, `coupon_vendor_mapping`, `homepage_analytics`, `homepage_banners`, `homepage_layout_sections`, `homepage_layouts`, `homepage_section_items`, `homepage_sections`, `homes_cms`, `onboarding_screens`, `popup_banners`, `splash_screens`, `video_ads` | 30 |
| Vendor | `dropshipping_supplier_products`, `dropshipping_suppliers`, `kyc_documents`, `service_vendors`, `vendor_applications`, `vendor_availability`, `vendor_bank_accounts`, `vendor_date_overrides`, `vendor_dropshipping_settings`, `vendor_notifications`, `vendor_onboarding_screens`, `vendor_plans`, `vendors` | 13 |
| Food Delivery | `food_cancellation_reasons`, `food_coupon_redemptions`, `food_coupons`, `food_invoices`, `food_order_chats`, `food_order_status_history`, `food_orders`, `food_payments`, `food_refunds`, `food_review_helpful`, `food_reviews`, `menu_categories`, `menu_combos`, `menu_item_notify_requests`, `menu_items`, `restaurants` | 16 |
| Homes / Real Estate | `properties`, `property_amenities`, `property_bookmarks`, `property_enquiries`, `property_filter_options`, `property_localities`, `property_messages`, `property_plans`, `property_reports`, `property_visits`, `saved_searches` | 11 |
| Socio (Social Network) | `call_ice_candidates`, `calls`, `message_backups`, `social_audio`, `social_bookmarks`, `social_channels`, `social_comment_likes`, `social_comments`, `social_config`, `social_conversations`, `social_follows`, `social_hashtags`, `social_highlights`, `social_likes`, `social_message_reactions`, `social_messages`, `social_notes`, `social_notifications`, `social_posts`, `social_profiles`, `social_reports`, `social_shares`, `social_stories`, `social_story_views` | 24 |
| Classifieds | `classified_ads`, `classified_categories` | 2 |
| Franchise | `active_franchises`, `business_projection_master`, `franchise_plans`, `franchise_registrations` | 4 |
| Logistics & Dispatch | `rider_assignments`, `rider_locations`, `rider_payouts`, `rider_settlements`, `riders` | 5 |
| Notifications & Messaging | `complaint_messages`, `complaints`, `customer_notifications`, `email_send_log`, `email_send_state`, `email_subscriptions`, `email_unsubscribe_tokens`, `support_ticket_messages`, `support_tickets`, `suppressed_emails` | 10 |
| Trust & Safety | `fraud_alerts`, `fraud_blacklist`, `fraud_device_fingerprints`, `fraud_evaluations`, `fraud_rate_limits`, `fraud_rules` | 6 |
| Platform & Admin | `activity_logs`, `areas`, `audit_logs`, `cities`, `countries`, `country_switch_log`, `districts`, `file_upload_rows`, `file_uploads`, `odoo_config`, `odoo_sync_log`, `platform_settings`, `platform_variables`, `report_log`, `restaurant_rating_summary`, `states`, `video_processing_jobs`, `website_queries` | 18 |

**Total: 185 tables.**

## Enumerated types

Declared once per owning service schema. Where a value set is expected to change at runtime (status vocabularies driven by admin configuration), the rebuild should prefer a lookup table over a native enum; the sets below record current behaviour.

- `active_franchise_status` — `active`, `suspended`, `expired`, `cancelled`
- `app_role` — `admin`, `finance`, `sales`, `vendor`, `customer`, `rider`
- `franchise_coverage_type` — `radius`, `city`, `district`, `state`
- `franchise_plan_status` — `active`, `inactive`
- `franchise_registration_status` — `draft`, `pending`, `approved`, `rejected`, `converted`, `closed`
- `payment_entity_type` — `vendor`, `franchise`
- `payment_mode_type` — `upi`, `bank_transfer`, `neft`, `rtgs`, `cash`, `cheque`
- `payment_status_type` — `paid`, `pending`, `partial`
- `property_facing` — `north`, `south`, `east`, `west`, `north_east`, `north_west`, `south_east`, `south_west`
- `property_furnishing` — `unfurnished`, `semi_furnished`, `fully_furnished`
- `property_parking` — `none`, `two_wheeler`, `four_wheeler`, `both`
- `property_posted_by` — `owner`, `agent`, `builder`
- `property_status` — `draft`, `submitted`, `active`, `rejected`, `paused`, `expired`, `sold`
- `property_transaction_type` — `rent`, `sale`, `lease`, `pg`
- `property_type` — `apartment`, `independent_house`, `villa`, `plot`, `pg_hostel`, `commercial_office`, `commercial_shop`, `commercial_warehouse`, `commercial_showroom`

## Identity & Account service

### `customer_addresses`

Live row count at capture: 203.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `customer_id` | `text` | no |  |
| `label` | `text` | no | default `'Home'` |
| `type` | `text` | no | default `'home'` |
| `address_line` | `text` | no |  |
| `city` | `text` | no | default `''` |
| `pincode` | `text` | no | default `''` |
| `is_default` | `bool` | yes | default `false` |
| `created_at` | `timestamptz` | yes | default `now()` |
| `updated_at` | `timestamptz` | yes | default `now()` |
| `latitude` | `float8` | yes | default `0` |
| `longitude` | `float8` | yes | default `0` |
| `postal_code` | `text` | yes |  |
| `country_code` | `text` | no | default `'IN'` |

Indexes:

- `idx_customer_addresses_customer_id` — public.customer_addresses USING btree (customer_id)

### `customers`

Live row count at capture: 171.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `name` | `text` | no |  |
| `mobile` | `text` | no | default `''` |
| `email` | `text` | no | default `''` |
| `city_id` | `text` | yes |  |
| `area_id` | `text` | yes |  |
| `latitude` | `float8` | no | default `0` |
| `longitude` | `float8` | no | default `0` |
| `wallet_points` | `int4` | no | default `0` |
| `referral_code` | `text` | no | default `''` |
| `referred_by` | `text` | yes |  |
| `status` | `text` | no | default `'active'` |
| `occupation` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `dob` | `date` | yes |  |
| `gender` | `text` | yes | default `'Male'` |
| `about` | `text` | yes | default `''` |
| `profile_photo` | `text` | yes | default `''` |
| `kyc_status` | `text` | yes | default `'not_started'` |
| `profile_completeness` | `int4` | yes | default `0` |
| `deleted_at` | `timestamptz` | yes |  |
| `deletion_reason` | `text` | yes |  |
| `country_code` | `text` | no | default `'IN'` |
| `currency_code` | `text` | no | default `'INR'` |
| `tax_id` | `text` | yes |  |
| `tax_id_type` | `text` | yes |  |

Indexes:

- `idx_customers_email` — public.customers USING btree (email) WHERE (status <> 'deleted'::text)
- `idx_customers_mobile` — public.customers USING btree (mobile)
- `idx_customers_mobile_status_created` — public.customers USING btree (mobile, status, created_at DESC)
- `idx_customers_mobile_trgm` — public.customers USING gin (mobile gin_trgm_ops)
- `idx_customers_name_trgm` — public.customers USING gin (name gin_trgm_ops)

### `login_logs`

Live row count at capture: 317.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `role` | `text` | no | default `'customer'` |
| `portal` | `text` | no | default `'customer'` |
| `login_method` | `text` | no | default `'phone_otp'` |
| `ip_address` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_login_logs_created_at` — public.login_logs USING btree (created_at DESC)
- `idx_login_logs_user_id` — public.login_logs USING btree (user_id)

### `occupations`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `name` | `text` | no |  |
| `status` | `text` | no | default `'active'` |
| `customer_count` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |

### `otp_requests`

Live row count at capture: 290.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `phone_number` | `text` | no | **PK** |
| `request_count` | `int4` | no | default `0` |
| `last_requested_at` | `timestamptz` | no | default `now()` |

### `points_transactions`

Live row count at capture: 246.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `user_id` | `text` | no |  |
| `type` | `text` | no |  |
| `points` | `int4` | no | default `0` |
| `description` | `text` | no | default `''` |
| `user_name` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |
| `expires_at` | `timestamptz` | yes |  |
| `is_expired` | `bool` | no | default `false` |
| `cooling_status` | `text` | no | default `'credited'` |
| `dedupe_key` | `text` | yes |  |

Indexes:

- `idx_points_transactions_user_created` — public.points_transactions USING btree (user_id, created_at DESC)
- `idx_points_tx_dedupe` — unique public.points_transactions USING btree (dedupe_key) WHERE (dedupe_key IS NOT NULL)
- `points_transactions_dedupe_key_uidx` — unique public.points_transactions USING btree (dedupe_key) WHERE (dedupe_key IS NOT NULL)

### `profiles`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** |
| `name` | `text` | no | default `''` |
| `email` | `text` | no | default `''` |
| `mobile` | `text` | yes | default `''` |
| `avatar_url` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |

### `referrals`

Live row count at capture: 75.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `referrer_id` | `text` | no |  |
| `referee_id` | `text` | no |  |
| `status` | `text` | no | default `'pending'` |
| `points_awarded` | `int4` | no | default `0` |
| `referrer_name` | `text` | yes | default `''` |
| `referee_name` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |
| `cooling_until` | `timestamptz` | yes |  |
| `first_order_placed` | `bool` | no | default `false` |
| `bonus_credited` | `bool` | no | default `false` |

### `user_devices`

Live row count at capture: 411.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `text` | no |  |
| `device_id` | `text` | no | default `''` |
| `platform` | `text` | no | default `'web'` |
| `push_token` | `text` | yes | default `''` |
| `onboarding_completed` | `bool` | no | default `false` |
| `first_login` | `timestamptz` | no | default `now()` |
| `created_at` | `timestamptz` | no | default `now()` |
| `app_version` | `text` | no | default `''` |

Indexes:

- `user_devices_user_id_device_id_key` — unique public.user_devices USING btree (user_id, device_id)

### `user_roles`

Live row count at capture: 298.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `role` | `app_role` | no | enum `app_role` |
| `vendor_id` | `text` | yes |  |
| `customer_id` | `text` | yes |  |
| `password_set` | `bool` | no | default `false` |

Indexes:

- `idx_user_roles_customer_role` — public.user_roles USING btree (customer_id, role) WHERE (customer_id IS NOT NULL)
- `idx_user_roles_vendor_role` — public.user_roles USING btree (vendor_id, role) WHERE (vendor_id IS NOT NULL)
- `user_roles_user_id_role_key` — unique public.user_roles USING btree (user_id, role)

## Catalog service

### `categories`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `name` | `text` | no |  |
| `parent_id` | `text` | yes |  |
| `image` | `text` | yes | default `''` |
| `status` | `text` | no | default `'active'` |
| `count` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `banner_image` | `text` | yes | default `''` |
| `icon` | `text` | yes | default `''` |
| `is_trending` | `bool` | yes | default `false` |
| `description` | `text` | yes | default `''` |
| `is_emergency` | `bool` | yes | default `false` |
| `verification_status` | `text` | yes | default `'unverified'` |
| `commission_rate` | `numeric` | yes |  |
| `promotion_banner_url` | `text` | yes |  |
| `promotion_title` | `text` | yes |  |
| `promotion_active` | `bool` | yes | default `false` |
| `display_order` | `int4` | no | default `999` |
| `show_on_homepage` | `bool` | no | default `true` |
| `category_type` | `text` | no | default `'product'` |
| `theme_color` | `text` | yes |  |
| `theme_accent` | `text` | yes |  |

Indexes:

- `idx_categories_category_type` — public.categories USING btree (category_type)
- `idx_categories_display_order` — public.categories USING btree (display_order)
- `idx_categories_show_on_homepage` — public.categories USING btree (show_on_homepage) WHERE (show_on_homepage = true)
- `idx_categories_status_order_name` — public.categories USING btree (status, display_order, name)

### `inventory_log`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `product_id` | `text` | no |  |
| `variant_id` | `uuid` | yes |  |
| `change_qty` | `int4` | no | default `0` |
| `previous_qty` | `int4` | yes | default `0` |
| `new_qty` | `int4` | yes | default `0` |
| `reason` | `text` | yes | default `''` |
| `performed_by` | `uuid` | yes |  |
| `created_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `idx_inventory_log_product` — public.inventory_log USING btree (product_id)

### `media_library`

Live row count at capture: 1.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `file_name` | `text` | no |  |
| `file_url` | `text` | no |  |
| `file_type` | `text` | no | default `'image'` |
| `file_size` | `int4` | yes | default `0` |
| `alt_text` | `text` | yes | default `''` |
| `tags` | `_text` | yes | default `'{}'` |
| `folder` | `text` | yes | default `'general'` |
| `uploaded_by` | `uuid` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `vendor_id` | `text` | yes |  |

### `parent_items`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `name` | `text` | no |  |
| `description` | `text` | yes | default `''` |
| `category_id` | `text` | yes |  |
| `status` | `text` | no | default `'active'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `product_attribute_map`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `product_id` | `text` | no |  |
| `attribute_id` | `uuid` | no |  |
| `created_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `idx_attr_map_product` — public.product_attribute_map USING btree (product_id)
- `product_attribute_map_product_id_attribute_id_key` — unique public.product_attribute_map USING btree (product_id, attribute_id)

### `product_attribute_values`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `attribute_id` | `uuid` | no |  |
| `value` | `text` | no |  |
| `sort_order` | `int4` | yes | default `0` |
| `created_at` | `timestamptz` | yes | default `now()` |
| `hex_color` | `text` | yes | default `''` |
| `display_label` | `text` | yes | default `''` |

### `product_attributes`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `name` | `text` | no |  |
| `attribute_type` | `text` | no | default `'select'` |
| `sort_order` | `int4` | yes | default `0` |
| `is_active` | `bool` | yes | default `true` |
| `created_at` | `timestamptz` | yes | default `now()` |
| `updated_at` | `timestamptz` | yes | default `now()` |

### `product_variant_images`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `variant_id` | `uuid` | no |  |
| `image_url` | `text` | no |  |
| `sort_order` | `int4` | yes | default `0` |
| `is_primary` | `bool` | yes | default `false` |
| `created_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `idx_variant_images_variant` — public.product_variant_images USING btree (variant_id)

### `product_variants`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `product_id` | `text` | no |  |
| `sku` | `text` | yes |  |
| `price` | `numeric` | no | default `0` |
| `compare_at_price` | `numeric` | yes | default `0` |
| `stock_quantity` | `int4` | no | default `0` |
| `stock_status` | `text` | no | default `'in_stock'` |
| `weight` | `numeric` | yes | default `0` |
| `dimensions` | `jsonb` | yes | default `'{}'` |
| `variant_attributes` | `jsonb` | no | default `'{}'` |
| `image_url` | `text` | yes | default `''` |
| `is_active` | `bool` | no | default `true` |
| `sort_order` | `int4` | yes | default `0` |
| `created_at` | `timestamptz` | yes | default `now()` |
| `updated_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `idx_variant_attrs_unique` — unique public.product_variants USING btree (product_id, variant_attributes)
- `idx_variant_sku` — unique public.product_variants USING btree (sku) WHERE ((sku IS NOT NULL) AND (sku <> ''::text))
- `idx_variants_product` — public.product_variants USING btree (product_id)

### `products`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `vendor_id` | `text` | no |  |
| `category_id` | `text` | yes |  |
| `title` | `text` | no |  |
| `description` | `text` | no | default `''` |
| `price` | `numeric` | no | default `0` |
| `tax` | `numeric` | no | default `0` |
| `discount` | `numeric` | no | default `0` |
| `max_points_redeemable` | `int4` | no | default `0` |
| `status` | `text` | no | default `'active'` |
| `vendor_name` | `text` | yes | default `''` |
| `category_name` | `text` | yes | default `''` |
| `emoji` | `text` | yes | default `''` |
| `image` | `text` | yes | default `''` |
| `rating` | `numeric` | yes | default `0` |
| `reviews` | `int4` | yes | default `0` |
| `stock` | `int4` | yes | default `0` |
| `sales` | `int4` | yes | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `rejection_reason` | `text` | yes | default `''` |
| `youtube_video_url` | `text` | yes | default `''` |
| `images` | `jsonb` | yes | default `'[]'` |
| `max_redemption_percentage` | `numeric` | yes |  |
| `short_description` | `text` | yes | default `''` |
| `long_description` | `text` | yes | default `''` |
| `discount_type` | `text` | yes | default `'fixed'` |
| `inactivation_reason` | `text` | yes | default `''` |
| `product_attributes` | `jsonb` | yes | default `'[]'` |
| `tax_slab_id` | `uuid` | yes |  |
| `is_available` | `bool` | yes | default `true` |
| `duration_hours` | `int4` | yes | default `0` |
| `duration_minutes` | `int4` | yes | default `0` |
| `promise_p4u` | `text` | yes | default `''` |
| `helpline_number` | `text` | yes | default `''` |
| `thumbnail_image` | `text` | yes | default `''` |
| `banner_image` | `text` | yes | default `''` |
| `subcategory_id` | `text` | yes |  |
| `subcategory_name` | `text` | yes | default `''` |
| `product_type` | `text` | no | default `'simple'` |
| `sku` | `text` | yes |  |
| `slug` | `text` | yes |  |
| `meta_title` | `text` | yes | default `''` |
| `meta_description` | `text` | yes | default `''` |
| `manage_stock` | `bool` | yes | default `false` |
| `stock_status` | `text` | yes | default `'in_stock'` |
| `weight` | `numeric` | yes | default `0` |
| `dimensions` | `jsonb` | yes | default `'{}'` |
| `parent_item_id` | `text` | yes |  |
| `parent_item_name` | `text` | yes |  |
| `socio_shopping_icon` | `text` | yes |  |
| `commission_override` | `numeric` | yes |  |
| `replacement_time` | `text` | yes | default `'12 Hours'` |
| `sold_count` | `int4` | no | default `0` |
| `hsn_code` | `text` | yes |  |
| `sac_code` | `text` | yes |  |
| `gst_rate` | `numeric` | yes | default `18.00` |
| `uqc` | `text` | yes | default `'NOS'` |
| `is_deal_of_day` | `bool` | no | default `false` |
| `country_code` | `text` | no | default `'IN'` |
| `currency_code` | `text` | no | default `'INR'` |

Indexes:

- `idx_products_category_name_trgm` — public.products USING gin (category_name gin_trgm_ops)
- `idx_products_is_deal_of_day` — public.products USING btree (is_deal_of_day) WHERE (is_deal_of_day = true)
- `idx_products_slug` — unique public.products USING btree (slug) WHERE ((slug IS NOT NULL) AND (slug <> ''::text))
- `idx_products_status_category_created` — public.products USING btree (status, category_name, created_at DESC)
- `idx_products_status_created` — public.products USING btree (status, created_at DESC)
- `idx_products_title_trgm` — public.products USING gin (title gin_trgm_ops)
- `idx_products_vendor_name_trgm` — public.products USING gin (vendor_name gin_trgm_ops)

### `reviews`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `user_name` | `text` | yes |  |
| `entity_type` | `text` | no |  |
| `entity_id` | `text` | no |  |
| `rating` | `int4` | no |  |
| `comment` | `text` | yes |  |
| `booking_id` | `uuid` | yes |  |
| `order_id` | `text` | yes |  |
| `status` | `text` | no | default `'active'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_reviews_entity` — public.reviews USING btree (entity_type, entity_id)
- `idx_reviews_unique_user_entity` — unique public.reviews USING btree (user_id, entity_type, entity_id) WHERE (status = 'active'::text)
- `idx_reviews_user` — public.reviews USING btree (user_id)

### `service_categories`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `name` | `text` | no |  |
| `parent_id` | `text` | yes |  |
| `image` | `text` | no | default `''` |
| `status` | `text` | no | default `'active'` |
| `count` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `banner_image` | `text` | yes | default `''` |
| `icon` | `text` | yes | default `''` |
| `is_trending` | `bool` | yes | default `false` |
| `description` | `text` | yes | default `''` |
| `is_emergency` | `bool` | yes | default `false` |
| `verification_status` | `text` | yes | default `'unverified'` |
| `commission_rate` | `numeric` | yes |  |
| `promotion_banner_url` | `text` | yes |  |
| `promotion_title` | `text` | yes |  |
| `promotion_active` | `bool` | yes | default `false` |
| `display_order` | `int4` | no | default `999` |
| `show_on_homepage` | `bool` | no | default `true` |

Indexes:

- `idx_service_categories_display_order` — public.service_categories USING btree (display_order)
- `idx_service_categories_parent_id` — public.service_categories USING btree (parent_id)
- `idx_service_categories_show_on_homepage` — public.service_categories USING btree (show_on_homepage) WHERE (show_on_homepage = true)
- `idx_service_categories_status_root_order` — public.service_categories USING btree (status, display_order) WHERE (parent_id IS NULL)

### `services`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `vendor_id` | `text` | no |  |
| `category_id` | `text` | yes |  |
| `title` | `text` | no |  |
| `description` | `text` | no | default `''` |
| `price` | `numeric` | no | default `0` |
| `tax` | `numeric` | no | default `0` |
| `discount` | `numeric` | no | default `0` |
| `max_points_redeemable` | `int4` | no | default `0` |
| `status` | `text` | no | default `'active'` |
| `vendor_name` | `text` | yes | default `''` |
| `category_name` | `text` | yes | default `''` |
| `emoji` | `text` | yes | default `''` |
| `image` | `text` | yes | default `''` |
| `rating` | `numeric` | yes | default `0` |
| `reviews` | `int4` | yes | default `0` |
| `service_area` | `text` | yes | default `''` |
| `duration` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |
| `images` | `jsonb` | yes | default `'[]'` |
| `short_description` | `text` | yes |  |
| `long_description` | `text` | yes |  |
| `meta_title` | `text` | yes |  |
| `meta_description` | `text` | yes |  |
| `slug` | `text` | yes |  |
| `pricing_slots` | `jsonb` | yes | default `'[]'` |
| `booking_duration_minutes` | `int4` | yes | default `60` |
| `max_bookings_per_slot` | `int4` | yes | default `1` |
| `updated_at` | `timestamptz` | yes | default `now()` |
| `sac_code` | `text` | yes |  |
| `gst_rate` | `numeric` | no | default `18` |
| `commission_override` | `numeric` | yes |  |
| `max_redemption_percentage` | `numeric` | yes |  |
| `country_code` | `text` | no | default `'IN'` |
| `currency_code` | `text` | no | default `'INR'` |
| `subcategory_id` | `text` | yes |  |
| `subcategory_name` | `text` | yes |  |
| `rejection_reason` | `text` | yes |  |
| `approved_at` | `timestamptz` | yes |  |
| `approved_by` | `uuid` | yes |  |
| `service_duration_minutes` | `int4` | no | default `60` |
| `latitude` | `float8` | yes |  |
| `longitude` | `float8` | yes |  |
| `location_address` | `text` | yes |  |

Indexes:

- `idx_services_latitude` — public.services USING btree (latitude)
- `idx_services_longitude` — public.services USING btree (longitude)
- `idx_services_status` — public.services USING btree (status)
- `idx_services_subcategory` — public.services USING btree (subcategory_id)
- `idx_services_vendor_location` — public.services USING btree (vendor_id, latitude, longitude)

## Orders service

### `cart_rule_applications`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `rule_id` | `uuid` | no |  |
| `rule_name` | `text` | no |  |
| `order_id` | `text` | yes |  |
| `food_order_id` | `text` | yes |  |
| `customer_id` | `text` | no |  |
| `vendor_id` | `text` | yes |  |
| `discount_amount` | `numeric` | no | default `0` |
| `discount_bearer` | `text` | no | default `'p4u'` |
| `bearer_breakup` | `jsonb` | no | default `'{}'` |
| `rule_snapshot` | `jsonb` | yes |  |
| `applied_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_cart_rule_apps_customer` — public.cart_rule_applications USING btree (customer_id)
- `idx_cart_rule_apps_food` — public.cart_rule_applications USING btree (food_order_id) WHERE (food_order_id IS NOT NULL)
- `idx_cart_rule_apps_order` — public.cart_rule_applications USING btree (order_id) WHERE (order_id IS NOT NULL)
- `idx_cart_rule_apps_vendor` — public.cart_rule_applications USING btree (vendor_id) WHERE (vendor_id IS NOT NULL)

### `cart_rules`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `name` | `text` | no |  |
| `description` | `text` | yes |  |
| `country_code` | `text` | no | default `'IN'` |
| `scope` | `text` | no | default `'all'` |
| `module` | `text` | no | default `'ecommerce'` |
| `min_cart_value` | `numeric` | no | default `0` |
| `max_cart_value` | `numeric` | yes |  |
| `conditions` | `jsonb` | no | default `'[]'` |
| `actions` | `jsonb` | no | default `'{}'` |
| `discount_bearer` | `text` | no | default `'p4u'` |
| `bearer_split` | `jsonb` | yes | default `'{"p4u": 100, "vendor": 0}'` |
| `priority` | `int4` | no | default `0` |
| `stackable` | `bool` | no | default `false` |
| `total_uses` | `int4` | no | default `0` |
| `max_total_uses` | `int4` | yes |  |
| `max_uses_per_customer` | `int4` | no | default `0` |
| `starts_at` | `timestamptz` | no | default `now()` |
| `ends_at` | `timestamptz` | yes |  |
| `is_active` | `bool` | no | default `true` |
| `created_by` | `uuid` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_cart_rules_active` — public.cart_rules USING btree (country_code, is_active, module, priority DESC)

### `delivery_proofs`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `order_id` | `text` | no |  |
| `customer_id` | `text` | no |  |
| `confirmation_type` | `text` | no | default `'received_in_person'` |
| `recipient_name` | `text` | yes |  |
| `notes` | `text` | yes |  |
| `photo_url` | `text` | yes |  |
| `submitted_at` | `timestamptz` | no | default `now()` |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_delivery_proofs_order` — unique public.delivery_proofs USING btree (order_id)

### `dropshipping_orders`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `order_id` | `text` | no |  |
| `vendor_id` | `text` | no |  |
| `supplier_id` | `uuid` | no |  |
| `supplier_order_ref` | `text` | yes |  |
| `items` | `jsonb` | no | default `'[]'` |
| `cost_total` | `numeric` | no | default `0` |
| `margin_amount` | `numeric` | no | default `0` |
| `currency_code` | `text` | no | default `'INR'` |
| `status` | `text` | no | default `'pending'` |
| `tracking_number` | `text` | yes |  |
| `tracking_url` | `text` | yes |  |
| `carrier` | `text` | yes |  |
| `forwarded_at` | `timestamptz` | yes |  |
| `expected_delivery_date` | `date` | yes |  |
| `delivered_at` | `timestamptz` | yes |  |
| `notes` | `text` | yes |  |
| `error_message` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_ds_orders_order` — public.dropshipping_orders USING btree (order_id)
- `idx_ds_orders_status` — public.dropshipping_orders USING btree (status, created_at DESC)
- `idx_ds_orders_vendor` — public.dropshipping_orders USING btree (vendor_id)

### `order_invoices`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `invoice_no` | `text` | no |  |
| `order_id` | `text` | no |  |
| `fy_start` | `int4` | no |  |
| `invoice_date` | `timestamptz` | no | default `now()` |
| `vendor_id` | `text` | no |  |
| `vendor_name` | `text` | yes |  |
| `vendor_gstin` | `text` | yes |  |
| `vendor_pan` | `text` | yes |  |
| `vendor_address` | `text` | yes |  |
| `vendor_state` | `text` | yes |  |
| `vendor_state_code` | `text` | yes |  |
| `customer_id` | `text` | no |  |
| `customer_name` | `text` | yes |  |
| `customer_email` | `text` | yes |  |
| `customer_phone` | `text` | yes |  |
| `customer_address` | `text` | yes |  |
| `place_of_supply_state` | `text` | yes |  |
| `place_of_supply_code` | `text` | yes |  |
| `is_interstate` | `bool` | no | default `false` |
| `items` | `jsonb` | no | default `'[]'` |
| `taxable_value` | `numeric` | no | default `0` |
| `cgst_amount` | `numeric` | no | default `0` |
| `sgst_amount` | `numeric` | no | default `0` |
| `igst_amount` | `numeric` | no | default `0` |
| `cess_amount` | `numeric` | no | default `0` |
| `tcs_amount` | `numeric` | no | default `0` |
| `discount` | `numeric` | no | default `0` |
| `round_off` | `numeric` | no | default `0` |
| `total_amount` | `numeric` | no | default `0` |
| `amount_in_words` | `text` | yes |  |
| `pdf_url` | `text` | yes |  |
| `emailed_at` | `timestamptz` | yes |  |
| `cancelled_at` | `timestamptz` | yes |  |
| `notes` | `text` | yes |  |
| `metadata` | `jsonb` | yes | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_order_invoices_date` — public.order_invoices USING btree (invoice_date)
- `idx_order_invoices_order` — public.order_invoices USING btree (order_id)
- `idx_order_invoices_vendor_fy` — public.order_invoices USING btree (vendor_id, fy_start)
- `order_invoices_invoice_no_key` — unique public.order_invoices USING btree (invoice_no)

### `order_payments`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `order_id` | `text` | no |  |
| `customer_id` | `text` | no |  |
| `amount` | `numeric` | no | default `0` |
| `currency` | `text` | no | default `'INR'` |
| `payment_method` | `text` | yes |  |
| `payment_provider` | `text` | no | default `'razorpay'` |
| `txn_type` | `text` | no | default `'capture'` |
| `status` | `text` | no | default `'pending'` |
| `razorpay_order_id` | `text` | yes |  |
| `razorpay_payment_id` | `text` | yes |  |
| `razorpay_signature` | `text` | yes |  |
| `razorpay_refund_id` | `text` | yes |  |
| `gateway_fee` | `numeric` | yes | default `0` |
| `gateway_gst` | `numeric` | yes | default `0` |
| `failure_reason` | `text` | yes |  |
| `metadata` | `jsonb` | yes | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_op_order` — public.order_payments USING btree (order_id)
- `idx_op_status` — public.order_payments USING btree (status)

### `order_refunds`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `order_id` | `text` | no |  |
| `credit_note_id` | `uuid` | yes |  |
| `customer_id` | `text` | no |  |
| `amount` | `numeric` | no |  |
| `reason` | `text` | no | default `'order_cancelled'` |
| `refund_method` | `text` | no | default `'original'` |
| `status` | `text` | no | default `'pending'` |
| `razorpay_refund_id` | `text` | yes |  |
| `initiated_by` | `uuid` | yes |  |
| `initiated_at` | `timestamptz` | no | default `now()` |
| `completed_at` | `timestamptz` | yes |  |
| `notes` | `text` | yes |  |
| `metadata` | `jsonb` | yes | default `'{}'` |

Indexes:

- `idx_or_order` — public.order_refunds USING btree (order_id)

### `orders`

Live row count at capture: 355.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `customer_id` | `text` | no |  |
| `vendor_id` | `text` | no |  |
| `subtotal` | `numeric` | no | default `0` |
| `tax` | `numeric` | no | default `0` |
| `discount` | `numeric` | no | default `0` |
| `points_used` | `int4` | no | default `0` |
| `total` | `numeric` | no | default `0` |
| `status` | `text` | no | default `'placed'` |
| `customer_name` | `text` | yes | default `''` |
| `vendor_name` | `text` | yes | default `''` |
| `items` | `jsonb` | yes | default `'[]'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `delivery_rating` | `int2` | yes |  |
| `rating_comment` | `text` | yes |  |
| `rated_at` | `timestamptz` | yes |  |
| `payment_reference_id` | `text` | yes |  |
| `razorpay_order_id` | `text` | yes |  |
| `platform_fee` | `numeric` | yes | default `0` |
| `gst_on_platform_fee` | `numeric` | yes | default `0` |
| `effective_commission` | `numeric` | yes | default `0` |
| `effective_max_redemption` | `numeric` | yes | default `0` |
| `commission_source` | `text` | yes | default `'plan'` |
| `redemption_source` | `text` | yes | default `'plan'` |
| `shipping_type` | `text` | yes |  |
| `courier_name` | `text` | yes |  |
| `tracking_number` | `text` | yes |  |
| `tracking_url` | `text` | yes |  |
| `shipping_notes` | `text` | yes |  |
| `pod_confirmed` | `bool` | yes |  |
| `pod_confirmed_at` | `timestamptz` | yes |  |
| `customer_notes` | `text` | yes | default `''` |
| `deleted_at` | `timestamptz` | yes |  |
| `deleted_by` | `uuid` | yes |  |
| `deletion_reason` | `text` | yes |  |
| `place_of_supply_state` | `text` | yes |  |
| `place_of_supply_code` | `text` | yes |  |
| `vendor_gstin` | `text` | yes |  |
| `vendor_state` | `text` | yes |  |
| `is_interstate` | `bool` | yes | default `false` |
| `cgst_amount` | `numeric` | yes | default `0` |
| `sgst_amount` | `numeric` | yes | default `0` |
| `igst_amount` | `numeric` | yes | default `0` |
| `tcs_amount` | `numeric` | yes | default `0` |
| `taxable_value` | `numeric` | yes | default `0` |
| `invoice_no` | `text` | yes |  |
| `country_code` | `text` | no | default `'IN'` |
| `currency_code` | `text` | no | default `'INR'` |
| `applied_cart_rules` | `jsonb` | no | default `'[]'` |
| `cart_rule_discount` | `numeric` | no | default `0` |
| `coupon_code` | `text` | yes |  |
| `coupon_campaign_id` | `uuid` | yes |  |
| `coupon_discount` | `numeric` | no | default `0` |
| `coupon_snapshot` | `jsonb` | yes |  |

Indexes:

- `idx_orders_created_status` — public.orders USING btree (created_at, status)
- `idx_orders_customer_created` — public.orders USING btree (customer_id, created_at DESC)
- `idx_orders_customer_status_created` — public.orders USING btree (customer_id, status, created_at DESC)
- `idx_orders_deleted_at` — public.orders USING btree (deleted_at)
- `idx_orders_vendor_created` — public.orders USING btree (vendor_id, created_at)
- `idx_orders_vendor_id` — public.orders USING btree (vendor_id)

### `service_bookings`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `service_id` | `text` | no |  |
| `customer_id` | `text` | no |  |
| `vendor_id` | `text` | no |  |
| `booking_date` | `date` | no |  |
| `start_time` | `time` | no |  |
| `end_time` | `time` | no |  |
| `status` | `text` | no | default `'confirmed'` |
| `payment_status` | `text` | yes | default `'pending'` |
| `notes` | `text` | yes |  |
| `created_at` | `timestamptz` | yes | default `now()` |
| `updated_at` | `timestamptz` | yes | default `now()` |
| `completion_photo_url` | `text` | yes |  |
| `otp_code` | `text` | yes |  |
| `otp_verified_at` | `timestamptz` | yes |  |
| `assigned_vendor_name` | `text` | yes |  |
| `completion_notes` | `text` | yes |  |
| `customer_rating` | `int4` | yes |  |
| `customer_rating_comment` | `text` | yes |  |
| `rated_at` | `timestamptz` | yes |  |
| `razorpay_payment_id` | `text` | yes |  |
| `total_amount` | `numeric` | yes | default `0` |
| `customer_pod_confirmed` | `bool` | yes |  |
| `customer_pod_confirmed_at` | `timestamptz` | yes |  |
| `customer_pod_photo_url` | `text` | yes |  |
| `vendor_completion_confirmed` | `bool` | yes |  |
| `vendor_completion_confirmed_at` | `timestamptz` | yes |  |
| `customer_notes` | `text` | yes | default `''` |
| `service_title` | `text` | yes |  |
| `customer_name` | `text` | yes |  |
| `customer_phone` | `text` | yes |  |
| `customer_address` | `text` | yes |  |
| `sac_code` | `text` | yes |  |
| `subtotal` | `numeric` | no | default `0` |
| `discount` | `numeric` | no | default `0` |
| `taxable_value` | `numeric` | no | default `0` |
| `gst_rate` | `numeric` | no | default `18` |
| `cgst_amount` | `numeric` | no | default `0` |
| `sgst_amount` | `numeric` | no | default `0` |
| `igst_amount` | `numeric` | no | default `0` |
| `is_interstate` | `bool` | no | default `false` |
| `place_of_supply_state` | `text` | yes |  |
| `place_of_supply_code` | `text` | yes |  |
| `platform_fee` | `numeric` | no | default `0` |
| `gst_on_platform_fee` | `numeric` | no | default `0` |
| `commission_rate` | `numeric` | no | default `0` |
| `commission_amount` | `numeric` | no | default `0` |
| `net_to_vendor` | `numeric` | no | default `0` |
| `points_used` | `int4` | no | default `0` |
| `razorpay_order_id` | `text` | yes |  |
| `settlement_id` | `text` | yes |  |
| `country_code` | `text` | no | default `'IN'` |
| `currency_code` | `text` | no | default `'INR'` |

Indexes:

- `idx_service_bookings_slot` — public.service_bookings USING btree (service_id, booking_date, start_time, end_time) WHERE (status = ANY (ARRAY['confirmed'::text, 'in_progress'::text]))
- `uniq_active_booking_slot` — unique public.service_bookings USING btree (vendor_id, booking_date, start_time) WHERE (status <> ALL (ARRAY['cancelled'::text, 'rejected'::text]))

## Payments & Settlement service

### `country_invoice_config`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `country_code` | `text` | no | **PK** |
| `invoice_prefix` | `text` | no | default `'INV'` |
| `credit_note_prefix` | `text` | no | default `'CN'` |
| `invoice_format` | `text` | no | default `'{prefix}-{vendor}-{fy}-{seq}'` |
| `tax_id_label` | `text` | no | default `'Tax ID'` |
| `tax_id_required_for_b2b` | `bool` | no | default `false` |
| `hsn_label` | `text` | yes |  |
| `show_place_of_supply` | `bool` | no | default `false` |
| `einvoice_enabled` | `bool` | no | default `false` |
| `einvoice_provider` | `text` | yes |  |
| `compliance_fields` | `jsonb` | no | default `'{}'` |
| `legal_footer` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `country_payment_gateways`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `country_code` | `text` | no |  |
| `gateway` | `text` | no |  |
| `display_name` | `text` | no |  |
| `is_enabled` | `bool` | no | default `false` |
| `is_default` | `bool` | no | default `false` |
| `mode` | `text` | no | default `'test'` |
| `public_key` | `text` | yes |  |
| `webhook_url` | `text` | yes |  |
| `config` | `jsonb` | no | default `'{}'` |
| `display_order` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `country_payment_gateways_country_code_gateway_key` — unique public.country_payment_gateways USING btree (country_code, gateway)
- `idx_country_gateways_country` — public.country_payment_gateways USING btree (country_code)

### `country_tax_rules`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `country_code` | `text` | no |  |
| `tax_name` | `text` | no |  |
| `tax_type` | `text` | no | default `'percent'` |
| `rate` | `numeric` | no | default `0` |
| `applies_to` | `text` | no | default `'all'` |
| `state_code` | `text` | yes |  |
| `is_inclusive` | `bool` | no | default `false` |
| `is_active` | `bool` | no | default `true` |
| `display_order` | `int4` | no | default `0` |
| `notes` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_country_tax_rules_country` — public.country_tax_rules USING btree (country_code)
- `idx_country_tax_rules_state` — public.country_tax_rules USING btree (country_code, state_code)

### `credit_notes`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `credit_note_no` | `text` | no |  |
| `original_invoice_id` | `uuid` | yes |  |
| `original_invoice_no` | `text` | yes |  |
| `order_id` | `text` | yes |  |
| `fy_start` | `int4` | no |  |
| `issue_date` | `timestamptz` | no | default `now()` |
| `vendor_id` | `text` | no |  |
| `vendor_gstin` | `text` | yes |  |
| `customer_id` | `text` | no |  |
| `customer_name` | `text` | yes |  |
| `reason` | `text` | no | default `'cancellation'` |
| `notes` | `text` | yes |  |
| `taxable_value` | `numeric` | no | default `0` |
| `cgst_amount` | `numeric` | no | default `0` |
| `sgst_amount` | `numeric` | no | default `0` |
| `igst_amount` | `numeric` | no | default `0` |
| `total_amount` | `numeric` | no | default `0` |
| `is_interstate` | `bool` | no | default `false` |
| `place_of_supply_code` | `text` | yes |  |
| `pdf_url` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `credit_notes_credit_note_no_key` — unique public.credit_notes USING btree (credit_note_no)
- `idx_cn_order` — public.credit_notes USING btree (order_id)
- `idx_cn_vendor_fy` — public.credit_notes USING btree (vendor_id, fy_start)

### `invoice_sequences`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `vendor_id` | `text` | no |  |
| `fy_start` | `int4` | no |  |
| `doc_type` | `text` | no |  |
| `last_value` | `int8` | no | default `0` |
| `prefix` | `text` | no | default `'P4U'` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `invoice_sequences_vendor_id_fy_start_doc_type_key` — unique public.invoice_sequences USING btree (vendor_id, fy_start, doc_type)

### `payment_receipts`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `receipt_no` | `text` | no |  |
| `entity_type` | `payment_entity_type` | no | enum `payment_entity_type` |
| `entity_id` | `text` | no |  |
| `payment_record_id` | `uuid` | yes |  |
| `snapshot` | `jsonb` | no | default `'{}'` |
| `pdf_url` | `text` | yes |  |
| `issued_by` | `uuid` | yes |  |
| `issued_at` | `timestamptz` | no | default `now()` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_prc_entity` — public.payment_receipts USING btree (entity_type, entity_id)
- `idx_prc_payment` — public.payment_receipts USING btree (payment_record_id)
- `payment_receipts_receipt_no_key` — unique public.payment_receipts USING btree (receipt_no)

### `payment_records`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `entity_type` | `payment_entity_type` | no | enum `payment_entity_type` |
| `entity_id` | `text` | no |  |
| `plan_id` | `uuid` | yes |  |
| `plan_amount` | `numeric` | no | default `0` |
| `amount_paid` | `numeric` | no | default `0` |
| `balance` | `numeric` | yes |  |
| `payment_status` | `payment_status_type` | no | default `'pending'` · enum `payment_status_type` |
| `payment_mode` | `payment_mode_type` | yes | enum `payment_mode_type` |
| `transaction_ref` | `text` | yes |  |
| `payment_date` | `timestamptz` | yes |  |
| `remarks` | `text` | yes |  |
| `received_by` | `uuid` | yes |  |
| `metadata` | `jsonb` | no | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_pr_date` — public.payment_records USING btree (payment_date DESC)
- `idx_pr_entity` — public.payment_records USING btree (entity_type, entity_id)
- `idx_pr_status` — public.payment_records USING btree (payment_status)

### `platform_fee_invoices`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `invoice_no` | `text` | no |  |
| `order_id` | `text` | no |  |
| `fy_start` | `int4` | no |  |
| `invoice_date` | `timestamptz` | no | default `now()` |
| `bill_to` | `text` | no | default `'customer'` |
| `recipient_id` | `text` | no |  |
| `recipient_name` | `text` | yes |  |
| `recipient_gstin` | `text` | yes |  |
| `recipient_state_code` | `text` | yes |  |
| `is_interstate` | `bool` | no | default `false` |
| `taxable_value` | `numeric` | no | default `0` |
| `gst_rate` | `numeric` | no | default `18` |
| `cgst_amount` | `numeric` | no | default `0` |
| `sgst_amount` | `numeric` | no | default `0` |
| `igst_amount` | `numeric` | no | default `0` |
| `total_amount` | `numeric` | no | default `0` |
| `sac_code` | `text` | no | default `'999799'` |
| `description` | `text` | no | default `'Marketplace facilitation fee'` |
| `pdf_url` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_pf_invoices_date` — public.platform_fee_invoices USING btree (invoice_date)
- `idx_pf_invoices_order` — public.platform_fee_invoices USING btree (order_id)
- `platform_fee_invoices_invoice_no_key` — unique public.platform_fee_invoices USING btree (invoice_no)

### `receipt_sequences`

Live row count at capture: 1.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `scope` | `text` | no | **PK** |
| `year` | `int4` | no | **PK** |
| `last_value` | `int4` | no | default `0` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `rent_payments`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `text` | no |  |
| `property_title` | `text` | no | default `''` |
| `landlord_name` | `text` | yes | default `''` |
| `landlord_phone` | `text` | yes | default `''` |
| `monthly_rent` | `numeric` | no | default `0` |
| `due_date` | `int4` | no | default `1` |
| `paid_months` | `jsonb` | no | default `'[]'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `settlements`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `vendor_id` | `text` | no |  |
| `order_id` | `text` | no |  |
| `amount` | `numeric` | no | default `0` |
| `commission` | `numeric` | no | default `0` |
| `net_amount` | `numeric` | no | default `0` |
| `status` | `text` | no | default `'pending'` |
| `settled_at` | `timestamptz` | yes |  |
| `vendor_name` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |
| `transaction_reference` | `text` | yes |  |
| `rejection_reason` | `text` | yes |  |
| `gross_sales` | `numeric` | yes | default `0` |
| `taxable_value` | `numeric` | yes | default `0` |
| `cgst_collected` | `numeric` | yes | default `0` |
| `sgst_collected` | `numeric` | yes | default `0` |
| `igst_collected` | `numeric` | yes | default `0` |
| `gst_on_commission` | `numeric` | yes | default `0` |
| `tcs_deducted` | `numeric` | yes | default `0` |
| `tds_deducted` | `numeric` | yes | default `0` |
| `payable_to_vendor` | `numeric` | yes | default `0` |
| `settlement_period_from` | `date` | yes |  |
| `settlement_period_to` | `date` | yes |  |
| `utr_number` | `text` | yes |  |
| `payout_method` | `text` | yes | default `'bank_transfer'` |

### `tax_config`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `name` | `text` | no |  |
| `rate` | `numeric` | no | default `0` |
| `type` | `text` | no | default `'GST'` |
| `status` | `text` | no | default `'active'` |
| `applied_to` | `text` | no | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |

### `tax_slabs`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `name` | `text` | no |  |
| `rate` | `numeric` | no | default `0` |
| `is_active` | `bool` | yes | default `true` |
| `created_at` | `timestamptz` | yes | default `now()` |

### `vendor_tds_ledger`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `vendor_id` | `text` | no |  |
| `vendor_pan` | `text` | yes |  |
| `fy_start` | `int4` | no |  |
| `quarter` | `int4` | no |  |
| `order_id` | `text` | yes |  |
| `settlement_id` | `text` | yes |  |
| `gross_payout` | `numeric` | no |  |
| `tds_rate` | `numeric` | no | default `1` |
| `tds_amount` | `numeric` | no |  |
| `net_payout` | `numeric` | no |  |
| `challan_no` | `text` | yes |  |
| `deposited_at` | `timestamptz` | yes |  |
| `certificate_no` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_tds_vendor_fy` — public.vendor_tds_ledger USING btree (vendor_id, fy_start, quarter)

## Promotions & Content service

### `advertisements`

Live row count at capture: 1.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `title` | `text` | no |  |
| `advertiser` | `text` | no | default `''` |
| `placement` | `text` | no | default `''` |
| `type` | `text` | no | default `'banner'` |
| `status` | `text` | no | default `'active'` |
| `impressions` | `int4` | no | default `0` |
| `clicks` | `int4` | no | default `0` |
| `start_date` | `text` | no | default `''` |
| `end_date` | `text` | no | default `''` |
| `revenue` | `numeric` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `image_url` | `text` | yes | default `''` |
| `mobile_image_url` | `text` | yes | default `''` |
| `link_type` | `text` | yes | default `'custom'` |
| `link_target_id` | `text` | yes | default `''` |
| `link_url` | `text` | yes | default `''` |
| `placements` | `_text` | yes | default `ARRAY['all'` |
| `description` | `text` | yes | default `''` |
| `video_url` | `text` | yes |  |
| `mobile_video_url` | `text` | yes |  |
| `video_thumbnail_url` | `text` | yes |  |

### `banners`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `title` | `text` | no |  |
| `subtitle` | `text` | yes | default `''` |
| `desktop_image` | `text` | yes | default `''` |
| `mobile_image` | `text` | yes | default `''` |
| `link` | `text` | no | default `''` |
| `priority` | `int4` | no | default `0` |
| `start_date` | `text` | no | default `''` |
| `end_date` | `text` | no | default `''` |
| `status` | `text` | no | default `'active'` |
| `gradient` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |

### `cms_pages`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `slug` | `text` | no |  |
| `title` | `text` | no |  |
| `content` | `text` | no | default `''` |
| `status` | `text` | no | default `'active'` |
| `meta_description` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `cms_pages_slug_key` — unique public.cms_pages USING btree (slug)

### `coupon_analytics`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `campaign_id` | `uuid` | no |  |
| `coupons_generated` | `int4` | no | default `0` |
| `coupons_used` | `int4` | no | default `0` |
| `coupons_expired` | `int4` | no | default `0` |
| `coupons_available` | `int4` | no | default `0` |
| `coupons_rolled_back` | `int4` | no | default `0` |
| `revenue` | `numeric` | no | default `0` |
| `discount_given` | `numeric` | no | default `0` |
| `roi` | `numeric` | no | default `0` |
| `last_refreshed_at` | `timestamptz` | no | default `now()` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `coupon_analytics_campaign_id_key` — unique public.coupon_analytics USING btree (campaign_id)

### `coupon_audit_log`

Live row count at capture: 1.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `event_type` | `text` | no |  |
| `campaign_id` | `uuid` | yes |  |
| `coupon_code_id` | `uuid` | yes |  |
| `code` | `text` | yes |  |
| `order_id` | `text` | yes |  |
| `customer_id` | `text` | yes |  |
| `previous_status` | `text` | yes |  |
| `new_status` | `text` | yes |  |
| `reason` | `text` | yes |  |
| `metadata` | `jsonb` | yes |  |
| `actor` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `ip_address` | `text` | yes |  |
| `device` | `text` | yes |  |
| `user_agent` | `text` | yes |  |

Indexes:

- `coupon_audit_campaign_idx` — public.coupon_audit_log USING btree (campaign_id)
- `coupon_audit_code_idx` — public.coupon_audit_log USING btree (coupon_code_id)
- `coupon_audit_event_idx` — public.coupon_audit_log USING btree (event_type, created_at DESC)
- `idx_coupon_audit_campaign` — public.coupon_audit_log USING btree (campaign_id, created_at DESC)
- `idx_coupon_audit_order` — public.coupon_audit_log USING btree (order_id)

### `coupon_campaigns`

Live row count at capture: 1.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `name` | `text` | no |  |
| `description` | `text` | yes |  |
| `discount_type` | `text` | no |  |
| `discount_value` | `numeric` | no |  |
| `max_discount` | `numeric` | yes |  |
| `min_order_amount` | `numeric` | no | default `0` |
| `vendor_id` | `text` | yes |  |
| `product_ids` | `_text` | no | default `'{}'` |
| `district_ids` | `_text` | no | default `'{}'` |
| `use_geo_radius` | `bool` | no | default `false` |
| `radius_km` | `numeric` | yes |  |
| `center_lat` | `float8` | yes |  |
| `center_lng` | `float8` | yes |  |
| `first_time_only` | `bool` | no | default `false` |
| `qty_limit` | `int4` | no | default `1` |
| `per_customer_limit` | `int4` | no | default `1` |
| `code_mode` | `text` | no | default `'unique_single_use'` |
| `shared_code` | `text` | yes |  |
| `popup_enabled` | `bool` | no | default `false` |
| `popup_title` | `text` | yes |  |
| `popup_description` | `text` | yes |  |
| `popup_image_url` | `text` | yes |  |
| `popup_target` | `text` | no | default `'new_users'` |
| `total_codes_target` | `int4` | no | default `0` |
| `total_codes_generated` | `int4` | no | default `0` |
| `total_codes_used` | `int4` | no | default `0` |
| `starts_at` | `timestamptz` | no | default `now()` |
| `expires_at` | `timestamptz` | yes |  |
| `is_active` | `bool` | no | default `true` |
| `created_by` | `uuid` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `rollback_policy` | `text` | no | default `'always_restore'` |
| `rollback_window_minutes` | `int4` | yes |  |
| `status` | `text` | no | default `'active'` |
| `archive_retention_days` | `int4` | yes |  |
| `archived_at` | `timestamptz` | yes |  |
| `updated_by` | `uuid` | yes |  |
| `deleted_at` | `timestamptz` | yes |  |
| `state_codes` | `_text` | no | default `'{}'` |
| `city_ids` | `_uuid` | no | default `'{}'` |
| `pincodes` | `_text` | no | default `'{}'` |
| `vendor_ids` | `_text` | no | default `'{}'` |
| `vendor_category_ids` | `_uuid` | no | default `'{}'` |
| `category_ids` | `_uuid` | no | default `'{}'` |
| `customer_ids` | `_text` | no | default `'{}'` |
| `customer_segments` | `_text` | no | default `'{}'` |
| `max_order_amount` | `numeric` | yes |  |
| `min_qty` | `int4` | yes |  |
| `max_qty` | `int4` | yes |  |
| `min_orders` | `int4` | yes |  |
| `max_orders` | `int4` | yes |  |
| `min_lifetime_spend` | `numeric` | yes |  |
| `stackable` | `bool` | no | default `false` |
| `exclusive` | `bool` | no | default `false` |
| `reservation_enabled` | `bool` | no | default `true` |
| `reservation_timeout_minutes` | `int4` | no | default `15` |
| `reservation_trigger` | `text` | no | default `'apply'` |
| `release_on_payment_failure` | `bool` | no | default `true` |
| `apply_mode` | `text` | no | default `'manual'` |
| `priority` | `int4` | no | default `100` |
| `banner_url` | `text` | yes |  |
| `daily_usage_limit` | `int4` | yes |  |

Indexes:

- `cc_category_ids_idx` — public.coupon_campaigns USING gin (category_ids)
- `cc_customer_ids_idx` — public.coupon_campaigns USING gin (customer_ids)
- `cc_district_ids_idx` — public.coupon_campaigns USING gin (district_ids)
- `cc_state_codes_idx` — public.coupon_campaigns USING gin (state_codes)
- `cc_vendor_ids_idx` — public.coupon_campaigns USING gin (vendor_ids)
- `coupon_campaigns_dates_idx` — public.coupon_campaigns USING btree (starts_at, expires_at)
- `coupon_campaigns_status_idx` — public.coupon_campaigns USING btree (status)
- `idx_coupon_campaigns_active` — public.coupon_campaigns USING btree (is_active, starts_at, expires_at)
- `idx_coupon_campaigns_active_apply` — public.coupon_campaigns USING btree (is_active, status, apply_mode, priority)
- `idx_coupon_campaigns_status_expires` — public.coupon_campaigns USING btree (status, expires_at)
- `idx_coupon_campaigns_vendor` — public.coupon_campaigns USING btree (vendor_id)

### `coupon_codes`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `campaign_id` | `uuid` | no |  |
| `code` | `text` | no |  |
| `status` | `text` | no | default `'active'` |
| `used_by_customer_id` | `text` | yes |  |
| `used_by_mobile` | `text` | yes |  |
| `used_order_id` | `text` | yes |  |
| `used_at` | `timestamptz` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `assigned_customer_id` | `text` | yes |  |
| `expires_at` | `timestamptz` | yes |  |
| `redemption_count` | `int4` | no | default `0` |
| `batch_number` | `text` | yes |  |
| `updated_at` | `timestamptz` | no | default `now()` |
| `deleted_at` | `timestamptz` | yes |  |

Indexes:

- `coupon_codes_assigned_customer_idx` — public.coupon_codes USING btree (assigned_customer_id)
- `coupon_codes_batch_idx` — public.coupon_codes USING btree (batch_number)
- `coupon_codes_campaign_status_idx` — public.coupon_codes USING btree (campaign_id, status)
- `coupon_codes_code_key` — unique public.coupon_codes USING btree (code)
- `coupon_codes_code_unique` — unique public.coupon_codes USING btree (code) WHERE (deleted_at IS NULL)
- `coupon_codes_expires_at_idx` — public.coupon_codes USING btree (expires_at)
- `idx_coupon_codes_campaign` — public.coupon_codes USING btree (campaign_id, status)
- `idx_coupon_codes_code` — public.coupon_codes USING btree (code)
- `idx_coupon_codes_status_campaign` — public.coupon_codes USING btree (status, campaign_id)
- `idx_coupon_codes_used_by` — public.coupon_codes USING btree (used_by_customer_id)

### `coupon_customer_mapping`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `campaign_id` | `uuid` | no |  |
| `coupon_code_id` | `uuid` | yes |  |
| `customer_id` | `text` | no |  |
| `assignment_date` | `timestamptz` | no | default `now()` |
| `usage_status` | `text` | no | default `'assigned'` |
| `created_by` | `uuid` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `deleted_at` | `timestamptz` | yes |  |

Indexes:

- `ccm_campaign_idx` — public.coupon_customer_mapping USING btree (campaign_id)
- `ccm_customer_idx` — public.coupon_customer_mapping USING btree (customer_id)
- `coupon_customer_mapping_campaign_id_coupon_code_id_customer_key` — unique public.coupon_customer_mapping USING btree (campaign_id, coupon_code_id, customer_id)

### `coupon_geo_mapping`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `campaign_id` | `uuid` | no |  |
| `state` | `text` | yes |  |
| `district` | `text` | yes |  |
| `city` | `text` | yes |  |
| `pincode` | `text` | yes |  |
| `latitude` | `float8` | yes |  |
| `longitude` | `float8` | yes |  |
| `radius_km` | `numeric` | yes |  |
| `vendor_id` | `text` | yes |  |
| `is_active` | `bool` | no | default `true` |
| `created_by` | `uuid` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `deleted_at` | `timestamptz` | yes |  |

Indexes:

- `cgm_campaign_idx` — public.coupon_geo_mapping USING btree (campaign_id)
- `cgm_district_idx` — public.coupon_geo_mapping USING btree (district)
- `cgm_pincode_idx` — public.coupon_geo_mapping USING btree (pincode)
- `cgm_vendor_idx` — public.coupon_geo_mapping USING btree (vendor_id)

### `coupon_notifications`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `notification_type` | `text` | no |  |
| `coupon_code_id` | `uuid` | yes |  |
| `campaign_id` | `uuid` | yes |  |
| `customer_id` | `text` | yes |  |
| `sms_status` | `text` | no | default `'pending'` |
| `email_status` | `text` | no | default `'pending'` |
| `push_status` | `text` | no | default `'pending'` |
| `whatsapp_status` | `text` | no | default `'pending'` |
| `payload` | `jsonb` | no | default `'{}'` |
| `sent_at` | `timestamptz` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `cn_campaign_idx` — public.coupon_notifications USING btree (campaign_id)
- `cn_customer_idx` — public.coupon_notifications USING btree (customer_id)
- `cn_type_idx` — public.coupon_notifications USING btree (notification_type)

### `coupon_popup_config`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `campaign_id` | `uuid` | no |  |
| `popup_image_url` | `text` | yes |  |
| `popup_title` | `text` | yes |  |
| `popup_description` | `text` | yes |  |
| `popup_frequency` | `text` | no | default `'once_per_session'` |
| `dismiss_allowed` | `bool` | no | default `true` |
| `display_priority` | `int4` | no | default `0` |
| `is_active` | `bool` | no | default `true` |
| `created_by` | `uuid` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `deleted_at` | `timestamptz` | yes |  |

Indexes:

- `coupon_popup_config_campaign_id_key` — unique public.coupon_popup_config USING btree (campaign_id)
- `cpc_priority_idx` — public.coupon_popup_config USING btree (display_priority DESC)

### `coupon_popup_dismissals`

Live row count at capture: 39.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `campaign_id` | `uuid` | no |  |
| `customer_id` | `text` | no |  |
| `dismissed_permanently` | `bool` | no | default `false` |
| `last_dismissed_at` | `timestamptz` | no | default `now()` |

Indexes:

- `coupon_popup_dismissals_campaign_id_customer_id_key` — unique public.coupon_popup_dismissals USING btree (campaign_id, customer_id)

### `coupon_product_mapping`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `campaign_id` | `uuid` | no |  |
| `coupon_code_id` | `uuid` | yes |  |
| `product_id` | `text` | no |  |
| `is_active` | `bool` | no | default `true` |
| `created_by` | `uuid` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `deleted_at` | `timestamptz` | yes |  |

Indexes:

- `coupon_product_mapping_campaign_id_coupon_code_id_product_i_key` — unique public.coupon_product_mapping USING btree (campaign_id, coupon_code_id, product_id)
- `cpm_campaign_idx` — public.coupon_product_mapping USING btree (campaign_id)
- `cpm_product_idx` — public.coupon_product_mapping USING btree (product_id)

### `coupon_recommendation_log`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `customer_id` | `uuid` | yes |  |
| `event` | `text` | no |  |
| `campaign_id` | `uuid` | yes |  |
| `coupon_code` | `text` | yes |  |
| `cart_snapshot` | `jsonb` | yes |  |
| `savings` | `numeric` | yes |  |
| `device` | `text` | yes |  |
| `ip` | `text` | yes |  |
| `user_agent` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_coupon_reco_log_customer` — public.coupon_recommendation_log USING btree (customer_id, created_at DESC)

### `coupon_redemptions`

Live row count at capture: 77.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `campaign_id` | `uuid` | no |  |
| `coupon_code_id` | `uuid` | yes |  |
| `code` | `text` | no |  |
| `customer_id` | `text` | no |  |
| `customer_mobile` | `text` | yes |  |
| `order_id` | `text` | yes |  |
| `product_id` | `text` | yes |  |
| `discount_amount` | `numeric` | no | default `0` |
| `redeemed_at` | `timestamptz` | no | default `now()` |
| `rolled_back` | `bool` | no | default `false` |
| `rolled_back_at` | `timestamptz` | yes |  |
| `rollback_reason` | `text` | yes |  |
| `rollback_event` | `text` | yes |  |
| `rolled_back_by` | `text` | yes |  |

Indexes:

- `coupon_redemptions_campaign_id_customer_id_order_id_key` — unique public.coupon_redemptions USING btree (campaign_id, customer_id, order_id)
- `coupon_redemptions_customer_idx` — public.coupon_redemptions USING btree (customer_id, redeemed_at DESC)
- `coupon_redemptions_order_idx` — public.coupon_redemptions USING btree (order_id)
- `coupon_redemptions_unique_active` — unique public.coupon_redemptions USING btree (coupon_code_id) WHERE (rolled_back = false)
- `idx_coupon_redemptions_campaign_customer` — public.coupon_redemptions USING btree (campaign_id, customer_id)
- `idx_coupon_redemptions_order` — public.coupon_redemptions USING btree (order_id)

### `coupon_reservations`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `coupon_code_id` | `uuid` | yes |  |
| `campaign_id` | `uuid` | no |  |
| `code` | `text` | no |  |
| `customer_id` | `uuid` | no |  |
| `cart_id` | `uuid` | yes |  |
| `order_id` | `uuid` | yes |  |
| `status` | `text` | no | default `'reserved'` |
| `reserved_at` | `timestamptz` | no | default `now()` |
| `expires_at` | `timestamptz` | no |  |
| `released_at` | `timestamptz` | yes |  |
| `release_reason` | `text` | yes |  |
| `redeemed_at` | `timestamptz` | yes |  |
| `payment_reference` | `text` | yes |  |
| `device` | `text` | yes |  |
| `ip_address` | `text` | yes |  |
| `user_agent` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_coupon_res_code_active` — public.coupon_reservations USING btree (coupon_code_id) WHERE (status = 'reserved'::text)
- `idx_coupon_res_code_str_active` — public.coupon_reservations USING btree (code) WHERE (status = 'reserved'::text)
- `idx_coupon_res_customer` — public.coupon_reservations USING btree (customer_id, status)
- `idx_coupon_res_expires` — public.coupon_reservations USING btree (expires_at) WHERE (status = 'reserved'::text)
- `idx_coupon_res_order` — public.coupon_reservations USING btree (order_id)
- `uq_coupon_res_active_code` — unique public.coupon_reservations USING btree (coupon_code_id) WHERE ((status = 'reserved'::text) AND (coupon_code_id IS NOT NULL))
- `uq_coupon_res_active_customer_campaign` — unique public.coupon_reservations USING btree (customer_id, campaign_id) WHERE (status = 'reserved'::text)

### `coupon_rollback_history`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `coupon_code_id` | `uuid` | yes |  |
| `campaign_id` | `uuid` | yes |  |
| `code` | `text` | yes |  |
| `order_id` | `text` | yes |  |
| `refund_id` | `text` | yes |  |
| `old_status` | `text` | yes |  |
| `new_status` | `text` | yes |  |
| `rollback_reason` | `text` | yes |  |
| `rolled_back_by` | `uuid` | yes |  |
| `rolled_back_at` | `timestamptz` | no | default `now()` |
| `metadata` | `jsonb` | no | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `coupon_rollback_history_campaign_idx` — public.coupon_rollback_history USING btree (campaign_id, rolled_back_at DESC)
- `coupon_rollback_history_order_idx` — public.coupon_rollback_history USING btree (order_id)
- `crh_campaign_idx` — public.coupon_rollback_history USING btree (campaign_id)
- `crh_code_idx` — public.coupon_rollback_history USING btree (coupon_code_id)
- `crh_order_idx` — public.coupon_rollback_history USING btree (order_id)

### `coupon_usage_history`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `coupon_code_id` | `uuid` | yes |  |
| `campaign_id` | `uuid` | yes |  |
| `code` | `text` | yes |  |
| `customer_id` | `text` | yes |  |
| `order_id` | `text` | yes |  |
| `vendor_id` | `text` | yes |  |
| `product_id` | `uuid` | yes |  |
| `discount_percent` | `numeric` | yes |  |
| `discount_amount` | `numeric` | no | default `0` |
| `order_amount` | `numeric` | no | default `0` |
| `applied_at` | `timestamptz` | yes |  |
| `redeemed_at` | `timestamptz` | yes |  |
| `status` | `text` | no | default `'applied'` |
| `metadata` | `jsonb` | no | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `deleted_at` | `timestamptz` | yes |  |

Indexes:

- `coupon_usage_history_customer_idx` — public.coupon_usage_history USING btree (customer_id, redeemed_at DESC)
- `coupon_usage_history_vendor_idx` — public.coupon_usage_history USING btree (vendor_id, redeemed_at DESC)
- `cuh_campaign_idx` — public.coupon_usage_history USING btree (campaign_id)
- `cuh_code_idx` — public.coupon_usage_history USING btree (code)
- `cuh_customer_idx` — public.coupon_usage_history USING btree (customer_id)
- `cuh_order_idx` — public.coupon_usage_history USING btree (order_id)
- `cuh_product_idx` — public.coupon_usage_history USING btree (product_id)
- `cuh_status_idx` — public.coupon_usage_history USING btree (status)
- `cuh_vendor_idx` — public.coupon_usage_history USING btree (vendor_id)

### `coupon_vendor_mapping`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `campaign_id` | `uuid` | no |  |
| `coupon_code_id` | `uuid` | yes |  |
| `vendor_id` | `text` | no |  |
| `is_active` | `bool` | no | default `true` |
| `created_by` | `uuid` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `deleted_at` | `timestamptz` | yes |  |

Indexes:

- `coupon_vendor_mapping_campaign_id_coupon_code_id_vendor_id_key` — unique public.coupon_vendor_mapping USING btree (campaign_id, coupon_code_id, vendor_id)
- `cvm_campaign_idx` — public.coupon_vendor_mapping USING btree (campaign_id)
- `cvm_vendor_idx` — public.coupon_vendor_mapping USING btree (vendor_id)

### `homepage_analytics`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `entity_type` | `text` | no |  |
| `entity_id` | `text` | no |  |
| `event_type` | `text` | no | default `'impression'` |
| `user_id` | `text` | yes |  |
| `session_id` | `text` | yes |  |
| `metadata` | `jsonb` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

### `homepage_banners`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `title` | `text` | no | default `''` |
| `subtitle` | `text` | yes |  |
| `media_type` | `text` | no | default `'image'` |
| `media_url` | `text` | yes |  |
| `mobile_media_url` | `text` | yes |  |
| `cta_text` | `text` | yes |  |
| `cta_link` | `text` | yes |  |
| `redirect_type` | `text` | yes | default `'url'` |
| `redirect_id` | `text` | yes |  |
| `theme_header_color` | `text` | yes |  |
| `theme_bg_color` | `text` | yes |  |
| `theme_button_color` | `text` | yes |  |
| `background_gradient` | `text` | yes |  |
| `display_order` | `int4` | no | default `0` |
| `is_active` | `bool` | no | default `true` |
| `start_date` | `timestamptz` | yes |  |
| `end_date` | `timestamptz` | yes |  |
| `festival_tag` | `text` | yes |  |
| `impressions` | `int4` | no | default `0` |
| `clicks` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `homepage_layout_sections`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `layout_id` | `uuid` | no |  |
| `widget_type` | `text` | no |  |
| `title` | `text` | yes |  |
| `display_order` | `int4` | no | default `0` |
| `is_visible` | `bool` | no | default `true` |
| `config` | `jsonb` | no | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_layout_sections_layout` — public.homepage_layout_sections USING btree (layout_id, display_order)

### `homepage_layouts`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `module` | `text` | no |  |
| `name` | `text` | no | default `'default'` |
| `is_active` | `bool` | no | default `true` |
| `notes` | `text` | yes |  |
| `updated_by` | `uuid` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `published_snapshot` | `jsonb` | yes |  |
| `published_at` | `timestamptz` | yes |  |
| `published_by` | `uuid` | yes |  |
| `has_unpublished_changes` | `bool` | no | default `true` |

Indexes:

- `homepage_layouts_module_name_key` — unique public.homepage_layouts USING btree (module, name)

### `homepage_section_items`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `section_id` | `uuid` | no |  |
| `item_type` | `text` | no | default `'product'` |
| `item_id` | `text` | yes |  |
| `title` | `text` | yes |  |
| `image_url` | `text` | yes |  |
| `link` | `text` | yes |  |
| `display_order` | `int4` | no | default `0` |
| `badge_text` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

### `homepage_sections`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `title` | `text` | no | default `''` |
| `section_type` | `text` | no | default `'product_slider'` |
| `display_order` | `int4` | no | default `0` |
| `is_visible` | `bool` | no | default `true` |
| `background_color` | `text` | yes |  |
| `background_gradient` | `text` | yes |  |
| `cta_text` | `text` | yes |  |
| `cta_link` | `text` | yes |  |
| `festival_tag` | `text` | yes |  |
| `target_location` | `text` | yes |  |
| `target_segment` | `text` | yes |  |
| `start_date` | `timestamptz` | yes |  |
| `end_date` | `timestamptz` | yes |  |
| `metadata` | `jsonb` | yes | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `homes_cms`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `content_type` | `text` | no |  |
| `title` | `text` | no | default `''` |
| `content` | `text` | yes | default `''` |
| `metadata` | `jsonb` | yes | default `'{}'` |
| `sort_order` | `int4` | yes | default `0` |
| `is_active` | `bool` | yes | default `true` |
| `start_date` | `date` | yes |  |
| `end_date` | `date` | yes |  |
| `created_at` | `timestamptz` | yes | default `now()` |
| `updated_at` | `timestamptz` | yes | default `now()` |

### `onboarding_screens`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `title` | `text` | no | default `''` |
| `description` | `text` | no | default `''` |
| `image_url` | `text` | no | default `''` |
| `display_order` | `int4` | no | default `0` |
| `is_active` | `bool` | no | default `true` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `popup_banners`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `title` | `text` | no |  |
| `description` | `text` | no | default `''` |
| `image` | `text` | no | default `''` |
| `link` | `text` | no | default `''` |
| `status` | `text` | no | default `'active'` |
| `start_date` | `text` | no | default `''` |
| `end_date` | `text` | no | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |

### `splash_screens`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `title` | `text` | no | default `''` |
| `tagline` | `text` | yes | default `''` |
| `image_url` | `text` | no | default `''` |
| `background_color` | `text` | no | default `'#009999'` |
| `app_type` | `text` | no | default `'both'` |
| `is_active` | `bool` | no | default `true` |
| `display_order` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `video_ads`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `title` | `text` | no | default `''` |
| `video_url` | `text` | no | default `''` |
| `thumbnail_url` | `text` | yes |  |
| `duration_seconds` | `int4` | yes |  |
| `cta_text` | `text` | yes |  |
| `cta_link` | `text` | yes |  |
| `status` | `text` | no | default `'active'` |
| `start_date` | `timestamptz` | yes |  |
| `end_date` | `timestamptz` | yes |  |
| `impressions` | `int4` | no | default `0` |
| `clicks` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `display_mode` | `text` | no | default `'floating'` |
| `show_delay_seconds` | `int4` | no | default `3` |
| `auto_open_fullscreen` | `bool` | no | default `false` |

## Vendor service

### `dropshipping_supplier_products`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `supplier_id` | `uuid` | no |  |
| `product_id` | `text` | yes |  |
| `supplier_sku` | `text` | no |  |
| `supplier_product_name` | `text` | yes |  |
| `cost_price` | `numeric` | no | default `0` |
| `currency_code` | `text` | no | default `'INR'` |
| `moq` | `int4` | no | default `1` |
| `stock_buffer` | `int4` | no | default `0` |
| `available_stock` | `int4` | yes |  |
| `last_synced_at` | `timestamptz` | yes |  |
| `is_active` | `bool` | no | default `true` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `dropshipping_supplier_products_supplier_id_supplier_sku_key` — unique public.dropshipping_supplier_products USING btree (supplier_id, supplier_sku)
- `idx_dss_product` — public.dropshipping_supplier_products USING btree (product_id)

### `dropshipping_suppliers`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `name` | `text` | no |  |
| `contact_email` | `text` | yes |  |
| `contact_phone` | `text` | yes |  |
| `country_code` | `text` | yes |  |
| `currency_code` | `text` | no | default `'INR'` |
| `website` | `text` | yes |  |
| `api_endpoint` | `text` | yes |  |
| `api_key_secret_name` | `text` | yes |  |
| `default_lead_time_days` | `int4` | no | default `7` |
| `default_markup_percent` | `numeric` | no | default `20.00` |
| `commission_percent` | `numeric` | no | default `0` |
| `shipping_methods` | `jsonb` | no | default `'[]'` |
| `status` | `text` | no | default `'active'` |
| `notes` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `kyc_documents`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `text` | no |  |
| `document_type` | `text` | no | default `'aadhaar'` |
| `document_number` | `text` | no | default `''` |
| `front_image_url` | `text` | yes | default `''` |
| `back_image_url` | `text` | yes | default `''` |
| `status` | `text` | no | default `'not_submitted'` |
| `rejection_reason` | `text` | yes | default `''` |
| `admin_notes` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `service_vendors`

Live row count at capture: 1.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `name` | `text` | no |  |
| `business_name` | `text` | no | default `''` |
| `mobile` | `text` | no | default `''` |
| `email` | `text` | no | default `''` |
| `category_id` | `text` | yes |  |
| `city_id` | `text` | yes |  |
| `area_id` | `text` | yes |  |
| `commission_rate` | `numeric` | no | default `0` |
| `membership` | `text` | no | default `'basic'` |
| `status` | `text` | no | default `'pending'` |
| `rating` | `numeric` | yes | default `0` |
| `total_products` | `int4` | yes | default `0` |
| `total_orders` | `int4` | yes | default `0` |
| `total_revenue` | `numeric` | yes | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `deleted_at` | `timestamptz` | yes |  |
| `deletion_reason` | `text` | yes |  |
| `plan_id` | `uuid` | yes |  |
| `plan_payment_status` | `text` | no | default `'unpaid'` |
| `plan_transaction_id` | `text` | yes | default `''` |
| `shop_photo_url` | `text` | yes | default `''` |
| `max_redemption_percentage` | `numeric` | yes |  |
| `kyc_status` | `text` | yes | default `'not_submitted'` |
| `referred_by` | `text` | yes |  |
| `vendor_category` | `text` | no | default `'service'` |
| `background_image` | `text` | yes |  |
| `shop_address` | `text` | yes |  |
| `shop_latitude` | `float8` | yes |  |
| `shop_longitude` | `float8` | yes |  |
| `plan_start_date` | `timestamptz` | yes |  |
| `plan_end_date` | `timestamptz` | yes |  |
| `gstin` | `text` | yes |  |
| `state_code` | `text` | yes |  |
| `state_name` | `text` | yes |  |
| `pan` | `text` | yes |  |
| `country_code` | `text` | no | default `'IN'` |
| `currency_code` | `text` | no | default `'INR'` |
| `tax_id` | `text` | yes |  |
| `tax_id_type` | `text` | yes |  |

Indexes:

- `idx_service_vendors_mobile_status_created` — public.service_vendors USING btree (mobile, status, created_at DESC)
- `idx_service_vendors_vendor_category` — public.service_vendors USING btree (vendor_category)

### `vendor_applications`

Live row count at capture: 2.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `text` | no |  |
| `name` | `text` | no | default `''` |
| `phone` | `text` | no | default `''` |
| `secondary_phone` | `text` | yes | default `''` |
| `email` | `text` | no | default `''` |
| `state` | `text` | yes | default `''` |
| `city` | `text` | yes | default `''` |
| `fb_link` | `text` | yes | default `''` |
| `instagram_link` | `text` | yes | default `''` |
| `business_name` | `text` | no | default `''` |
| `business_type` | `text` | yes | default `'proprietorship'` |
| `store_name` | `text` | yes | default `''` |
| `store_logo_url` | `text` | yes | default `''` |
| `category` | `text` | yes | default `'product'` |
| `subcategory` | `text` | yes | default `''` |
| `business_description` | `text` | yes | default `''` |
| `gst_number` | `text` | yes | default `''` |
| `gst_certificate_url` | `text` | yes | default `''` |
| `fssai_url` | `text` | yes | default `''` |
| `pan_number` | `text` | yes | default `''` |
| `pan_image_url` | `text` | yes | default `''` |
| `aadhaar_number` | `text` | yes | default `''` |
| `aadhaar_front_url` | `text` | yes | default `''` |
| `aadhaar_back_url` | `text` | yes | default `''` |
| `bank_account_number` | `text` | yes | default `''` |
| `bank_ifsc` | `text` | yes | default `''` |
| `bank_holder_name` | `text` | yes | default `''` |
| `status` | `text` | no | default `'draft'` |
| `rejection_reason` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `latitude` | `float8` | yes | default `0` |
| `longitude` | `float8` | yes | default `0` |
| `shop_address` | `text` | yes | default `''` |
| `shop_photo_url` | `text` | yes | default `''` |
| `district` | `text` | yes | default `''` |
| `selected_categories` | `jsonb` | yes | default `'[]'` |
| `selected_subcategories` | `jsonb` | yes | default `'[]'` |
| `kyc_status` | `text` | no | default `'pending'` |
| `admin_notes` | `text` | yes |  |
| `referred_by` | `text` | yes |  |
| `vendor_category` | `text` | no | default `'product'` |
| `postal_code` | `text` | yes |  |

Indexes:

- `idx_vendor_applications_vendor_category` — public.vendor_applications USING btree (vendor_category)

### `vendor_availability`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `vendor_id` | `text` | no |  |
| `day_of_week` | `int4` | no |  |
| `is_available` | `bool` | no | default `true` |
| `time_slots` | `jsonb` | no | default `'[]'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `start_time` | `time` | no | default `'09:00:00'` |
| `end_time` | `time` | no | default `'18:00:00'` |
| `buffer_minutes` | `int4` | no | default `30` |

Indexes:

- `idx_vendor_availability_vendor` — public.vendor_availability USING btree (vendor_id)
- `vendor_availability_vendor_id_day_of_week_key` — unique public.vendor_availability USING btree (vendor_id, day_of_week)

### `vendor_bank_accounts`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `vendor_id` | `text` | no |  |
| `bank_name` | `text` | no | default `''` |
| `account_holder` | `text` | no | default `''` |
| `account_number` | `text` | no | default `''` |
| `ifsc_code` | `text` | no | default `''` |
| `account_type` | `text` | no | default `'savings'` |
| `is_primary` | `bool` | no | default `false` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `vendor_date_overrides`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `vendor_id` | `text` | no |  |
| `override_date` | `date` | no |  |
| `is_available` | `bool` | no | default `false` |
| `start_time` | `time` | yes |  |
| `end_time` | `time` | yes |  |
| `buffer_minutes` | `int4` | yes |  |
| `reason` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_vendor_date_overrides_lookup` — public.vendor_date_overrides USING btree (vendor_id, override_date)
- `vendor_date_overrides_vendor_id_override_date_key` — unique public.vendor_date_overrides USING btree (vendor_id, override_date)

### `vendor_dropshipping_settings`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `vendor_id` | `text` | no | **PK** |
| `enabled` | `bool` | no | default `false` |
| `default_supplier_id` | `uuid` | yes |  |
| `auto_forward_orders` | `bool` | no | default `false` |
| `default_margin_percent` | `numeric` | no | default `20.00` |
| `notify_on_status_change` | `bool` | no | default `true` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `vendor_notifications`

Live row count at capture: 108.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `vendor_id` | `text` | no |  |
| `type` | `text` | no | default `'order'` |
| `title` | `text` | no |  |
| `message` | `text` | no | default `''` |
| `reference_id` | `text` | yes |  |
| `reference_type` | `text` | yes |  |
| `deep_link` | `text` | yes |  |
| `is_read` | `bool` | no | default `false` |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_vendor_notifications_unread` — public.vendor_notifications USING btree (vendor_id) WHERE (is_read = false)
- `idx_vendor_notifications_vendor` — public.vendor_notifications USING btree (vendor_id, created_at DESC)
- `idx_vendor_notifications_vendor_read_created` — public.vendor_notifications USING btree (vendor_id, is_read, created_at DESC)

### `vendor_onboarding_screens`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `title` | `text` | no | default `''` |
| `description` | `text` | no | default `''` |
| `image_url` | `text` | no | default `''` |
| `display_order` | `int4` | no | default `0` |
| `is_active` | `bool` | no | default `true` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `vendor_plans`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `plan_name` | `text` | no |  |
| `plan_type` | `text` | no | default `'local'` |
| `price` | `numeric` | no | default `0` |
| `validity_days` | `int4` | no | default `30` |
| `visibility_type` | `text` | no | default `'radius_based'` |
| `radius_km` | `numeric` | no | default `5` |
| `commission_percentage` | `numeric` | no | default `10` |
| `max_redemption_percentage` | `numeric` | no | default `5` |
| `banner_ads` | `bool` | no | default `false` |
| `video_ads` | `bool` | no | default `false` |
| `priority_listing` | `bool` | no | default `false` |
| `plan_tier` | `int4` | no | default `0` |
| `is_active` | `bool` | no | default `true` |
| `description` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `payment_mode` | `text` | no | default `'both'` |
| `coverage_type` | `text` | yes |  |
| `delivery_radius_km` | `numeric` | yes |  |
| `product_visibility` | `text` | yes |  |
| `promotion_benefits` | `jsonb` | yes | default `'[]'` |
| `reward_benefits` | `jsonb` | yes | default `'[]'` |
| `redemption_benefits` | `jsonb` | yes | default `'[]'` |
| `key_features` | `jsonb` | yes | default `'[]'` |
| `vendor_type` | `text` | yes |  |

### `vendors`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `name` | `text` | no |  |
| `business_name` | `text` | no | default `''` |
| `mobile` | `text` | no | default `''` |
| `email` | `text` | no | default `''` |
| `category_id` | `text` | yes |  |
| `city_id` | `text` | yes |  |
| `area_id` | `text` | yes |  |
| `commission_rate` | `numeric` | no | default `0` |
| `membership` | `text` | no | default `'basic'` |
| `status` | `text` | no | default `'pending'` |
| `rating` | `numeric` | yes | default `0` |
| `total_products` | `int4` | yes | default `0` |
| `total_orders` | `int4` | yes | default `0` |
| `total_revenue` | `numeric` | yes | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `shop_latitude` | `float8` | yes | default `0` |
| `shop_longitude` | `float8` | yes | default `0` |
| `shop_address` | `text` | yes | default `''` |
| `plan_id` | `uuid` | yes |  |
| `plan_start_date` | `timestamptz` | yes |  |
| `plan_end_date` | `timestamptz` | yes |  |
| `plan_payment_status` | `text` | no | default `'unpaid'` |
| `plan_transaction_id` | `text` | yes | default `''` |
| `shop_photo_url` | `text` | yes | default `''` |
| `background_image` | `text` | yes | default `''` |
| `max_redemption_percentage` | `numeric` | yes |  |
| `deleted_at` | `timestamptz` | yes |  |
| `deletion_reason` | `text` | yes |  |
| `kyc_status` | `text` | yes | default `'not_submitted'` |
| `referred_by` | `text` | yes |  |
| `vendor_category` | `text` | no | default `'product'` |
| `gstin` | `text` | yes |  |
| `state_code` | `text` | yes |  |
| `state_name` | `text` | yes |  |
| `pan` | `text` | yes |  |
| `country_code` | `text` | no | default `'IN'` |
| `currency_code` | `text` | no | default `'INR'` |
| `tax_id` | `text` | yes |  |
| `tax_id_type` | `text` | yes |  |

Indexes:

- `idx_vendors_mobile_status_created` — public.vendors USING btree (mobile, status, created_at DESC)
- `idx_vendors_shop_lat` — public.vendors USING btree (shop_latitude)
- `idx_vendors_shop_lng` — public.vendors USING btree (shop_longitude)
- `idx_vendors_vendor_category` — public.vendors USING btree (vendor_category)

## Food Delivery service

### `food_cancellation_reasons`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `reason` | `text` | no |  |
| `applies_to` | `text` | no | default `'customer'` |
| `is_active` | `bool` | no | default `true` |
| `display_order` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |

### `food_coupon_redemptions`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `coupon_id` | `uuid` | no |  |
| `coupon_code` | `text` | no |  |
| `customer_id` | `text` | no |  |
| `order_id` | `text` | no |  |
| `discount_applied` | `numeric` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_food_coupon_redemptions_coupon` — public.food_coupon_redemptions USING btree (coupon_id)
- `idx_food_coupon_redemptions_customer` — public.food_coupon_redemptions USING btree (customer_id)

### `food_coupons`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `code` | `text` | no |  |
| `title` | `text` | no |  |
| `description` | `text` | yes |  |
| `discount_type` | `text` | no | default `'flat'` |
| `discount_value` | `numeric` | no | default `0` |
| `max_discount` | `numeric` | yes |  |
| `min_order_amount` | `numeric` | no | default `0` |
| `restaurant_id` | `text` | yes |  |
| `is_platform_wide` | `bool` | no | default `false` |
| `per_customer_limit` | `int4` | no | default `1` |
| `total_usage_limit` | `int4` | yes |  |
| `usage_count` | `int4` | no | default `0` |
| `starts_at` | `timestamptz` | no | default `now()` |
| `expires_at` | `timestamptz` | yes |  |
| `is_active` | `bool` | no | default `true` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `food_coupons_code_key` — unique public.food_coupons USING btree (code)
- `idx_food_coupons_active` — public.food_coupons USING btree (is_active, expires_at)
- `idx_food_coupons_code` — public.food_coupons USING btree (code)
- `idx_food_coupons_restaurant` — public.food_coupons USING btree (restaurant_id)

### `food_invoices`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `invoice_no` | `text` | no |  |
| `order_id` | `text` | no |  |
| `customer_id` | `text` | no |  |
| `restaurant_id` | `text` | no |  |
| `subtotal` | `numeric` | no | default `0` |
| `tax` | `numeric` | no | default `0` |
| `delivery_fee` | `numeric` | no | default `0` |
| `packaging_fee` | `numeric` | no | default `0` |
| `platform_fee` | `numeric` | no | default `0` |
| `discount` | `numeric` | no | default `0` |
| `total` | `numeric` | no | default `0` |
| `payment_method` | `text` | yes |  |
| `payment_id` | `text` | yes |  |
| `pdf_url` | `text` | yes |  |
| `generated_at` | `timestamptz` | no | default `now()` |
| `metadata` | `jsonb` | yes | default `'{}'` |

Indexes:

- `food_invoices_invoice_no_key` — unique public.food_invoices USING btree (invoice_no)
- `food_invoices_order_id_key` — unique public.food_invoices USING btree (order_id)
- `idx_food_invoices_customer` — public.food_invoices USING btree (customer_id)
- `idx_food_invoices_restaurant` — public.food_invoices USING btree (restaurant_id)

### `food_order_chats`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `order_id` | `text` | no |  |
| `sender_id` | `uuid` | no |  |
| `sender_role` | `text` | no |  |
| `message` | `text` | no |  |
| `is_quick_reply` | `bool` | no | default `false` |
| `read_at` | `timestamptz` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_food_chats_order` — public.food_order_chats USING btree (order_id, created_at)

### `food_order_status_history`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `order_id` | `text` | no |  |
| `from_status` | `text` | yes |  |
| `to_status` | `text` | no |  |
| `changed_by` | `uuid` | yes |  |
| `changed_by_role` | `text` | yes |  |
| `notes` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

### `food_orders`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `customer_id` | `text` | no |  |
| `customer_name` | `text` | yes |  |
| `customer_phone` | `text` | yes |  |
| `restaurant_id` | `text` | no |  |
| `restaurant_name` | `text` | yes |  |
| `items` | `jsonb` | no | default `'[]'` |
| `subtotal` | `numeric` | no | default `0` |
| `packaging_fee` | `numeric` | no | default `0` |
| `delivery_fee` | `numeric` | no | default `0` |
| `rider_tip` | `numeric` | no | default `0` |
| `gst` | `numeric` | no | default `0` |
| `platform_fee` | `numeric` | no | default `0` |
| `discount` | `numeric` | no | default `0` |
| `points_used` | `int4` | no | default `0` |
| `total` | `numeric` | no | default `0` |
| `rider_payout` | `numeric` | no | default `0` |
| `restaurant_payout` | `numeric` | no | default `0` |
| `p4u_cut` | `numeric` | no | default `0` |
| `delivery_address` | `text` | no |  |
| `delivery_lat` | `float8` | yes |  |
| `delivery_lng` | `float8` | yes |  |
| `distance_km` | `numeric` | yes |  |
| `eta_minutes` | `int4` | yes |  |
| `handover_otp` | `text` | yes |  |
| `payment_method` | `text` | no | default `'online'` |
| `payment_status` | `text` | no | default `'pending'` |
| `razorpay_order_id` | `text` | yes |  |
| `razorpay_payment_id` | `text` | yes |  |
| `status` | `text` | no | default `'placed'` |
| `cancellation_reason` | `text` | yes |  |
| `customer_notes` | `text` | yes |  |
| `placed_at` | `timestamptz` | no | default `now()` |
| `accepted_at` | `timestamptz` | yes |  |
| `ready_at` | `timestamptz` | yes |  |
| `picked_up_at` | `timestamptz` | yes |  |
| `delivered_at` | `timestamptz` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `scheduled_for` | `timestamptz` | yes |  |
| `coupon_code` | `text` | yes |  |
| `donation_amount` | `numeric` | no | default `0` |
| `is_contactless` | `bool` | no | default `false` |
| `no_cutlery` | `bool` | no | default `false` |
| `wallet_amount_used` | `numeric` | no | default `0` |
| `rider_note` | `text` | yes |  |
| `refund_status` | `text` | yes |  |
| `refund_amount` | `numeric` | no | default `0` |
| `invoice_no` | `text` | yes |  |
| `country_code` | `text` | no | default `'IN'` |
| `currency_code` | `text` | no | default `'INR'` |
| `applied_cart_rules` | `jsonb` | no | default `'[]'` |
| `cart_rule_discount` | `numeric` | no | default `0` |

Indexes:

- `idx_food_orders_customer` — public.food_orders USING btree (customer_id)
- `idx_food_orders_customer_status_created` — public.food_orders USING btree (customer_id, status, created_at DESC)
- `idx_food_orders_restaurant` — public.food_orders USING btree (restaurant_id)
- `idx_food_orders_scheduled` — public.food_orders USING btree (scheduled_for)
- `idx_food_orders_status` — public.food_orders USING btree (status)

### `food_payments`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `order_id` | `text` | no |  |
| `customer_id` | `text` | no |  |
| `txn_type` | `text` | no | default `'payment'` |
| `payment_method` | `text` | no |  |
| `payment_provider` | `text` | no | default `'razorpay'` |
| `amount` | `numeric` | no | default `0` |
| `currency` | `text` | no | default `'INR'` |
| `status` | `text` | no | default `'pending'` |
| `razorpay_order_id` | `text` | yes |  |
| `razorpay_payment_id` | `text` | yes |  |
| `razorpay_refund_id` | `text` | yes |  |
| `razorpay_signature` | `text` | yes |  |
| `failure_reason` | `text` | yes |  |
| `metadata` | `jsonb` | yes | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_food_payments_customer` — public.food_payments USING btree (customer_id)
- `idx_food_payments_order` — public.food_payments USING btree (order_id)
- `idx_food_payments_status` — public.food_payments USING btree (status)

### `food_refunds`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `order_id` | `text` | no |  |
| `customer_id` | `text` | no |  |
| `amount` | `numeric` | no |  |
| `reason` | `text` | no | default `'order_cancelled'` |
| `notes` | `text` | yes |  |
| `status` | `text` | no | default `'pending'` |
| `refund_method` | `text` | no | default `'original'` |
| `razorpay_refund_id` | `text` | yes |  |
| `initiated_by` | `uuid` | yes |  |
| `initiated_at` | `timestamptz` | no | default `now()` |
| `completed_at` | `timestamptz` | yes |  |
| `metadata` | `jsonb` | yes | default `'{}'` |

Indexes:

- `idx_food_refunds_customer` — public.food_refunds USING btree (customer_id)
- `idx_food_refunds_order` — public.food_refunds USING btree (order_id)
- `idx_food_refunds_status` — public.food_refunds USING btree (status)

### `food_review_helpful`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `review_id` | `uuid` | no |  |
| `customer_id` | `text` | no |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `food_review_helpful_review_id_customer_id_key` — unique public.food_review_helpful USING btree (review_id, customer_id)

### `food_reviews`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `order_id` | `text` | no |  |
| `customer_id` | `text` | no |  |
| `restaurant_id` | `text` | no |  |
| `rider_id` | `text` | yes |  |
| `food_rating` | `int4` | yes |  |
| `restaurant_rating` | `int4` | yes |  |
| `rider_rating` | `int4` | yes |  |
| `comment` | `text` | yes |  |
| `status` | `text` | no | default `'active'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `photos` | `jsonb` | yes | default `'[]'` |
| `tags` | `_text` | yes | default `'{}'` |
| `rider_tags` | `_text` | yes | default `'{}'` |
| `helpful_count` | `int4` | no | default `0` |
| `restaurant_reply` | `text` | yes |  |
| `restaurant_reply_at` | `timestamptz` | yes |  |
| `edited_at` | `timestamptz` | yes |  |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `food_reviews_order_id_key` — unique public.food_reviews USING btree (order_id)

### `menu_categories`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `restaurant_id` | `text` | no |  |
| `name` | `text` | no |  |
| `display_order` | `int4` | no | default `0` |
| `is_active` | `bool` | no | default `true` |
| `created_at` | `timestamptz` | no | default `now()` |

### `menu_combos`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `restaurant_id` | `text` | no |  |
| `name` | `text` | no |  |
| `description` | `text` | yes |  |
| `image_url` | `text` | yes |  |
| `item_ids` | `_uuid` | no | default `'{}'` |
| `original_price` | `numeric` | no | default `0` |
| `combo_price` | `numeric` | no | default `0` |
| `is_active` | `bool` | no | default `true` |
| `display_order` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `menu_item_notify_requests`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `menu_item_id` | `uuid` | no |  |
| `customer_id` | `text` | no |  |
| `notified_at` | `timestamptz` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `menu_item_notify_requests_menu_item_id_customer_id_key` — unique public.menu_item_notify_requests USING btree (menu_item_id, customer_id)

### `menu_items`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `restaurant_id` | `text` | no |  |
| `category_id` | `uuid` | yes |  |
| `name` | `text` | no |  |
| `description` | `text` | yes |  |
| `price` | `numeric` | no |  |
| `discounted_price` | `numeric` | yes |  |
| `is_veg` | `bool` | no | default `true` |
| `spice_level` | `text` | yes |  |
| `image_url` | `text` | yes |  |
| `addons` | `jsonb` | yes | default `'[]'` |
| `customizations` | `jsonb` | yes | default `'[]'` |
| `serves` | `int4` | yes | default `1` |
| `prep_minutes` | `int4` | yes | default `15` |
| `gst_rate` | `numeric` | no | default `5` |
| `in_stock` | `bool` | no | default `true` |
| `is_bestseller` | `bool` | no | default `false` |
| `display_order` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `dietary_tags` | `_text` | yes | default `'{}'` |
| `calories` | `int4` | yes |  |
| `gallery_urls` | `jsonb` | yes | default `'[]'` |
| `order_count` | `int4` | yes | default `0` |

### `restaurants`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `vendor_id` | `text` | yes |  |
| `name` | `text` | no |  |
| `tagline` | `text` | yes |  |
| `description` | `text` | yes |  |
| `cuisine` | `_text` | yes | default `'{}'` |
| `veg_only` | `bool` | no | default `false` |
| `cover_image` | `text` | yes |  |
| `logo_url` | `text` | yes |  |
| `fssai_license` | `text` | yes |  |
| `fssai_expiry` | `date` | yes |  |
| `address` | `text` | no |  |
| `city_id` | `text` | yes |  |
| `area_id` | `text` | yes |  |
| `latitude` | `float8` | yes |  |
| `longitude` | `float8` | yes |  |
| `phone` | `text` | yes |  |
| `email` | `text` | yes |  |
| `opening_time` | `time` | yes |  |
| `closing_time` | `time` | yes |  |
| `open_days` | `_int4` | yes | default `'{0,1,2,3,4,5,6}'` |
| `avg_prep_minutes` | `int4` | no | default `25` |
| `delivery_radius_km` | `numeric` | no | default `5` |
| `packaging_fee` | `numeric` | no | default `0` |
| `min_order_amount` | `numeric` | no | default `0` |
| `commission_rate` | `numeric` | no | default `18` |
| `status` | `text` | no | default `'open'` |
| `is_active` | `bool` | no | default `true` |
| `rating` | `numeric` | no | default `0` |
| `reviews_count` | `int4` | no | default `0` |
| `total_orders` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `banner_url` | `text` | yes |  |
| `gallery_urls` | `jsonb` | yes | default `'[]'` |

## Homes / Real Estate service

### `properties`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `user_id` | `text` | no |  |
| `user_name` | `text` | yes | default `''` |
| `transaction_type` | `property_transaction_type` | no | default `'rent'` · enum `property_transaction_type` |
| `property_type` | `property_type` | no | default `'apartment'` · enum `property_type` |
| `posted_by` | `property_posted_by` | no | default `'owner'` · enum `property_posted_by` |
| `title` | `text` | no |  |
| `description` | `text` | yes | default `''` |
| `city` | `text` | yes | default `''` |
| `locality` | `text` | yes | default `''` |
| `landmark` | `text` | yes | default `''` |
| `pincode` | `text` | yes | default `''` |
| `latitude` | `float8` | yes | default `0` |
| `longitude` | `float8` | yes | default `0` |
| `bhk` | `text` | yes | default `''` |
| `area_sqft` | `numeric` | yes | default `0` |
| `floor_number` | `int4` | yes | default `0` |
| `total_floors` | `int4` | yes | default `0` |
| `age_of_property` | `text` | yes | default `''` |
| `facing` | `property_facing` | yes | enum `property_facing` |
| `furnishing` | `property_furnishing` | yes | default `'unfurnished'` · enum `property_furnishing` |
| `parking` | `property_parking` | yes | default `'none'` · enum `property_parking` |
| `availability_date` | `date` | yes |  |
| `amenities` | `jsonb` | yes | default `'[]'` |
| `price` | `numeric` | no | default `0` |
| `maintenance_charges` | `numeric` | yes | default `0` |
| `security_deposit` | `numeric` | yes | default `0` |
| `price_negotiable` | `bool` | yes | default `false` |
| `preferred_tenant` | `text` | yes | default `'any'` |
| `images` | `jsonb` | yes | default `'[]'` |
| `video_url` | `text` | yes | default `''` |
| `virtual_tour_url` | `text` | yes | default `''` |
| `status` | `property_status` | no | default `'draft'` · enum `property_status` |
| `rejection_reason` | `text` | yes | default `''` |
| `views_count` | `int4` | yes | default `0` |
| `contact_reveals` | `int4` | yes | default `0` |
| `enquiry_count` | `int4` | yes | default `0` |
| `is_verified` | `bool` | yes | default `false` |
| `is_featured` | `bool` | yes | default `false` |
| `is_boosted` | `bool` | yes | default `false` |
| `boost_expires_at` | `timestamptz` | yes |  |
| `pg_room_type` | `text` | yes | default `''` |
| `pg_gender_preference` | `text` | yes | default `''` |
| `pg_meals_included` | `jsonb` | yes | default `'[]'` |
| `pg_rules` | `jsonb` | yes | default `'[]'` |
| `pg_facilities` | `jsonb` | yes | default `'[]'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `property_amenities`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `name` | `text` | no |  |
| `icon` | `text` | yes | default `''` |
| `category` | `text` | yes | default `'general'` |
| `sort_order` | `int4` | yes | default `0` |
| `is_active` | `bool` | yes | default `true` |
| `created_at` | `timestamptz` | yes | default `now()` |

### `property_bookmarks`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `property_id` | `text` | no |  |
| `user_id` | `text` | no |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `property_bookmarks_property_id_user_id_key` — unique public.property_bookmarks USING btree (property_id, user_id)

### `property_enquiries`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `property_id` | `text` | no |  |
| `seeker_id` | `text` | no |  |
| `seeker_name` | `text` | yes | default `''` |
| `seeker_phone` | `text` | yes | default `''` |
| `message` | `text` | yes | default `''` |
| `status` | `text` | no | default `'pending'` |
| `created_at` | `timestamptz` | no | default `now()` |

### `property_filter_options`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `filter_type` | `text` | no |  |
| `label` | `text` | no |  |
| `value` | `text` | no |  |
| `sort_order` | `int4` | yes | default `0` |
| `is_active` | `bool` | yes | default `true` |
| `created_at` | `timestamptz` | yes | default `now()` |

### `property_localities`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `city` | `text` | no |  |
| `name` | `text` | no |  |
| `is_popular` | `bool` | yes | default `false` |
| `status` | `text` | no | default `'active'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `avg_rent` | `numeric` | yes | default `0` |
| `avg_sale_price` | `numeric` | yes | default `0` |
| `life_score` | `jsonb` | yes | default `'{"power": 0, "water": 0, "safety": 0, "amenities": 0, "air_quality": 0, "connectivity": 0}'` |
| `seo_title` | `text` | yes | default `''` |
| `seo_description` | `text` | yes | default `''` |

### `property_messages`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `property_id` | `text` | no |  |
| `sender_id` | `text` | no |  |
| `receiver_id` | `text` | no |  |
| `sender_name` | `text` | yes | default `''` |
| `message` | `text` | no | default `''` |
| `is_read` | `bool` | no | default `false` |
| `created_at` | `timestamptz` | no | default `now()` |

### `property_plans`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `name` | `text` | no |  |
| `description` | `text` | yes | default `''` |
| `price` | `numeric` | no | default `0` |
| `duration_days` | `int4` | no | default `30` |
| `listing_limit` | `int4` | no | default `5` |
| `contact_reveal_limit` | `int4` | no | default `10` |
| `visibility_boost` | `bool` | yes | default `false` |
| `is_active` | `bool` | yes | default `true` |
| `created_at` | `timestamptz` | no | default `now()` |
| `plan_type` | `text` | yes | default `'owner'` |
| `features` | `jsonb` | yes | default `'[]'` |

### `property_reports`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `property_id` | `text` | no |  |
| `reporter_id` | `text` | no |  |
| `reason` | `text` | no | default `''` |
| `details` | `text` | yes | default `''` |
| `status` | `text` | no | default `'pending'` |
| `created_at` | `timestamptz` | no | default `now()` |

### `property_visits`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `property_id` | `text` | no |  |
| `seeker_id` | `text` | no |  |
| `seeker_name` | `text` | yes | default `''` |
| `visit_date` | `date` | no |  |
| `visit_time` | `text` | yes | default `''` |
| `status` | `text` | no | default `'requested'` |
| `notes` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |

### `saved_searches`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `text` | no |  |
| `name` | `text` | no | default `''` |
| `filters` | `jsonb` | no | default `'{}'` |
| `notify` | `bool` | no | default `true` |
| `created_at` | `timestamptz` | no | default `now()` |

## Socio (Social Network) service

### `call_ice_candidates`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `call_id` | `uuid` | no |  |
| `sender_id` | `uuid` | no |  |
| `candidate` | `jsonb` | no |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_ice_call_id` — public.call_ice_candidates USING btree (call_id)

### `calls`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `caller_id` | `uuid` | no |  |
| `callee_id` | `uuid` | no |  |
| `call_type` | `text` | no | default `'audio'` |
| `status` | `text` | no | default `'ringing'` |
| `offer` | `jsonb` | yes |  |
| `answer` | `jsonb` | yes |  |
| `started_at` | `timestamptz` | yes |  |
| `ended_at` | `timestamptz` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_calls_callee` — public.calls USING btree (callee_id)
- `idx_calls_caller` — public.calls USING btree (caller_id)
- `idx_calls_status` — public.calls USING btree (status) WHERE (status = 'ringing'::text)

### `message_backups`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `original_message_id` | `uuid` | no |  |
| `conversation_id` | `uuid` | no |  |
| `sender_id` | `uuid` | no |  |
| `content` | `text` | yes |  |
| `message_type` | `text` | yes | default `'text'` |
| `media_url` | `text` | yes |  |
| `original_created_at` | `timestamptz` | no |  |
| `deleted_by` | `uuid` | no |  |
| `deleted_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_message_backups_conversation` — public.message_backups USING btree (conversation_id)
- `idx_message_backups_sender` — public.message_backups USING btree (sender_id)

### `social_audio`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `title` | `text` | no | default `''` |
| `artist` | `text` | yes | default `''` |
| `genre` | `text` | yes | default `''` |
| `audio_url` | `text` | yes | default `''` |
| `cover_url` | `text` | yes | default `''` |
| `duration_seconds` | `int4` | yes | default `0` |
| `use_count` | `int4` | yes | default `0` |
| `is_trending` | `bool` | yes | default `false` |
| `status` | `text` | yes | default `'active'` |
| `created_at` | `timestamptz` | yes | default `now()` |

### `social_bookmarks`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `post_id` | `uuid` | no |  |
| `collection_name` | `text` | yes | default `'All Posts'` |
| `created_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `social_bookmarks_user_id_post_id_key` — unique public.social_bookmarks USING btree (user_id, post_id)

### `social_channels`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `owner_id` | `uuid` | no |  |
| `name` | `text` | no | default `''` |
| `description` | `text` | yes | default `''` |
| `cover_url` | `text` | yes | default `''` |
| `member_count` | `int4` | yes | default `0` |
| `is_public` | `bool` | yes | default `true` |
| `created_at` | `timestamptz` | yes | default `now()` |

### `social_comment_likes`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `comment_id` | `uuid` | no |  |
| `created_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `social_comment_likes_user_id_comment_id_key` — unique public.social_comment_likes USING btree (user_id, comment_id)

### `social_comments`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `post_id` | `uuid` | no |  |
| `user_id` | `uuid` | no |  |
| `parent_id` | `uuid` | yes |  |
| `content` | `text` | no | default `''` |
| `like_count` | `int4` | yes | default `0` |
| `is_pinned` | `bool` | yes | default `false` |
| `status` | `text` | yes | default `'active'` |
| `created_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `idx_social_comments_post` — public.social_comments USING btree (post_id)
- `idx_social_comments_post_created` — public.social_comments USING btree (post_id, created_at DESC)

### `social_config`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `key` | `text` | no |  |
| `value` | `text` | yes | default `''` |
| `description` | `text` | yes | default `''` |
| `updated_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `social_config_key_key` — unique public.social_config USING btree (key)

### `social_conversations`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `is_group` | `bool` | yes | default `false` |
| `group_name` | `text` | yes | default `''` |
| `group_photo` | `text` | yes | default `''` |
| `participants` | `jsonb` | yes | default `'[]'` |
| `last_message_at` | `timestamptz` | yes | default `now()` |
| `created_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `social_conversations_direct_participants_key` — unique public.social_conversations USING btree (((participants)::text)) WHERE (is_group = false)

### `social_follows`

Live row count at capture: 182.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `follower_id` | `uuid` | no |  |
| `following_id` | `uuid` | no |  |
| `status` | `text` | no | default `'active'` |
| `is_close_friend` | `bool` | yes | default `false` |
| `created_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `idx_social_follows_follower` — public.social_follows USING btree (follower_id)
- `idx_social_follows_following` — public.social_follows USING btree (following_id)
- `social_follows_follower_id_following_id_key` — unique public.social_follows USING btree (follower_id, following_id)

### `social_hashtags`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `name` | `text` | no |  |
| `post_count` | `int4` | yes | default `0` |
| `is_trending` | `bool` | yes | default `false` |
| `is_blocked` | `bool` | yes | default `false` |
| `created_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `social_hashtags_name_key` — unique public.social_hashtags USING btree (name)

### `social_highlights`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `name` | `text` | no | default `''` |
| `cover_url` | `text` | yes | default `''` |
| `story_ids` | `jsonb` | yes | default `'[]'` |
| `sort_order` | `int4` | yes | default `0` |
| `created_at` | `timestamptz` | yes | default `now()` |

### `social_likes`

Live row count at capture: 24.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `post_id` | `uuid` | no |  |
| `reaction_type` | `text` | yes | default `'like'` |
| `created_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `idx_social_likes_post` — public.social_likes USING btree (post_id)
- `social_likes_user_id_post_id_key` — unique public.social_likes USING btree (user_id, post_id)

### `social_message_reactions`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `message_id` | `uuid` | no |  |
| `user_id` | `uuid` | no |  |
| `emoji` | `text` | no |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_smr_message` — public.social_message_reactions USING btree (message_id)
- `idx_smr_user` — public.social_message_reactions USING btree (user_id)
- `social_message_reactions_message_id_user_id_emoji_key` — unique public.social_message_reactions USING btree (message_id, user_id, emoji)

### `social_messages`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `conversation_id` | `uuid` | no |  |
| `sender_id` | `uuid` | no |  |
| `message_type` | `text` | yes | default `'text'` |
| `content` | `text` | yes | default `''` |
| `media_url` | `text` | yes | default `''` |
| `metadata` | `jsonb` | yes | default `'{}'` |
| `is_read` | `bool` | yes | default `false` |
| `is_vanish` | `bool` | yes | default `false` |
| `created_at` | `timestamptz` | yes | default `now()` |
| `deleted_at` | `timestamptz` | yes |  |
| `deleted_for_everyone` | `bool` | no | default `false` |

Indexes:

- `idx_social_messages_deleted_at` — public.social_messages USING btree (deleted_at)

### `social_notes`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `content` | `text` | no | default `''` |
| `audience` | `text` | yes | default `'followers'` |
| `expires_at` | `timestamptz` | no |  |
| `created_at` | `timestamptz` | yes | default `now()` |

### `social_notifications`

Live row count at capture: 364.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `actor_id` | `uuid` | yes |  |
| `type` | `text` | no |  |
| `reference_id` | `uuid` | yes |  |
| `reference_type` | `text` | yes | default `''` |
| `message` | `text` | yes | default `''` |
| `is_read` | `bool` | yes | default `false` |
| `created_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `idx_social_notifications_user` — public.social_notifications USING btree (user_id)

### `social_posts`

Live row count at capture: 50.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `post_type` | `text` | no | default `'photo'` |
| `caption` | `text` | yes | default `''` |
| `location_name` | `text` | yes | default `''` |
| `media` | `jsonb` | yes | default `'[]'` |
| `hashtags` | `_text` | yes | default `'{}'` |
| `tagged_users` | `jsonb` | yes | default `'[]'` |
| `product_tags` | `jsonb` | yes | default `'[]'` |
| `audience` | `text` | yes | default `'public'` |
| `hide_like_count` | `bool` | yes | default `false` |
| `allow_comments` | `text` | yes | default `'everyone'` |
| `allow_remix` | `bool` | yes | default `true` |
| `is_ai_generated` | `bool` | yes | default `false` |
| `is_collab` | `bool` | yes | default `false` |
| `collab_user_id` | `uuid` | yes |  |
| `is_pinned` | `bool` | yes | default `false` |
| `is_repost` | `bool` | yes | default `false` |
| `original_post_id` | `uuid` | yes |  |
| `like_count` | `int4` | yes | default `0` |
| `comment_count` | `int4` | yes | default `0` |
| `share_count` | `int4` | yes | default `0` |
| `save_count` | `int4` | yes | default `0` |
| `view_count` | `int4` | yes | default `0` |
| `status` | `text` | yes | default `'active'` |
| `scheduled_at` | `timestamptz` | yes |  |
| `created_at` | `timestamptz` | yes | default `now()` |
| `updated_at` | `timestamptz` | yes | default `now()` |
| `repost_note` | `text` | yes |  |
| `is_edited` | `bool` | no | default `false` |
| `edited_at` | `timestamptz` | yes |  |
| `category` | `text` | yes |  |

Indexes:

- `idx_social_posts_category` — public.social_posts USING btree (category) WHERE (category IS NOT NULL)
- `idx_social_posts_created` — public.social_posts USING btree (created_at DESC)
- `idx_social_posts_original_post` — public.social_posts USING btree (original_post_id) WHERE (is_repost = true)
- `idx_social_posts_user` — public.social_posts USING btree (user_id)
- `idx_social_posts_user_repost` — public.social_posts USING btree (user_id, is_repost)

### `social_profiles`

Live row count at capture: 231.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `username` | `text` | no |  |
| `display_name` | `text` | no | default `''` |
| `bio` | `text` | yes | default `''` |
| `website` | `text` | yes | default `''` |
| `pronouns` | `text` | yes | default `''` |
| `category` | `text` | yes | default `''` |
| `location` | `text` | yes | default `''` |
| `avatar_url` | `text` | yes | default `''` |
| `account_type` | `text` | no | default `'personal'` |
| `is_verified` | `bool` | yes | default `false` |
| `is_private` | `bool` | yes | default `false` |
| `follower_count` | `int4` | yes | default `0` |
| `following_count` | `int4` | yes | default `0` |
| `post_count` | `int4` | yes | default `0` |
| `created_at` | `timestamptz` | yes | default `now()` |
| `updated_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `social_profiles_user_id_key` — unique public.social_profiles USING btree (user_id)
- `social_profiles_username_key` — unique public.social_profiles USING btree (username)
- `social_profiles_username_lower_key` — unique public.social_profiles USING btree (lower(username))

### `social_reports`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `reporter_id` | `uuid` | no |  |
| `content_type` | `text` | no |  |
| `content_id` | `uuid` | no |  |
| `reason` | `text` | no | default `''` |
| `details` | `text` | yes | default `''` |
| `status` | `text` | yes | default `'pending'` |
| `admin_note` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | yes | default `now()` |

### `social_shares`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `post_id` | `uuid` | no |  |
| `user_id` | `uuid` | no |  |
| `channel` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_social_shares_post` — public.social_shares USING btree (post_id)
- `social_shares_post_id_user_id_key` — unique public.social_shares USING btree (post_id, user_id)

### `social_stories`

Live row count at capture: 1.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `media_url` | `text` | yes | default `''` |
| `media_type` | `text` | yes | default `'photo'` |
| `background_color` | `text` | yes | default `''` |
| `text_content` | `text` | yes | default `''` |
| `stickers` | `jsonb` | yes | default `'[]'` |
| `audience` | `text` | yes | default `'public'` |
| `view_count` | `int4` | yes | default `0` |
| `reply_count` | `int4` | yes | default `0` |
| `expires_at` | `timestamptz` | no |  |
| `created_at` | `timestamptz` | yes | default `now()` |
| `is_edited` | `bool` | no | default `false` |
| `edited_at` | `timestamptz` | yes |  |
| `updated_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `idx_social_stories_user` — public.social_stories USING btree (user_id)

### `social_story_views`

Live row count at capture: 2.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `story_id` | `uuid` | no |  |
| `viewer_id` | `uuid` | no |  |
| `reaction` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | yes | default `now()` |

Indexes:

- `social_story_views_story_id_viewer_id_key` — unique public.social_story_views USING btree (story_id, viewer_id)

## Classifieds service

### `classified_ads`

Live row count at capture: 1.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `title` | `text` | no |  |
| `description` | `text` | no | default `''` |
| `price` | `numeric` | no | default `0` |
| `category` | `text` | no | default `''` |
| `city` | `text` | no | default `''` |
| `area` | `text` | no | default `''` |
| `images` | `jsonb` | yes | default `'[]'` |
| `user_id` | `text` | no |  |
| `status` | `text` | no | default `'pending'` |
| `user_name` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |
| `country_code` | `text` | no | default `'IN'` |
| `currency_code` | `text` | no | default `'INR'` |

### `classified_categories`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `int4` | no | **PK** · default `nextval('classified_categories_id_seq'` |
| `name` | `text` | no |  |

Indexes:

- `classified_categories_name_key` — unique public.classified_categories USING btree (name)

## Franchise service

### `active_franchises`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `franchise_id` | `text` | yes |  |
| `registration_id` | `uuid` | yes |  |
| `plan_id` | `uuid` | yes |  |
| `owner_name` | `text` | no |  |
| `company_name` | `text` | yes |  |
| `email` | `text` | yes |  |
| `mobile` | `text` | yes |  |
| `address` | `text` | yes |  |
| `city` | `text` | yes |  |
| `district` | `text` | yes |  |
| `state` | `text` | yes |  |
| `pincode` | `text` | yes |  |
| `territory` | `text` | yes |  |
| `coverage_details` | `jsonb` | no | default `'{}'` |
| `started_at` | `timestamptz` | no | default `now()` |
| `expires_at` | `timestamptz` | yes |  |
| `status` | `active_franchise_status` | no | default `'active'` · enum `active_franchise_status` |
| `documents` | `jsonb` | no | default `'[]'` |
| `user_id` | `uuid` | yes |  |
| `notes` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `active_franchises_franchise_id_key` — unique public.active_franchises USING btree (franchise_id)
- `idx_af_email` — public.active_franchises USING btree (email)
- `idx_af_plan` — public.active_franchises USING btree (plan_id)
- `idx_af_status` — public.active_franchises USING btree (status)

### `business_projection_master`

Live row count at capture: 15.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `scenario` | `text` | no |  |
| `scenario_label` | `text` | no |  |
| `scenario_order` | `int4` | no | default `0` |
| `category` | `text` | no |  |
| `category_order` | `int4` | no | default `0` |
| `investment` | `numeric` | no | default `0` |
| `members` | `int4` | no | default `0` |
| `turnover` | `numeric` | no | default `0` |
| `gross_profit` | `numeric` | no | default `0` |
| `net_profit` | `numeric` | no | default `0` |
| `share_pct` | `numeric` | no | default `0` |
| `category_profit` | `numeric` | no | default `0` |
| `profit_per_person` | `numeric` | no | default `0` |
| `spend_1` | `numeric` | no | default `0` |
| `spend_10` | `numeric` | no | default `0` |
| `spend_100` | `numeric` | no | default `0` |
| `spend_1000` | `numeric` | no | default `0` |
| `status` | `text` | no | default `'active'` |
| `notes` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `business_projection_master_scenario_category_key` — unique public.business_projection_master USING btree (scenario, category)

### `franchise_plans`

Live row count at capture: 4.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `name` | `text` | no |  |
| `category` | `text` | yes |  |
| `investment_amount` | `numeric` | no | default `0` |
| `security_deposit` | `numeric` | yes | default `0` |
| `delivery_radius_km` | `numeric` | yes | default `0` |
| `coverage_type` | `franchise_coverage_type` | no | default `'radius'` · enum `franchise_coverage_type` |
| `validity_months` | `int4` | no | default `12` |
| `description` | `text` | yes |  |
| `benefits` | `jsonb` | no | default `'[]'` |
| `features` | `jsonb` | no | default `'[]'` |
| `commission_structure` | `jsonb` | no | default `'{}'` |
| `status` | `franchise_plan_status` | no | default `'active'` · enum `franchise_plan_status` |
| `sort_order` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `territory` | `text` | yes |  |
| `promotion_benefits` | `jsonb` | yes | default `'[]'` |
| `product_visibility` | `text` | yes |  |
| `reward_benefits` | `jsonb` | yes | default `'[]'` |
| `redemption_benefits` | `jsonb` | yes | default `'[]'` |
| `key_features` | `jsonb` | yes | default `'[]'` |

### `franchise_registrations`

Live row count at capture: 8.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `registration_no` | `text` | yes |  |
| `applicant_name` | `text` | no |  |
| `company_name` | `text` | yes |  |
| `email` | `text` | yes |  |
| `mobile` | `text` | yes |  |
| `address` | `text` | yes |  |
| `city` | `text` | yes |  |
| `district` | `text` | yes |  |
| `state` | `text` | yes |  |
| `pincode` | `text` | yes |  |
| `country` | `text` | yes | default `'India'` |
| `plan_id` | `uuid` | yes |  |
| `requested_territory` | `text` | yes |  |
| `documents` | `jsonb` | no | default `'[]'` |
| `status` | `franchise_registration_status` | no | default `'pending'` · enum `franchise_registration_status` |
| `approved_by` | `uuid` | yes |  |
| `approved_at` | `timestamptz` | yes |  |
| `rejection_reason` | `text` | yes |  |
| `notes` | `text` | yes |  |
| `user_id` | `uuid` | yes |  |
| `created_by` | `uuid` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `franchise_registrations_registration_no_key` — unique public.franchise_registrations USING btree (registration_no)
- `idx_fr_email` — public.franchise_registrations USING btree (email)
- `idx_fr_plan` — public.franchise_registrations USING btree (plan_id)
- `idx_fr_status` — public.franchise_registrations USING btree (status)

## Logistics & Dispatch service

### `rider_assignments`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `order_id` | `text` | no |  |
| `rider_id` | `text` | no |  |
| `status` | `text` | no | default `'offered'` |
| `payout_amount` | `numeric` | no | default `0` |
| `distance_km` | `numeric` | yes |  |
| `offered_at` | `timestamptz` | no | default `now()` |
| `responded_at` | `timestamptz` | yes |  |
| `picked_up_at` | `timestamptz` | yes |  |
| `delivered_at` | `timestamptz` | yes |  |
| `rejection_reason` | `text` | yes |  |
| `pickup_lat` | `float8` | yes |  |
| `pickup_lng` | `float8` | yes |  |
| `pickup_address` | `text` | yes |  |
| `drop_lat` | `float8` | yes |  |
| `drop_lng` | `float8` | yes |  |
| `drop_address` | `text` | yes |  |
| `sequence_no` | `int4` | no | default `1` |
| `batch_id` | `uuid` | yes |  |
| `tip_amount` | `numeric` | no | default `0` |
| `base_payout` | `numeric` | no | default `0` |
| `distance_payout` | `numeric` | no | default `0` |

Indexes:

- `idx_rider_assignments_batch` — public.rider_assignments USING btree (batch_id)
- `idx_rider_assignments_rider_status` — public.rider_assignments USING btree (rider_id, status)
- `rider_assignments_order_id_rider_id_key` — unique public.rider_assignments USING btree (order_id, rider_id)

### `rider_locations`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `rider_id` | `text` | no |  |
| `order_id` | `text` | yes |  |
| `latitude` | `float8` | no |  |
| `longitude` | `float8` | no |  |
| `heading` | `numeric` | yes |  |
| `speed_kmph` | `numeric` | yes |  |
| `accuracy_m` | `numeric` | yes |  |
| `recorded_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_rider_locations_order` — public.rider_locations USING btree (order_id)
- `idx_rider_locations_rider_time` — public.rider_locations USING btree (rider_id, recorded_at DESC)

### `rider_payouts`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `rider_id` | `text` | no |  |
| `assignment_id` | `uuid` | yes |  |
| `order_id` | `text` | no |  |
| `base_amount` | `numeric` | no | default `0` |
| `distance_amount` | `numeric` | no | default `0` |
| `tip_amount` | `numeric` | no | default `0` |
| `total_amount` | `numeric` | no | default `0` |
| `distance_km` | `numeric` | no | default `0` |
| `status` | `text` | no | default `'pending'` |
| `settlement_id` | `text` | yes |  |
| `earned_at` | `timestamptz` | no | default `now()` |
| `settled_at` | `timestamptz` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_rider_payouts_rider_status` — public.rider_payouts USING btree (rider_id, status)
- `idx_rider_payouts_settlement` — public.rider_payouts USING btree (settlement_id)
- `uniq_rider_payouts_assignment` — unique public.rider_payouts USING btree (assignment_id) WHERE (assignment_id IS NOT NULL)

### `rider_settlements`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `rider_id` | `text` | no |  |
| `rider_name` | `text` | yes |  |
| `amount` | `numeric` | no | default `0` |
| `method` | `text` | no | default `'bank_transfer'` |
| `reference` | `text` | yes |  |
| `notes` | `text` | yes |  |
| `status` | `text` | no | default `'pending'` |
| `payout_count` | `int4` | no | default `0` |
| `initiated_by` | `uuid` | yes |  |
| `initiated_at` | `timestamptz` | no | default `now()` |
| `completed_at` | `timestamptz` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_rider_settlements_rider` — public.rider_settlements USING btree (rider_id)
- `idx_rider_settlements_status` — public.rider_settlements USING btree (status)

### `riders`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `user_id` | `uuid` | yes |  |
| `name` | `text` | no |  |
| `mobile` | `text` | no |  |
| `email` | `text` | yes |  |
| `profile_photo` | `text` | yes |  |
| `vehicle_type` | `text` | no |  |
| `vehicle_number` | `text` | yes |  |
| `license_number` | `text` | yes |  |
| `license_image_url` | `text` | yes |  |
| `aadhaar_number` | `text` | yes |  |
| `aadhaar_image_url` | `text` | yes |  |
| `pan_number` | `text` | yes |  |
| `pan_image_url` | `text` | yes |  |
| `bank_account_number` | `text` | yes |  |
| `bank_ifsc` | `text` | yes |  |
| `bank_holder_name` | `text` | yes |  |
| `city_id` | `text` | yes |  |
| `area_id` | `text` | yes |  |
| `base_location_lat` | `float8` | yes |  |
| `base_location_lng` | `float8` | yes |  |
| `current_lat` | `float8` | yes |  |
| `current_lng` | `float8` | yes |  |
| `is_online` | `bool` | no | default `false` |
| `shift_start` | `time` | yes |  |
| `shift_end` | `time` | yes |  |
| `kyc_status` | `text` | no | default `'pending'` |
| `status` | `text` | no | default `'active'` |
| `rating` | `numeric` | no | default `0` |
| `total_deliveries` | `int4` | no | default `0` |
| `total_earnings` | `numeric` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `riders_mobile_key` — unique public.riders USING btree (mobile)
- `riders_user_id_key` — unique public.riders USING btree (user_id)

## Notifications & Messaging service

### `complaint_messages`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `complaint_id` | `uuid` | no |  |
| `sender_id` | `text` | no |  |
| `sender_role` | `text` | no |  |
| `sender_name` | `text` | yes |  |
| `message` | `text` | no |  |
| `attachment_url` | `text` | yes |  |
| `is_internal` | `bool` | no | default `false` |
| `read_at` | `timestamptz` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_complaint_messages_complaint` — public.complaint_messages USING btree (complaint_id, created_at)

### `complaints`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `user_name` | `text` | yes |  |
| `entity_type` | `text` | no |  |
| `entity_id` | `text` | yes |  |
| `booking_id` | `uuid` | yes |  |
| `order_id` | `text` | yes |  |
| `category` | `text` | no | default `'general'` |
| `subject` | `text` | no |  |
| `description` | `text` | no |  |
| `images` | `json` | yes |  |
| `status` | `text` | no | default `'open'` |
| `priority` | `text` | no | default `'medium'` |
| `assigned_to` | `text` | yes |  |
| `resolution_notes` | `text` | yes |  |
| `resolved_at` | `timestamptz` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_complaints_category` — public.complaints USING btree (category)
- `idx_complaints_status` — public.complaints USING btree (status)
- `idx_complaints_user` — public.complaints USING btree (user_id)

### `customer_notifications`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `customer_id` | `text` | no |  |
| `type` | `text` | no |  |
| `title` | `text` | no |  |
| `message` | `text` | no |  |
| `reference_id` | `text` | yes |  |
| `reference_type` | `text` | yes |  |
| `deep_link` | `text` | yes |  |
| `is_read` | `bool` | no | default `false` |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_customer_notifications_customer` — public.customer_notifications USING btree (customer_id, created_at DESC)

### `email_send_log`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `message_id` | `text` | yes |  |
| `template_name` | `text` | no |  |
| `recipient_email` | `text` | no |  |
| `status` | `text` | no |  |
| `error_message` | `text` | yes |  |
| `metadata` | `jsonb` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_email_send_log_created` — public.email_send_log USING btree (created_at DESC)
- `idx_email_send_log_message` — public.email_send_log USING btree (message_id)
- `idx_email_send_log_message_sent_unique` — unique public.email_send_log USING btree (message_id) WHERE (status = 'sent'::text)
- `idx_email_send_log_recipient` — public.email_send_log USING btree (recipient_email)

### `email_send_state`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `int4` | no | **PK** · default `1` |
| `retry_after_until` | `timestamptz` | yes |  |
| `batch_size` | `int4` | no | default `10` |
| `send_delay_ms` | `int4` | no | default `200` |
| `auth_email_ttl_minutes` | `int4` | no | default `15` |
| `transactional_email_ttl_minutes` | `int4` | no | default `60` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `email_subscriptions`

Live row count at capture: 1.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `email` | `text` | no |  |
| `source` | `text` | no | default `'discount_banner'` |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `email_subscriptions_email_key` — unique public.email_subscriptions USING btree (email)

### `email_unsubscribe_tokens`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `token` | `text` | no |  |
| `email` | `text` | no |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `used_at` | `timestamptz` | yes |  |

Indexes:

- `email_unsubscribe_tokens_email_key` — unique public.email_unsubscribe_tokens USING btree (email)
- `email_unsubscribe_tokens_token_key` — unique public.email_unsubscribe_tokens USING btree (token)
- `idx_unsubscribe_tokens_token` — public.email_unsubscribe_tokens USING btree (token)

### `support_ticket_messages`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `ticket_id` | `text` | no |  |
| `sender_id` | `text` | no |  |
| `sender_role` | `text` | no |  |
| `sender_name` | `text` | yes |  |
| `message` | `text` | no |  |
| `attachment_url` | `text` | yes |  |
| `is_internal` | `bool` | no | default `false` |
| `read_at` | `timestamptz` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_support_ticket_messages_ticket` — public.support_ticket_messages USING btree (ticket_id, created_at)

### `support_tickets`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `customer_id` | `text` | no |  |
| `customer_name` | `text` | no | default `''` |
| `subject` | `text` | no |  |
| `description` | `text` | no | default `''` |
| `category` | `text` | no | default `''` |
| `priority` | `text` | no | default `'medium'` |
| `status` | `text` | no | default `'open'` |
| `assigned_to` | `text` | yes | default `''` |
| `resolution_notes` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `suppressed_emails`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `email` | `text` | no |  |
| `reason` | `text` | no |  |
| `metadata` | `jsonb` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_suppressed_emails_email` — public.suppressed_emails USING btree (email)
- `suppressed_emails_email_key` — unique public.suppressed_emails USING btree (email)

## Trust & Safety service

### `fraud_alerts`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `evaluation_id` | `uuid` | yes |  |
| `event` | `text` | no |  |
| `severity` | `text` | no | default `'medium'` |
| `score` | `int4` | no | default `0` |
| `customer_id` | `text` | yes |  |
| `mobile` | `text` | yes |  |
| `device_fingerprint` | `text` | yes |  |
| `ip_address` | `text` | yes |  |
| `campaign_id` | `uuid` | yes |  |
| `code` | `text` | yes |  |
| `order_id` | `text` | yes |  |
| `title` | `text` | no |  |
| `description` | `text` | yes |  |
| `status` | `text` | no | default `'open'` |
| `resolved_by` | `uuid` | yes |  |
| `resolved_at` | `timestamptz` | yes |  |
| `metadata` | `jsonb` | no | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `fraud_alerts_severity_idx` — public.fraud_alerts USING btree (severity, created_at DESC)
- `fraud_alerts_status_idx` — public.fraud_alerts USING btree (status, created_at DESC)

### `fraud_blacklist`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `entity_type` | `text` | no |  |
| `entity_value` | `text` | no |  |
| `reason` | `text` | yes |  |
| `source` | `text` | no | default `'manual'` |
| `severity` | `text` | no | default `'high'` |
| `metadata` | `jsonb` | no | default `'{}'` |
| `expires_at` | `timestamptz` | yes |  |
| `created_by` | `uuid` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `fraud_blacklist_type_idx` — public.fraud_blacklist USING btree (entity_type)
- `fraud_blacklist_unique` — unique public.fraud_blacklist USING btree (entity_type, entity_value)

### `fraud_device_fingerprints`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `fingerprint` | `text` | no |  |
| `customer_id` | `text` | yes |  |
| `mobile` | `text` | yes |  |
| `device_model` | `text` | yes |  |
| `os_name` | `text` | yes |  |
| `os_version` | `text` | yes |  |
| `app_version` | `text` | yes |  |
| `browser` | `text` | yes |  |
| `ip_address` | `text` | yes |  |
| `screen` | `text` | yes |  |
| `timezone` | `text` | yes |  |
| `language` | `text` | yes |  |
| `hardware_id` | `text` | yes |  |
| `first_seen_at` | `timestamptz` | no | default `now()` |
| `last_seen_at` | `timestamptz` | no | default `now()` |
| `seen_count` | `int4` | no | default `1` |
| `metadata` | `jsonb` | no | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `fraud_fingerprint_customer_idx` — public.fraud_device_fingerprints USING btree (customer_id)
- `fraud_fingerprint_customer_uidx` — unique public.fraud_device_fingerprints USING btree (fingerprint, COALESCE(customer_id, ''::text))
- `fraud_fingerprint_idx` — public.fraud_device_fingerprints USING btree (fingerprint)

### `fraud_evaluations`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `event` | `text` | no |  |
| `customer_id` | `text` | yes |  |
| `mobile` | `text` | yes |  |
| `device_fingerprint` | `text` | yes |  |
| `ip_address` | `text` | yes |  |
| `campaign_id` | `uuid` | yes |  |
| `code` | `text` | yes |  |
| `order_id` | `text` | yes |  |
| `lat` | `float8` | yes |  |
| `lng` | `float8` | yes |  |
| `score` | `int4` | no | default `0` |
| `action` | `text` | no | default `'allow'` |
| `matched_rules` | `jsonb` | no | default `'[]'` |
| `metadata` | `jsonb` | no | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `fraud_eval_campaign_idx` — public.fraud_evaluations USING btree (campaign_id, created_at DESC)
- `fraud_eval_customer_idx` — public.fraud_evaluations USING btree (customer_id, created_at DESC)
- `fraud_eval_device_idx` — public.fraud_evaluations USING btree (device_fingerprint, created_at DESC)
- `fraud_eval_event_idx` — public.fraud_evaluations USING btree (event, created_at DESC)

### `fraud_rate_limits`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `action` | `text` | no |  |
| `key` | `text` | no |  |
| `window_start` | `timestamptz` | no | default `now()` |
| `window_seconds` | `int4` | no | default `60` |
| `hits` | `int4` | no | default `0` |
| `blocked_until` | `timestamptz` | yes |  |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `fraud_rate_unique` — unique public.fraud_rate_limits USING btree (action, key)

### `fraud_rules`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `code` | `text` | no |  |
| `name` | `text` | no |  |
| `description` | `text` | yes |  |
| `category` | `text` | no | default `'general'` |
| `severity` | `text` | no | default `'medium'` |
| `action` | `text` | no | default `'warn'` |
| `score` | `int4` | no | default `10` |
| `threshold` | `int4` | no | default `1` |
| `window_seconds` | `int4` | no | default `3600` |
| `priority` | `int4` | no | default `100` |
| `enabled` | `bool` | no | default `true` |
| `config` | `jsonb` | no | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

Indexes:

- `fraud_rules_code_key` — unique public.fraud_rules USING btree (code)

## Platform & Admin service

### `activity_logs`

Live row count at capture: 374.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `text` | yes |  |
| `type` | `text` | no |  |
| `description` | `text` | no | default `''` |
| `metadata` | `jsonb` | yes | default `'{}'` |
| `created_at` | `timestamptz` | yes | default `now()` |

### `areas`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `name` | `text` | no |  |
| `city_id` | `text` | no |  |
| `city_name` | `text` | no | default `''` |
| `pincode` | `text` | no | default `''` |
| `status` | `text` | no | default `'active'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `country_code` | `text` | no | default `'IN'` |

Indexes:

- `idx_areas_country` — public.areas USING btree (country_code, status)

### `audit_logs`

Live row count at capture: 5.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `table_name` | `text` | no |  |
| `operation` | `text` | no |  |
| `record_id` | `text` | yes |  |
| `old_data` | `jsonb` | yes |  |
| `new_data` | `jsonb` | yes |  |
| `performed_by` | `uuid` | yes |  |
| `performed_by_role` | `text` | yes | default `''` |
| `ip_address` | `text` | yes | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_audit_logs_created` — public.audit_logs USING btree (created_at DESC)
- `idx_audit_logs_table` — public.audit_logs USING btree (table_name)

### `cities`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `name` | `text` | no |  |
| `state` | `text` | no |  |
| `status` | `text` | no | default `'active'` |
| `area_count` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `country_code` | `text` | no | default `'IN'` |

Indexes:

- `idx_cities_country` — public.cities USING btree (country_code, status)

### `countries`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `code` | `text` | no | **PK** |
| `name` | `text` | no |  |
| `currency_code` | `text` | no |  |
| `currency_symbol` | `text` | no |  |
| `currency_position` | `text` | no | default `'before'` |
| `decimal_places` | `int4` | no | default `2` |
| `thousands_separator` | `text` | no | default `','` |
| `decimal_separator` | `text` | no | default `'.'` |
| `locale_code` | `text` | no | default `'en-US'` |
| `tax_label` | `text` | no | default `'Tax'` |
| `tax_inclusive` | `bool` | no | default `false` |
| `default_tax_rate` | `numeric` | no | default `0` |
| `phone_prefix` | `text` | no | default `'+1'` |
| `flag_emoji` | `text` | yes |  |
| `is_active` | `bool` | no | default `true` |
| `is_default` | `bool` | no | default `false` |
| `display_order` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `country_switch_log`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `from_country_code` | `text` | yes |  |
| `to_country_code` | `text` | no |  |
| `switched_by` | `uuid` | yes |  |
| `switched_by_name` | `text` | yes |  |
| `reason` | `text` | yes |  |
| `metadata` | `jsonb` | no | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |

### `districts`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `name` | `text` | no |  |
| `state_id` | `uuid` | no |  |
| `status` | `text` | no | default `'active'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `country_code` | `text` | no | default `'IN'` |

Indexes:

- `idx_districts_country` — public.districts USING btree (country_code, status)

### `file_upload_rows`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `upload_id` | `uuid` | no |  |
| `row_number` | `int4` | no |  |
| `raw_data` | `jsonb` | no |  |
| `status` | `text` | no | default `'pending'` |
| `action` | `text` | yes |  |
| `resulting_record_id` | `text` | yes |  |
| `error_messages` | `jsonb` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |

Indexes:

- `idx_file_upload_rows_status` — public.file_upload_rows USING btree (upload_id, status)
- `idx_file_upload_rows_upload` — public.file_upload_rows USING btree (upload_id)

### `file_uploads`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `file_name` | `text` | no |  |
| `upload_type` | `text` | no | default `'product'` |
| `status` | `text` | no | default `'processing'` |
| `total_records` | `int4` | no | default `0` |
| `success_count` | `int4` | no | default `0` |
| `error_count` | `int4` | no | default `0` |
| `error_log` | `jsonb` | yes | default `'[]'` |
| `uploaded_by` | `text` | yes |  |
| `file_url` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `original_file_path` | `text` | yes |  |

### `odoo_config`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `int4` | no | **PK** · default `1` |
| `base_url` | `text` | yes |  |
| `database_name` | `text` | yes |  |
| `username` | `text` | yes |  |
| `api_key_secret_name` | `text` | yes | default `'ODOO_API_KEY'` |
| `sync_orders` | `bool` | no | default `true` |
| `sync_inventory` | `bool` | no | default `true` |
| `sync_shipments` | `bool` | no | default `true` |
| `sync_customers` | `bool` | no | default `false` |
| `default_warehouse_id` | `text` | yes |  |
| `last_sync_at` | `timestamptz` | yes |  |
| `last_sync_status` | `text` | yes |  |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |

### `odoo_sync_log`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `entity_type` | `text` | no |  |
| `entity_id` | `text` | no |  |
| `direction` | `text` | no | default `'outbound'` |
| `status` | `text` | no | default `'pending'` |
| `odoo_record_id` | `text` | yes |  |
| `payload` | `jsonb` | yes |  |
| `response` | `jsonb` | yes |  |
| `error_message` | `text` | yes |  |
| `retry_count` | `int4` | no | default `0` |
| `created_at` | `timestamptz` | no | default `now()` |
| `completed_at` | `timestamptz` | yes |  |

Indexes:

- `idx_odoo_sync_log_entity` — public.odoo_sync_log USING btree (entity_type, entity_id)
- `idx_odoo_sync_log_status` — public.odoo_sync_log USING btree (status, created_at DESC)

### `platform_settings`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `int4` | no | **PK** · default `1` |
| `active_country_code` | `text` | no | default `'IN'` |
| `dropshipping_enabled` | `bool` | no | default `false` |
| `odoo_integration_enabled` | `bool` | no | default `false` |
| `multi_currency_display` | `bool` | no | default `false` |
| `last_country_switched_at` | `timestamptz` | yes |  |
| `last_country_switched_by` | `uuid` | yes |  |
| `config` | `jsonb` | no | default `'{}'` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `odoo_enabled` | `bool` | no | default `false` |

### `platform_variables`

Live row count at capture: 1.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `key` | `text` | no |  |
| `value` | `text` | no | default `''` |
| `description` | `text` | no | default `''` |

Indexes:

- `platform_variables_key_key` — unique public.platform_variables USING btree (key)

### `report_log`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `report_type` | `text` | no |  |
| `generated_by` | `text` | no | default `''` |
| `format` | `text` | no | default `''` |
| `status` | `text` | no | default `'completed'` |
| `file_size` | `text` | no | default `''` |
| `created_at` | `timestamptz` | no | default `now()` |

### `restaurant_rating_summary`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `restaurant_id` | `text` | yes |  |
| `review_count` | `int4` | yes |  |
| `avg_food` | `numeric` | yes |  |
| `avg_restaurant` | `numeric` | yes |  |
| `avg_rider` | `numeric` | yes |  |

### `states`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `name` | `text` | no |  |
| `code` | `text` | no |  |
| `status` | `text` | no | default `'active'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `country_code` | `text` | no | default `'IN'` |

Indexes:

- `idx_states_country` — public.states USING btree (country_code, status)
- `states_country_code_unique` — unique public.states USING btree (country_code, code)

### `video_processing_jobs`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `uuid` | no | **PK** · default `gen_random_uuid()` |
| `user_id` | `uuid` | no |  |
| `original_url` | `text` | no |  |
| `original_storage_path` | `text` | yes |  |
| `processed_url` | `text` | yes |  |
| `thumbnail_url` | `text` | yes |  |
| `status` | `text` | no | default `'queued'` |
| `error_message` | `text` | yes |  |
| `metadata` | `jsonb` | yes | default `'{}'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `processed_storage_path` | `text` | yes |  |
| `thumbnail_storage_path` | `text` | yes |  |

Indexes:

- `idx_video_jobs_status` — public.video_processing_jobs USING btree (status)
- `idx_video_jobs_user` — public.video_processing_jobs USING btree (user_id)

### `website_queries`

Live row count at capture: 0.

| Column | Type | Null | Default / Notes |
|---|---|---|---|
| `id` | `text` | no | **PK** |
| `name` | `text` | no |  |
| `email` | `text` | no | default `''` |
| `phone` | `text` | no | default `''` |
| `subject` | `text` | no | default `''` |
| `message` | `text` | no | default `''` |
| `status` | `text` | no | default `'new'` |
| `created_at` | `timestamptz` | no | default `now()` |
| `updated_at` | `timestamptz` | no | default `now()` |
| `admin_reply` | `text` | yes |  |
| `replied_at` | `timestamptz` | yes |  |
| `replied_by` | `text` | yes |  |

