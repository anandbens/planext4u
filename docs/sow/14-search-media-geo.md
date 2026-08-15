# 14 — Search, Media and Geospatial

## Part A — Search

### A1. Driver interface

Search is pluggable. One interface, three implementations selected by configuration per index:

```text
SearchDriver
  index(indexName, documents[])            upsert in bulk
  delete(indexName, ids[])
  search(indexName, Query) → Result
  suggest(indexName, prefix, ctx) → Suggestion[]
  reindex(indexName, cursor)               full rebuild, resumable
  health() → Status
```

`Query` carries: text, filters (term, range, boolean), geo filter (point + radius, or polygon), facet requests, sort spec, pagination cursor, and a personalisation context (account, coordinates, locale, country).
`Result` carries: hits with id, score and a stored summary document, facet buckets, total (exact or lower-bounded), and the cursor.

| Implementation | Use |
|---|---|
| **Database full-text** (PostgreSQL `tsvector` + `pg_trgm` + PostGIS) | Default; zero extra infrastructure; adequate to mid scale |
| **OpenSearch** | Self-hosted scale-out with full analyzer and relevance control |
| **Algolia** | Managed, lowest-latency typeahead |

The database driver is the **fallback**: if the configured external driver is unhealthy, queries degrade to it automatically and a degradation event is emitted. No feature may exist only in one driver.

### A2. Indexes

| Index | Documents | Key fields |
|---|---|---|
| `products` | Approved, active products and variants | title, description, brand, category path, attributes, price, discount, rating, vendor, vendor location point, stock flag, popularity, freshness |
| `restaurants` | Approved restaurants | name, cuisines, dish names, location point, zone ids, rating, delivery time, price band, open flag |
| `menu_items` | Available items | name, description, restaurant, category, veg flag, price |
| `properties` | Active listings | title, locality path, property/transaction type, bedrooms, area, price, amenities, location point, freshness, boost |
| `classified_ads` | Active ads | title, description, category, dynamic attributes, price, location point, condition, freshness, boost |
| `services` | Active services and providers | name, category, provider, price, service-area geometry, rating |
| `socio_content` | Public posts, reels, profiles, hashtags | caption, hashtags, mentions, handle, name, engagement, recency |
| `vendors` | Approved vendors | name, categories, location point, rating, plan tier |

Documents are **denormalised summaries** sufficient to render a result card without a fetch.

### A3. Analysis and relevance

- Analyzers: lowercase, ASCII folding, stop words per locale, stemming per locale, synonym sets (maintained in admin), shingles for phrase matching, and an edge-ngram field for typeahead.
- Typo tolerance: fuzziness scaled by term length, disabled for short tokens and for numeric/SKU fields.
- Field weighting: title ≫ brand/category ≫ attributes ≫ description.
- Ranking blend: `text_relevance × w1 + popularity × w2 + rating × w3 + freshness × w4 + boost × w5 − distance_penalty × w6`, weights configurable per index and A/B testable.
- Business rules: out-of-stock, closed and unserviceable results are demoted (or filtered, per module policy) but never silently dropped without the count reflecting it. Promoted/sponsored slots are labelled and capped.
- Personalisation: distance from the user's active coordinates, previously purchased categories, and language preference influence ranking only — never visibility.

### A4. Autocomplete

Single endpoint returning grouped suggestions across categories, products, vendors, restaurants, dishes, localities and services. Debounced at 150 ms client-side, capped per group, ranked exact-prefix → popularity → distance, with recent and trending queries included for empty input. Target p95 latency 100 ms.

### A5. Indexing pipeline

- Event-driven: owning services emit change events; an indexer consumer transforms and bulk-upserts with a target visibility lag under 30 seconds.
- Deletes and visibility changes propagate immediately (an unapproved or expired item must vanish from search at once).
- Full reindex is resumable, runs against a new index alias, and swaps atomically on completion.
- A nightly consistency job diffs source counts and checksums against the index and repairs drift.

### A6. Acceptance criteria (search)

1. Switching driver by configuration changes no application code and no result contract.
2. An external driver outage degrades to the database driver without user-visible failure.
3. An unpublished, expired or out-of-zone item never appears in results.
4. Facet counts equal the counts obtained by applying the same filters.

---

## Part B — Media

### B1. Upload flow

1. Client requests an upload target; the service validates MIME type, declared size and the caller's quota, then returns a **pre-signed direct-to-object-storage URL** and an upload id. Bytes never pass through application servers.
2. Client uploads directly, resumable/multipart for large files.
3. Client calls complete; the service verifies the object, records provenance, and enqueues derivation.
4. `media-workers` (Go) derive variants, then publish `media.ready` with the variant manifest. The owning entity references the media id, never a raw URL.

Validation: real content-type sniffing (not the declared header), maximum dimensions and duration, virus scanning, EXIF stripping (with GPS removal), and automated content classification before the asset becomes publicly visible.

### B2. Image pipeline

- Canonical format **WebP at quality 70**, longest edge **max 2048 px**, with AVIF additionally generated where the client advertises support.
- Variant ladder: `thumb 160`, `card 480`, `detail 1080`, `full 2048`, plus 2× density variants for the first three.
- Originals are retained in cold storage for reprocessing; they are never served.
- Every stored variant records width and height so clients always render with explicit dimensions (CLS control).
- Dominant-colour and blurhash placeholders are generated for progressive loading.

