# 05 — Food Delivery

Services: `food-svc` (owner), `logistics-svc`, `tracking-svc`, `payments-svc`, `promotions-svc`, `realtime-gateway`, `notification-workers`.

Food is deliberately a separate bounded context from Ecommerce: its catalogue is time-sensitive, its fulfilment is minutes not days, and its pricing is zone- and surge-driven.

## 1. Restaurants

Restaurant record: owning vendor, name, cuisine tags, description, logo and cover media, address with **geometry point**, contact, FSSAI/licence details, GST details, opening hours per weekday with multiple slots, holiday overrides, preparation-time estimate, min order value, packaging charge, service radius or attached delivery zones, veg/non-veg/both classification, and status (`draft | pending | approved | active | paused | suspended`).

Open/closed is computed, never stored as an editable boolean: `is_open = within_opening_slot AND NOT holiday_override AND manual_toggle_on AND accepting_orders`. A restaurant that is closed is still discoverable but cannot be ordered from; the UI must show the next opening time.

Ratings are maintained as a materialised summary (average, count, distribution), refreshed by review events.

## 2. Menu

```text
restaurant → menu_category (ordered) → menu_item → variants / add-on groups
                                     → menu_combo → component items
```

Menu item: name, description, images, base price, variant options (size/portion), add-on groups with min/max selection rules, veg flag, spice level, allergens, tax class, preparation time, availability schedule (item-level day/time windows), daily stock cap, and `is_available` toggle.

**Combos** bundle items at a fixed price with their own availability window; the combo price overrides component pricing and the discount attribution is recorded for settlement.

**Notify-me** requests are captured when an item is unavailable and fire a notification when it returns.

## 3. Discovery

- Listing is location-first: only restaurants whose delivery zone contains, or whose radius covers, the customer's active coordinates are shown.
- Filters: cuisine, veg/non-veg, rating, price band, delivery time, offers available, currently open.
- Sorting: relevance, delivery time, rating, distance, cost.
- Each card shows computed delivery time (`prep_time + travel_time_estimate`), delivery fee for that customer's location, and any applicable offer.

## 4. Zone-based delivery

This is a headline capability and is specified in full here; the geospatial mechanics are in `14-search-media-geo.md`.

### 4.1 Zone definition

An operator draws a zone on a map (Google Maps drawing tools). A zone is a **PostGIS polygon or multipolygon** with:

| Field | Purpose |
|---|---|
| `name`, `country`, `city` | Identification and scoping |
| `geometry` | Polygon / multipolygon, SRID 4326, GiST-indexed |
| `priority` | Resolves overlapping zones — highest priority wins |
| `is_active`, `active_hours` | Enable/disable, optional time windows |
| `base_fee` | Flat fee for delivery inside the zone |
| `free_delivery_threshold` | Order value above which the base fee is waived |
| `per_km_rate`, `free_km` | Distance component beyond a free allowance |
| `min_order_value` | Below this, ordering is blocked or a small-order fee applies |
| `small_order_fee` | Applied when below `min_order_value`, if configured |
| `max_delivery_distance` | Hard cap regardless of polygon |
| `surge_rules` | Ordered rules producing a multiplier or a flat addition |
| `rider_payout_rules` | Zone-specific rider earning parameters |

### 4.2 Fee computation

```text
distance_km    = road distance if a routing provider is configured,
                 else great-circle distance × configurable detour factor
billable_km    = max(0, distance_km − free_km)
distance_fee   = billable_km × per_km_rate
subtotal_fee   = base_fee + distance_fee
surge          = evaluate(surge_rules)   → multiplier and/or flat addition
delivery_fee   = round( subtotal_fee × surge.multiplier + surge.flat )
if order_value ≥ free_delivery_threshold → delivery_fee = 0 (surge may still apply, per config)
if order_value < min_order_value        → add small_order_fee or block
delivery_fee   = clamp(delivery_fee, zone.min_fee, zone.max_fee)
```

### 4.3 Surge rules

Each rule has a condition and an effect, evaluated in priority order, first match wins unless the rule is marked cumulative.

Conditions: time of day / day of week; rain or weather flag (manual or provider-driven); active-order-to-available-rider ratio in the zone; explicit operator override with a start and end time; public holiday calendar.

