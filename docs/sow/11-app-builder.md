# 11 — Drag-and-Drop App Builder

Owner: `appbuilder-svc` (Laravel). Consumers: mobile clients, web storefront, admin builder UI.

The app builder lets an operator design the mobile home screen — and other configurable screens — visually, with no code, and publish the result to live clients. "Unlimited app designs" is achieved by composing a widget library with layout styles, themes, backgrounds and targeting rules.

## 1. Concepts

```text
app_screen        (home, category, offers, module landing, custom)
  └── layout_version   (draft | scheduled | published | archived)
        └── section    (ordered, with layout style + theme override + targeting)
              └── widget_instance  (widget type + config + data source + targeting)
```

- **Screen** — a named, addressable surface a client can request by key.
- **Layout version** — an immutable snapshot of the full screen composition. Editing always produces a new draft; publishing promotes a draft.
- **Section** — a horizontal band with its own background, padding, heading and layout style.
- **Widget instance** — one rendered unit with a typed configuration object validated against the widget's JSON schema.

## 2. Widget library

Each widget declares: a stable `type` key, a display name and icon, a JSON-schema configuration contract, allowed data sources, supported layout styles, a preview renderer, minimum client version, and per-module availability.

| Widget | Purpose | Key configuration |
|---|---|---|
| Banner carousel | Rotating hero images/videos | slides (image, video, alt, target), autoplay, interval, aspect ratio, indicators |
| Static banner | Single promotional image | asset, target, aspect ratio |
| Category grid | Category shortcuts | source (all / selected / by parent), columns, rows, shape (circle/square/rounded), show labels |
| Product carousel | Horizontal product rail | data source, limit, card style, show price/rating/discount, "view all" target |
| Product grid | Vertical product block | data source, limit, columns, card style |
| Deal / countdown | Time-boxed offer rail | campaign, end time, countdown style |
| Vendor rail | Featured stores | source (featured / nearby / top rated), limit, card style |
| Restaurant rail | Food vertical rail | cuisine filter, sort, limit, show delivery time |
| Property rail | Homes vertical rail | transaction type, locality, limit |
| Classified rail | Classifieds rail | category, radius, limit |
| Service rail | Services rail | category, provider filter, limit |
| Socio strip | Stories or reels strip | source, limit |
| Offer / coupon strip | Available coupons | campaign scope, limit, style |
| Wallet card | Points balance and CTA | show balance, show expiry warning, CTA target |
| Quick actions | Icon shortcut row | actions (icon, label, target), columns |
| Search bar | Inline or sticky search | placeholder, scope, sticky |
| Text block | Rich-text content | body, alignment, style |
| Spacer / divider | Layout control | height, line style |
| HTML / embed | Escape hatch | sanitised HTML, height |
| Video block | Inline video | asset, poster, autoplay, loop, muted |
| Map block | Nearby vendors on a map | radius, module filter, height |
| Countdown / announcement bar | Site-wide notice | message, target, dismissible |
| Ad slot | Placement-driven advertising | placement key, fallback behaviour |

New widgets are added by registering a type with its schema and renderer on both server and clients; the builder UI derives its property panel from the schema automatically.

## 3. Data sources

A widget's data source is declarative, not a raw query:

| Source | Parameters |
|---|---|
| `manual` | An explicit ordered list of entity ids |
| `category` | Category id(s), include descendants |
| `collection` | A curated collection maintained in admin |
| `query` | Named preset: newest, best selling, top rated, most discounted, trending |
| `personalised` | recently viewed, recommended for you, reorder |
| `nearby` | Radius from the user's active coordinates |
| `search` | A saved filter set |

Every source resolves through the owning service's public API with a cache key derived from source parameters plus the personalisation dimensions actually used. Personalised sources are cached per user with a short TTL; non-personalised sources are cached globally.

## 4. Layout styles and theming