### B3. Video pipeline

- Canonical **H.264 (baseline/main), 480p, maximum 45 seconds** for user-generated marketplace video; social reels may use a taller ladder where configured.
- Ladder: 360p / 480p (+ 720p for reels), CRF-targeted, with faststart so the moov atom is at the head, and **byte-range support** on the CDN — required for Safari playback.
- HLS packaging for adaptive playback on longer content; progressive MP4 for short loops.
- Poster/thumbnail extracted at a short seek offset (never frame zero, to avoid black posters); animated preview optional.
- Audio normalised; voice notes encoded at 16 kHz mono.
- Autoplay assets must be muted and looped, with the poster rendered underneath so something is always visible before decode.

### B4. Storage and delivery

- Object storage layout: `{env}/{module}/{entity}/{yyyy}/{mm}/{media_id}/{variant}.{ext}`; immutable objects, new versions get new ids.
- Public assets are served through the **CDN** with long-lived immutable cache headers; private assets (documents, KYC, invoices, proofs of delivery) are served only through **short-lived signed URLs**, never made public, and access-logged.
- Cache invalidation on replacement is by new id (preferred) or explicit purge.
- Lifecycle: originals to cold storage after 30 days; derived variants of deleted entities purged after the retention window; KYC documents retained per regulation and then destroyed with a record of destruction.

### B5. Standards enforcement

Only real photography and genuine footage is acceptable in production content; placeholder and stand-in imagery must not ship. Every image requires alt text for accessibility and SEO. Media that fails derivation surfaces a clear error to the uploader rather than a silently broken asset.

### B6. Acceptance criteria (media)

1. No media bytes traverse the application tier.
2. Every rendered image and video has intrinsic dimensions available before load.
3. Private documents are unreachable without a valid, unexpired signature.
4. Short looping videos autoplay reliably on iOS Safari, Android Chrome and desktop, including after backgrounding and back-forward-cache restore.

---

## Part C — Geospatial

### C1. Foundations

PostGIS on PostgreSQL, SRID 4326 for storage, geography type for distance, projected computation where accuracy matters. Every location-bearing table carries a `geometry(Point,4326)` with a **GiST index**; zone tables carry `geometry(MultiPolygon,4326)` with a GiST index and a validity constraint (`ST_IsValid`).

### C2. Core queries

```sql
-- vendors serviceable at a customer point
SELECT v.id
FROM   vendors v
WHERE  ST_DWithin(v.location::geography, ST_MakePoint(:lng,:lat)::geography, v.service_radius_m)
  AND  v.status = 'active';

-- highest-priority zone containing a point
SELECT z.*
FROM   delivery_zones z
WHERE  z.is_active AND ST_Contains(z.geometry, ST_SetSRID(ST_MakePoint(:lng,:lat),4326))
ORDER  BY z.priority DESC
LIMIT  1;

-- nearest available riders to a pickup
SELECT r.id, ST_Distance(r.last_location::geography, :pickup::geography) AS m
FROM   riders r
WHERE  r.state = 'online_idle'
  AND  ST_DWithin(r.last_location::geography, :pickup::geography, :radius_m)
ORDER  BY m
LIMIT  20;
```

Rules: never compute distance in the application over a full table scan; never filter by bounding box alone where a radius is meant; always let the GiST index do the work by keeping the indexed expression on the left.

### C3. Zone management

Operators draw polygons with the **Google Maps** drawing library in admin. On save the geometry is validated (closed ring, no self-intersection, minimum area, within country bounds), simplified to a tolerance, and stored. Overlaps are permitted and resolved by `priority`. A zone editor shows overlap warnings, coverage gaps against a city boundary, and a test tool that reports which zone a clicked point resolves to and what fee it would produce.

### C4. Distance and fees

- Great-circle (Haversine / `ST_Distance` on geography) is the baseline, multiplied by a configurable **detour factor** to approximate road distance.
- Where a routing provider is configured, road distance and duration are used and cached by rounded origin/destination pair; provider failure falls back to the baseline with the fallback recorded on the order.
- Fee computation is specified in `05 §4.2`; the resolved zone, distance, factors and surge rule are all snapshotted onto the order so a fee can always be explained after the fact.

### C5. Tracking geometry

Rider pings are validated (accuracy threshold, speed plausibility, jump rejection), snapped to the route where a routing provider exists, smoothed, and downsampled for storage. Geofences at pickup and drop trigger arrival events. Route deviation beyond a threshold raises an operations alert. Payout distance is computed from the stored trace, not from the straight-line origin–destination pair.

### C6. Geocoding and addresses

Address entry uses provider autocomplete with a map-pin confirmation step; the confirmed pin, not the geocoder's guess, is authoritative. Reverse geocoding fills state, district, city and pincode, all validated against the platform's geography master (District is the canonical city-level unit). Geocoding results are cached to control provider cost.

### C7. Acceptance criteria (geo)

1. Every spatial query uses its GiST index (verified by query plan) and stays within the latency budget at target scale.
2. A point in overlapping zones always resolves to the same zone for the same inputs.
3. Serviceability decisions are identical at browse, cart and checkout for unchanged inputs.
4. Delivery fee is reproducible from the order snapshot alone.