Effects: multiplier (e.g. ×1.5), flat addition, or both. Every applied surge is snapshotted onto the order with the rule id and the reason so the customer-facing breakdown and the rider payout can both explain it.

### 4.4 Serviceability check

On address selection, on cart view and again at checkout: resolve the customer's point to the highest-priority active zone containing it; confirm the restaurant is attached to that zone or within its radius; confirm the distance is under `max_delivery_distance`. Failure returns a specific, actionable reason — never a generic error.

## 5. Cart and checkout

Single-restaurant carts only; switching restaurant prompts to clear the cart. The cart holds items with selected variants and add-ons, special instructions per item and per order, tip amount, cutlery preference, and the selected address.

Total composition:

```text
items_subtotal
− item/cart-level discounts (food_coupons, cart rules)
+ packaging_charge (per item and/or per order)
+ delivery_fee (zone computation above)
+ platform_fee
+ taxes (GST on food; delivery and platform fees taxed per configuration)
+ tip
− points_redeemed (same maximum-redeemable rules as 04 §6.3)
= amount_payable
```

Food coupons are a separate campaign namespace from ecommerce coupons, with the same reservation → commit → release → rollback protocol.

## 6. Order lifecycle

```text
placed → payment_confirmed → restaurant_accepted → preparing → ready_for_pickup
       → rider_assigned → picked_up → out_for_delivery → delivered → completed
```
Terminal branches: `rejected_by_restaurant`, `cancelled_by_customer`, `cancelled_by_platform`, `undelivered`, `refunded`.

Rules:
- Auto-cancel and refund if the restaurant does not accept within a configurable window.
- Customer cancellation is free until `restaurant_accepted`, then subject to a cancellation policy with reason codes drawn from a managed list.
- Every transition writes a status-history row and publishes an event consumed by the realtime gateway, notification workers and analytics.
- The customer sees a live timeline; the restaurant sees an ops queue; the rider sees the assignment.

## 7. Dispatch and live tracking

- On `ready_for_pickup` (or earlier, on `preparing`, per configuration for pre-assignment), `logistics-svc` requests an assignment. The dispatch algorithm is specified in `09-modules-vendor-rider-logistics.md`.
- `tracking-svc` (Go) ingests rider location pings, matches them to active assignments, and publishes position updates.
- The customer app subscribes over **SSE** by default, upgrading to **WebSocket** where available, with **Pusher/Echo** channels as a third transport option so existing integrations and low-capability clients are supported. All three carry the same event payload; transport selection is a client concern.
- Location fan-out latency budget: 2 seconds device → viewer. Positions are throttled and smoothed; raw pings are persisted at a lower resolution for audit and payout distance calculation.

## 8. Order chat

Per-order chat threads between customer, restaurant and rider, scoped to the order and auto-closed a configurable period after completion. Text plus image attachments. Delivered through the realtime gateway with persistence in `food-svc`. Participants are derived from the order, never from a client-supplied list.

## 9. Payments, refunds and settlement

- Food payments are recorded separately from ecommerce payments but reconcile through the same `payments-svc` contracts and the same gateway drivers.
- Refunds: full (rejection, undelivered, platform cancellation), partial (missing item, quality complaint), and goodwill wallet credit. Every refund records reason, approver and the bearer (restaurant, platform, or split).
- Restaurant settlement uses the same commission cascade and cooling period as vendor settlement (`09`), computed on the food order's net value after bearer-attributed discounts.
- Rider earnings per delivery combine base payout, per-km component, surge share and tip (tips pass through in full to the rider).

## 10. Reviews

Reviews are permitted only on `delivered`/`completed` orders, separately for the food and the delivery experience. Helpful votes are tracked. Restaurant ratings recompute via events. Moderation follows the shared moderation pipeline.

## 11. Acceptance criteria

1. A point inside two overlapping zones resolves deterministically to the higher-priority zone.
2. The delivery fee shown at cart, at checkout and on the invoice is identical for an unchanged cart and location.
3. A surge applied to an order is explainable from the order record alone, naming the rule.
4. An order not accepted within the acceptance window is automatically cancelled and refunded without operator action.
5. Live tracking continues across app backgrounding and network loss, resuming within 5 seconds of reconnect.
6. Tips reach the rider in full and never enter the platform commission base.