- **Layout styles per widget** — carousel, grid, list, masonry, staggered, tabs, horizontal scroll — each with its own spacing, card aspect and overflow behaviour.
- **Card styles** — elevated, outlined, flat, image-dominant, compact, with configurable corner radius and shadow depth.
- **Theme** — colour tokens (primary, accent, surface, ink, success, warning, danger), typography scale and family, spacing scale, corner radius scale, shadow scale. Themes exist at platform, screen and section level, resolved by nearest override. Only tokens are configurable — raw colour values are never entered per widget.
- **Backgrounds** — solid token, gradient (two or three stops, angle), image (with overlay opacity and blur), or video (muted, looped, with a poster fallback).
- **Dark mode** — every theme defines both light and dark token sets; the builder previews both and a design cannot be published if a required dark token is missing.

## 5. Targeting and personalisation

Sections and widget instances each carry optional targeting predicates, all of which must pass for the element to render:

- Platform (iOS, Android, web) and minimum/maximum client version
- Country, state, district, city, or inside a named zone
- Authentication state, customer segment, new-versus-returning, and role
- Language / locale
- Schedule: start and end datetime, days of week, hours of day
- Feature flag
- A/B experiment variant

Unresolvable or empty widgets **collapse silently** — a section with no renderable widgets must not leave a blank band. This is a hard requirement of the rendering contract.

## 6. Builder UX

- Canvas with a device-frame preview (phone, tablet, web widths) rendering the real widget renderers, not mockups.
- Left rail: widget library, searchable and grouped.
- Drag to insert, drag to reorder within and across sections, duplicate, cut/paste, and delete with undo.
- Right rail: property panel generated from the widget's JSON schema, with token pickers for colours, an asset picker wired to media storage, and a targeting editor.
- Layer tree for precise selection and reordering in dense layouts.
- Live preview with an impersonation selector ("preview as": locale, platform, segment, city, logged-out).
- Validation panel listing schema errors, missing assets, broken targets and unpublished dependencies. Publishing is blocked while errors exist.
- Templates: start from a supplied template, save the current screen as a template, and clone a screen across countries.

## 7. Versioning, publish and rollback

```text
draft ──publish──▶ published ──(new publish)──▶ archived
  │                    ▲
  └──schedule──▶ scheduled ┘
```

- Publishing is atomic: clients either see the entire previous version or the entire new one, never a mix.
- Every published version records the actor, timestamp, note and a full snapshot; **one-click rollback** republishes a prior snapshot as a new version (history is never rewritten).
- Scheduled publishes activate at their datetime via a scheduled command.
- Concurrent editing uses optimistic locking with a clear conflict message; a lost update is a defect.
- A/B experiments publish two variants against the same screen key with a traffic split and a metric target; results feed the marketing dashboard.

## 8. Client rendering contract

- Clients fetch `GET /v1/app/screens/{key}` with platform, version, locale, country and coordinates; the response is a fully resolved layout tree with data already embedded for above-the-fold widgets and deferred endpoints for the rest.
- The response carries a layout version identifier and an ETag; clients cache the last successful layout and render it offline or on failure.
- **Forward compatibility**: a client encountering an unknown widget type skips it silently rather than failing the screen. Widgets declare a minimum client version so operators can target new widgets safely.
- Images and videos in the payload include explicit intrinsic dimensions so clients reserve space and avoid layout shift.
- Deep-link targets are declared as structured route descriptors (module, entity, id, params), not as raw URLs, so clients route natively.

## 9. Performance

- Resolved layouts are cached at the edge and in Redis, keyed by screen, platform, version band, locale, country and geo bucket, with event-driven invalidation on publish and on referenced-entity change.
- Above-the-fold data is embedded to avoid a request waterfall on app launch; the remainder streams.
- Total home-screen payload target: under 150 KB compressed excluding media.

## 10. Acceptance criteria

1. A layout published from the builder renders identically in preview and on device.
2. An unknown or unavailable widget never blanks or breaks a screen.
3. Rollback restores the exact prior rendering within the cache TTL.
4. Targeting rules are evaluated server-side; a client cannot obtain content it is not targeted for.
5. Two operators editing the same screen cannot silently overwrite each other.
6. A published screen renders correctly in every supported locale, in dark mode, and offline from cache.
