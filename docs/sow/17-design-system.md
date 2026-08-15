# 17 — Design System

## 1. Principles

Premium quick-commerce aesthetic — airy, high-contrast, fast-feeling. Content first, chrome second. One distinctive visual direction across all portals; generic template styling, default system-serif typography and purple-on-white gradients are explicitly out of scope.

## 2. Tokens

All colour, spacing, radius, shadow and typography values are **semantic tokens**. Components reference tokens only; raw hex values and hardcoded colour utilities are not permitted anywhere in component code, because they break theming and dark mode.

| Token | Light | Role |
|---|---|---|
| `bg` | airy off-white | App background |
| `surface` | white | Cards, sheets |
| `surface-muted` | off-white tint | Secondary panels |
| `ink` | deep navy `#011D33` | Primary text |
| `ink-muted` | navy at reduced emphasis | Secondary text |
| `primary` | teal `#009999` | Primary actions, links |
| `primary-contrast` | white | Text on primary |
| `accent` | amber `#F89F03` | Highlights, badges, secondary CTA |
| `success` / `warning` / `danger` / `info` | semantic states | Feedback |
| `border` / `divider` | low-contrast neutrals | Structure |

A dark token set is defined for every token; a component that renders correctly in light but not dark is incomplete. Gradients (`gradient-brand`) and shadows (`shadow-sm/md/lg`, `glow-primary`) are tokens too, not per-component values.

Spacing scale: 4-point base (4, 8, 12, 16, 20, 24, 32, 40, 48, 64). Radius scale: 8, 12, 16 (default card), 24, full. Elevation: four levels, used consistently by surface role.

## 3. Typography

A geometric humanist sans for UI with a distinct display face for headings; no serif in product UI. Scale: display 32/40, h1 28/36, h2 24/32, h3 20/28, body-lg 16/24, body 14/20, caption 12/16. Weights 400/500/600/700. Numerals tabular in tables, ledgers and money. Locale-aware fallbacks for Indic scripts, and full RTL support.

## 4. Components

Buttons (primary, accent, secondary, ghost, destructive, link; sizes sm/md/lg; loading and disabled states), inputs (default height 44 px, with label, helper, error and prefix/suffix), select and combobox, checkbox/radio/switch, date and time pickers, sliders, file upload with preview, rich text editor (mandatory for all multi-line content fields — plain textareas are not acceptable), cards (16 px radius, token shadow), lists and data grids, tabs, accordions, modals and bottom sheets, toasts, tooltips, popovers, badges and chips, avatars, progress and skeletons, empty states, pagination, breadcrumbs, stepper, rating, and map components.

Rules: select components never use an empty string as an option value — a non-empty sentinel or an unset value is required. Every interactive element has visible focus, a minimum 44×44 px touch target, a loading state and a disabled state. Every list has an explicit empty state and an error state with a retry.

## 5. Layout

Container max width 1800 px with progressive type and spacing scaling. Breakpoints: 360, 640, 768, 1024, 1280, 1536, 1800. Mobile-first: single column, sticky bottom navigation, safe-area insets respected top and bottom (notches and home indicators), and bottom padding sufficient that content never sits under the navigation bar. Desktop admin uses a persistent sidebar with a collapsible rail.

## 6. Motion

Durations 120 ms (micro), 200 ms (standard), 320 ms (overlay). Standard easing for entry, decelerate for exits. Motion communicates state change only — no decorative animation on data-dense screens. All motion respects reduced-motion preferences.

## 7. Media standards

Images WebP at quality 70, longest edge max 2048 px, always with explicit width and height and lazy loading below the fold, with a blur or dominant-colour placeholder. Video H.264, 480p, maximum 45 s, muted and looped where autoplayed, always with a poster. Only genuine photography and footage; placeholder imagery and decorative emoji are not acceptable in product surfaces. Every image carries meaningful alt text.

## 8. Accessibility

WCAG 2.1 AA: 4.5:1 contrast for body text and 3:1 for large text and UI boundaries; full keyboard operability with a visible focus ring and logical order; correct semantics and ARIA for custom widgets; form fields programmatically labelled with errors announced; live regions for async updates; no colour-only meaning; screen-reader verification on the core flows of every portal.

## 9. Brand and error surfaces

Platform branding only — no build-tool or vendor branding anywhere in the product. A custom error boundary presents branded, human-readable failure states with a retry and a support path, and reports the error with a correlation id. Loading uses skeletons matched to the final layout so nothing shifts on arrival.

## 10. Acceptance criteria

1. No component contains a raw colour value or a hardcoded colour utility.
2. Every screen renders correctly in light, dark and an RTL locale.
3. Cumulative layout shift stays within the budget on every key route because all media declares dimensions.
4. Core flows in each portal pass an automated accessibility audit with no critical violations.
