# SolarCalc India — Design System

> **This document is the visual contract for SolarCalc India.**
> Every new component, route, or chart must conform to the tokens, scales, and
> patterns defined here. If something you need isn't listed, **add a token**
> (with a one-line justification comment in `tailwind.config.ts`) rather than
> hard-coding a hex, px value, or shadow string in a component.
>
> **For AI coding agents**: read this file in full before adding any UI. Treat
> the "Do / Don't" pairs as enforceable rules — they're the most common ways the
> system gets violated.

---

## 1. Purpose

SolarCalc India is a feasibility tool used by **mixed technical and non-technical
audiences** — engineers and analysts on laptops, plus account managers and field
staff on phones. It is **data-heavy by nature** (cash flows, IRR, P&L tables,
multi-year charts) but must never feel like a spreadsheet. The visual system
exists to make those numbers **readable, trustworthy, and modern**, without
tipping into "analytical software" coldness.

Two non-negotiables flow from that:

1. **Numbers are first-class citizens.** Every figure on screen uses
   tabular-numeric Inter, the `data` type scale, and a clear semantic colour
   when it carries meaning (positive cash, negative cash, break-even, etc.).
2. **The chrome stays out of the way.** Surfaces are warm-white, accents are
   used sparingly, motion is subtle, and the palette stays in a single
   modern-renewable family so the data — not the UI — is what the user remembers.

---

## 2. Brand cues

Five short principles. Each translates directly into a visual rule.

- **Modern** — generous whitespace, soft shadows, large radii on cards,
  Inter at all weights, no skeuomorphism, no gradients except in chart fills.
- **Renewable** — single emerald primary; sunlight amber as the only accent;
  no rainbow palettes, no aqua/cyan tech tropes.
- **Data-forward but warm** — tabular-numeric for all numbers; warm off-white
  surfaces (`#FFFFFF` / `#F8FAFC`) instead of cold greys; never put bold
  colours behind tables.
- **Mobile-first** — every component must work at 360px wide and respond to
  touch. Tap targets ≥ 48px. Tooltips open on tap. Tables scroll horizontally
  with a sticky first column.
- **Accessible** — WCAG-AA contrast on both themes, visible focus rings,
  colour never the only signal, `prefers-reduced-motion` respected.

---

## 3. Colour tokens (Palette: "Solar Field")

Pure emerald + sunlight, neutral surfaces, semantics for state. Both themes are
defined; the app currently runs in light mode (`<html class="light">`) but every
component must be dark-mode-compatible by using only token names — never raw
hex.

### 3.1 Light theme

| Token                          | Hex       | Use                                                        |
| ------------------------------ | --------- | ---------------------------------------------------------- |
| `primary`                      | `#047857` | Brand colour. Primary buttons, active nav, key chart line. |
| `on-primary`                   | `#FFFFFF` | Text/icons on `primary`.                                   |
| `primary-container`            | `#34D399` | Hover/selected on primary surfaces, soft brand fills.      |
| `on-primary-container`         | `#022C22` | Text/icons on `primary-container`.                         |
| `secondary`                    | `#FBBF24` | Sunlight accent. Break-even markers, "best" highlights.    |
| `on-secondary`                 | `#1C1917` | Text/icons on `secondary` (warm dark).                     |
| `secondary-container`          | `#FEF3C7` | Soft amber backgrounds (badges, callouts).                 |
| `on-secondary-container`       | `#451A03` | Text/icons on `secondary-container`.                       |
| `tertiary`                     | `#0EA5E9` | Info-only accent. Links and informational badges.          |
| `on-tertiary`                  | `#FFFFFF` | Text/icons on `tertiary`.                                  |
| `tertiary-container`           | `#E0F2FE` | Soft sky backgrounds.                                      |
| `on-tertiary-container`        | `#082F49` | Text/icons on `tertiary-container`.                        |
| `background`                   | `#F8FAFC` | Page background.                                           |
| `surface`                      | `#FFFFFF` | Default card / sheet surface.                              |
| `surface-container`            | `#F1F5F9` | Subtle grouped surface (form sections, sidebars).          |
| `surface-container-high`       | `#E2E8F0` | Stronger grouped surface (popovers, hover states).         |
| `surface-container-highest`    | `#CBD5E1` | Strongest grouped surface (selected pill background).      |
| `on-background`                | `#0F172A` | Body text on `background`.                                 |
| `on-surface`                   | `#0F172A` | Body text on `surface`.                                    |
| `on-surface-variant`           | `#475569` | Secondary / hint text. **Use this, never raw greys.**      |
| `outline`                      | `#94A3B8` | Default border, divider, focus ring.                       |
| `outline-variant`              | `#CBD5E1` | Subtle divider (table rows, subtle borders).               |
| `success`                      | `#10B981` | Positive cash flow, success states.                        |
| `on-success`                   | `#FFFFFF` | Text/icons on `success`.                                   |
| `success-container`            | `#D1FAE5` | Soft success backgrounds (badges, banners).                |
| `on-success-container`         | `#022C22` | Text/icons on `success-container`.                         |
| `warning`                      | `#F59E0B` | Cautions, stale data, soft warnings.                       |
| `on-warning`                   | `#1C1917` | Text/icons on `warning`.                                   |
| `warning-container`            | `#FEF3C7` | Soft warning backgrounds.                                  |
| `on-warning-container`         | `#451A03` | Text/icons on `warning-container`.                         |
| `error`                        | `#EF4444` | Destructive actions, validation errors, negative CF.       |
| `on-error`                     | `#FFFFFF` | Text/icons on `error`.                                     |
| `error-container`              | `#FEE2E2` | Soft error backgrounds.                                    |
| `on-error-container`           | `#7F1D1D` | Text/icons on `error-container`.                           |
| `info`                         | `#0EA5E9` | Informational alerts (alias of `tertiary`).                |
| `on-info`                      | `#FFFFFF` | Text/icons on `info`.                                      |

### 3.2 Dark theme

| Token                          | Hex       |
| ------------------------------ | --------- |
| `primary`                      | `#34D399` |
| `on-primary`                   | `#022C22` |
| `primary-container`            | `#065F46` |
| `on-primary-container`         | `#A7F3D0` |
| `secondary`                    | `#FBBF24` |
| `on-secondary`                 | `#1C1917` |
| `secondary-container`          | `#78350F` |
| `on-secondary-container`       | `#FEF3C7` |
| `tertiary`                     | `#7DD3FC` |
| `on-tertiary`                  | `#082F49` |
| `tertiary-container`           | `#075985` |
| `on-tertiary-container`        | `#E0F2FE` |
| `background`                   | `#0B1410` |
| `surface`                      | `#0F1B16` |
| `surface-container`            | `#13241D` |
| `surface-container-high`       | `#1B3328` |
| `surface-container-highest`    | `#244335` |
| `on-background`                | `#E2E8F0` |
| `on-surface`                   | `#E2E8F0` |
| `on-surface-variant`           | `#94A3B8` |
| `outline`                      | `#64748B` |
| `outline-variant`              | `#334155` |
| `success`                      | `#34D399` |
| `on-success`                   | `#022C22` |
| `success-container`            | `#065F46` |
| `on-success-container`         | `#D1FAE5` |
| `warning`                      | `#FBBF24` |
| `on-warning`                   | `#1C1917` |
| `warning-container`            | `#78350F` |
| `on-warning-container`         | `#FEF3C7` |
| `error`                        | `#F87171` |
| `on-error`                     | `#7F1D1D` |
| `error-container`              | `#7F1D1D` |
| `on-error-container`           | `#FEE2E2` |
| `info`                         | `#7DD3FC` |
| `on-info`                      | `#082F49` |

### 3.3 Do / Don't

- **Do** use `on-surface-variant` for secondary/hint text. **Don't** reach for
  `gray-500` or any raw Tailwind grey — they aren't theme-aware.
- **Do** use `success` / `error` for cash-flow polarity in charts and KPIs.
  **Don't** invent new greens or reds in component CSS.
- **Do** restrict `secondary` (sunlight) to **one accent per screen** — a KPI,
  a marker, or a CTA. **Don't** use it as a generic background.
- **Do** layer surfaces using the container scale (`surface` →
  `surface-container` → `surface-container-high`). **Don't** stack identical
  surfaces with shadows alone.

### 3.4 Legacy tokens (deprecated — do not use in new code)

The Tailwind config retains the older Material 3 token names
(`surface-tint`, `primary-fixed`, `tertiary-fixed`, `inverse-surface`,
`surface-container-lowest`, `surface-container-low`, etc.) as aliases mapped
onto the Solar Field palette so existing components continue to compile.
**New code must use the canonical tokens above.** The legacy aliases will be
removed in a future cleanup PR.

---

## 4. Typography

Inter, loaded via Google Fonts in `index.html` with weights 400/500/600/700.
The `tabular-nums` and `cv11` (single-storey `a`) features are enabled
globally via `font-feature-settings`.

### 4.1 Type scale (canonical)

| Name       | Size / line-height | Weight | Tracking | Use                                     | Tailwind class |
| ---------- | ------------------ | ------ | -------- | --------------------------------------- | -------------- |
| `display`  | 36 / 44            | 700    | -0.02em  | Page hero (Results KPI hero, splash)    | `text-display` |
| `headline` | 28 / 36            | 600    | -0.01em  | Route / section headers                 | `text-headline`|
| `title`    | 20 / 28            | 600    | -0.005em | Card titles, dialog titles, tab labels  | `text-title`   |
| `body`     | 16 / 24            | 400    | 0        | Default running text, form labels       | `text-body`    |
| `label`    | 12 / 16            | 500    | 0.04em   | Uppercase eyebrows, table headers, tags | `text-label`   |
| `data`     | 24 / 32            | 600    | -0.01em  | **Numeric readouts** (KPIs, totals)     | `text-data`    |

Use the matching `font-{name}` class to pin Inter explicitly when a parent
might inject another family.

### 4.2 Responsive rule

Below `md` (768px) the `display` scale shrinks to `headline` size to keep
mobile pages from going edge-to-edge with oversized text:

```html
<h1 class="text-headline md:text-display">Project Results</h1>
```

### 4.3 Numbers — mandatory

Any element rendering a number (currency, percent, year, MWh, tonnes) must use
either the `text-data` class or the `tabular` utility:

```html
<span class="font-data text-data tabular">₹ 12.4 Cr</span>
<span class="text-body tabular">12.4%</span>
```

`tabular` applies `font-variant-numeric: tabular-nums` so columns of figures
align vertically — non-negotiable for tables and KPI strips.

### 4.4 Legacy aliases

The older names are kept as aliases for migration:

| New name   | Legacy alias   |
| ---------- | -------------- |
| `display`  | `headline-xl`  |
| `headline` | `headline-lg`  |
| `title`    | `body-lg` (closest match — prefer `title` in new code) |
| `body`     | `body-md`      |
| `label`    | `label-sm`     |
| `data`     | `data-display` |

---

## 5. Spacing, layout, breakpoints

### 5.1 Spacing scale (compact 4px-derived)

The scale uses a standard `xs / sm / md / base / lg / xl / 2xl` sequence mapped
in [`tailwind.config.ts`](../tailwind.config.ts). Values are **intentionally
compact** (roughly half of the legacy 8px-derived scale) so data-heavy screens
stay dense; interactive controls still honour **`touch-target` (48px)** minimum
height/width where applied.

| Token  | Pixels | Use                                                |
| ------ | ------ | -------------------------------------------------- |
| `xs`   | 2      | Inline icon nudge, tight chip padding              |
| `sm`   | 4      | Default gap inside small components, icon gap      |
| `md`   | 6      | Section sub-padding, vertical stack between fields |
| `base` | 8      | Page gutter on mobile, default padding             |
| `lg`   | 12     | Card padding, section vertical rhythm              |
| `xl`   | 20     | Large section gaps, sidebar padding                |
| `2xl`  | 32     | Hero/landing vertical rhythm                       |

Plus two named tokens that are not on the scale:

- `touch-target` (48px) — minimum tap-target height/width
- `container-max` (1280px) — main content max-width

Tailwind’s **default numeric** utilities (`gap-4`, `p-3`, etc.) use the
framework’s rem-based scale; prefer **named tokens** above for layout so global
density stays consistent. Where numeric utilities remain, they were stepped down
in line with the same ~50% intent.

### 5.2 Breakpoints

Tailwind defaults are kept verbatim:

| Token | Min width | Primary intent                |
| ----- | --------- | ----------------------------- |
| `sm`  | 640       | Large phone / small tablet    |
| `md`  | 768       | Tablet → desktop nav switches |
| `lg`  | 1024      | Desktop sidebar layouts       |
| `xl`  | 1280      | Wide desktop, max content     |

### 5.3 Layout primitives

- Page shell: `<AppShell>` provides top/bottom nav and a centred main column
  capped at `max-w-container-max` with **`px-lg py-lg`** on `<main>` (horizontal
  and vertical padding). Offsets **`pt-16` / `pb-24 md:pb-8`** on the outer
  wrapper clear the fixed top bar (`h-16`) and mobile bottom nav — do not reduce
  these when tuning density. **Never apply page-level horizontal padding inside a
  route.**
- Default vertical rhythm between sections: `space-y-lg` on mobile,
  `space-y-xl` at `md+`.
- Two-column "main + sidebar" layout: `grid-cols-1 lg:grid-cols-[1fr_320px] gap-lg`.

---

## 6. Radius & elevation

### 6.1 Radius

| Token  | Pixels | Use                                |
| ------ | ------ | ---------------------------------- |
| `sm`   | 6      | Small chips, inline tags           |
| `md`   | 10     | Buttons, inputs, segmented tabs    |
| `lg`   | 14     | Cards, KPI tiles, panels           |
| `xl`   | 20     | Modals, bottom sheets, hero cards  |
| `full` | 9999   | Pills, avatars, FABs               |

### 6.2 Shadows

Five named elevations, each pre-paired with the surface token it expects to
sit on. Never compose shadows manually.

| Token           | Visual          | Use                                          | Sits on                     |
| --------------- | --------------- | -------------------------------------------- | --------------------------- |
| `shadow-sm`     | 1px hairline    | Subtle separation, sticky table headers      | Any surface                 |
| `shadow-card`   | Soft 4px lift   | Default card resting state                   | `surface`                   |
| `shadow-card-lg`| 8px lift        | Card hover, raised KPI                       | `surface`                   |
| `shadow-elevated`| 16px lift      | Modals, popovers, dropdowns                  | `surface-container-high`    |
| `shadow-top-nav`| Bottom-edge soft| Top app bar                                  | `surface`                   |
| `shadow-bottom-nav`| Top-edge soft| Bottom mobile nav                            | `surface`                   |

> Note: `shadow-card-xl` (legacy) is removed. `shadow-top-nav` and
> `shadow-bottom-nav` are kept as separate tokens because they cast in
> opposite directions.

---

## 7. Iconography

- **Library**: [Material Symbols Outlined](https://fonts.google.com/icons),
  loaded via Google Fonts with a variable axis (FILL 0..1, weight 100..700).
- **Component**: always render via `<Icon name="bolt" />` from
  [`src/components/ui/Icon.tsx`](../src/components/ui/Icon.tsx). Never use
  inline `<span class="material-symbols-outlined">…</span>` markup in routes.
- **Sizes**: `20px` (inline with body text), `24px` (default UI), `32px`
  (KPI cards, empty states). Anything larger should be a vector illustration,
  not an icon.
- **States**: outlined for default; add `.filled` (FILL=1) only when the icon
  represents an **active selected nav tab** or an **on toggle**.
- **Forbidden**: emojis in product UI; icons from any other library
  (Lucide, Phosphor, FontAwesome, custom SVGs) without prior approval.

---

## 8. Motion

Subtle by default. Motion is a hint of state change, not a feature.

### 8.1 Tokens

| Token            | Value                                | Use                              |
| ---------------- | ------------------------------------ | -------------------------------- |
| `duration-fast`  | `120ms`                              | Hover, press, micro-feedback     |
| `duration-base`  | `200ms`                              | Enter / exit, panel toggles      |
| `duration-slow`  | `320ms`                              | Modals, sheets, route transitions|
| `ease-standard`  | `cubic-bezier(0.2, 0, 0, 1)`         | Default for all interactions     |
| `ease-emphasised`| `cubic-bezier(0.3, 0, 0, 1)`         | Modals, sheets, hero transitions |

### 8.2 Standard interactions

- **Hover**: 120ms, opacity / background only (no transform).
- **Press**: 120ms, `scale(0.98)`. Built into the `Button` primitive.
- **Enter / exit**: 200ms `ease-standard`, fade + 4px translate.
- **Modal / sheet**: 320ms `ease-emphasised`, fade + 16px translate.

### 8.3 Reduced motion (mandatory)

`src/index.css` ships a base rule:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0ms !important;
    transition-duration: 0ms !important;
    scroll-behavior: auto !important;
  }
}
```

Components must therefore **never** rely on transform-based animation to
convey information; opacity-only fades are acceptable replacements.

---

## 9. Data visualisation system

This is a chart-heavy app. These rules apply to every Recharts component under
[`src/components/charts/`](../src/components/charts/) and any future chart.

### 9.1 Categorical palette (multi-series)

Six colours, ordered by use. Series 1 always uses `primary`. The palette is
checked for deuteranopia and tritanopia separation.

| # | Name        | Light hex | Dark hex  | Recharts intent                     |
| - | ----------- | --------- | --------- | ----------------------------------- |
| 1 | Emerald     | `#047857` | `#34D399` | Series 1 (primary scenario, baseline) |
| 2 | Amber       | `#F59E0B` | `#FBBF24` | Series 2 (alternate scenario, marker) |
| 3 | Sky         | `#0EA5E9` | `#7DD3FC` | Series 3                            |
| 4 | Violet      | `#8B5CF6` | `#A78BFA` | Series 4                            |
| 5 | Rose        | `#F43F5E` | `#FB7185` | Series 5                            |
| 6 | Teal        | `#14B8A6` | `#5EEAD4` | Series 6                            |

**Rule: never rely on colour alone.** When ≥ 3 series are shown, also vary
stroke style (`solid → dashed → dotted`) or marker shape so the chart is
parseable in monochrome and for colour-blind users.

### 9.2 Sequential ramp (single-variable intensity)

7-stop emerald ramp for values that go from "low" to "high" — irradiance maps,
heat tables, intensity bars.

`#ECFDF5 → #A7F3D0 → #6EE7B7 → #34D399 → #10B981 → #059669 → #047857`

Use the lightest stop on light surfaces, the darkest on dark surfaces.

### 9.3 Diverging ramp (variance vs baseline)

7 stops, rose ↔ neutral ↔ emerald, for values that have a natural midpoint
(e.g. variance from break-even, % change vs forecast).

`#BE123C → #FB7185 → #FECDD3 → #E2E8F0 → #A7F3D0 → #34D399 → #047857`

### 9.4 Semantic chart colours

| Concept                 | Token        | Notes                                            |
| ----------------------- | ------------ | ------------------------------------------------ |
| Positive cash flow      | `success`    | Bars and area fills                              |
| Negative cash flow      | `error`      | Use 0.85 opacity to soften                        |
| Break-even / payback marker | `secondary` | Vertical reference line, dashed                  |
| Reference / baseline line   | `outline`    | Dashed `4 4`                                     |
| Selected / hovered series   | series colour at full opacity; others drop to `0.4` |

### 9.5 Axis, grid, tooltip styling (Recharts)

These are the defaults for every chart unless overridden with reason:

```
<CartesianGrid stroke="rgb(var(--outline-variant))" strokeDasharray="4 4" vertical={false} />
<XAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--on-surface-variant)', fontSize: 12 }} />
<YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--on-surface-variant)', fontSize: 12 }} />
<Tooltip
  contentStyle={{
    background: 'var(--surface-container-high)',
    border: '1px solid var(--outline)',
    borderRadius: 14,
    boxShadow: 'var(--shadow-card-lg)',
    padding: 12,
    fontSize: 14,
  }}
  labelStyle={{ color: 'var(--on-surface-variant)', fontSize: 12, marginBottom: 4 }}
  itemStyle={{ color: 'var(--on-surface)', fontSize: 16, fontVariantNumeric: 'tabular-nums' }}
/>
```

(Or the equivalent React-style props using the shared `chartTheme` helper to
be added under `src/lib/charts/`.)

### 9.6 Chart-type guidance — when to use what

| Chart type      | Use for                                              | Don't use for                              |
| --------------- | ---------------------------------------------------- | ------------------------------------------ |
| **Line**        | Time-series, multi-scenario compare (cumulative CF)  | Categorical comparison                     |
| **Bar (vert.)** | Discrete year buckets (yearly net CF)                | Long category lists (use horizontal bar)   |
| **Bar (horiz.)**| > 6 categories, long labels                          | Time-series                                |
| **Area**        | Stacked composition over time when totals matter     | Multi-scenario lines (use line chart)      |
| **Donut**       | Composition of a single total, **≤ 6 slices**        | > 6 slices (switch to horizontal bar)      |

**Forbidden**: 3D charts, true pie charts (always use donut), dual-axis line
charts, bubble charts, radial bar charts.

---

## 10. Component reference

A short pattern catalogue for the primitives in
[`src/components/ui/`](../src/components/ui/) and the layout wrappers in
[`src/components/layout/`](../src/components/layout/). Each entry lists
variants, sizes, intent, and key tokens. Consult the source for exact prop
shapes.

### 10.1 Button — [`Button.tsx`](../src/components/ui/Button.tsx)

| Variant     | Tokens                                              | Use                                |
| ----------- | --------------------------------------------------- | ---------------------------------- |
| `primary`   | `bg-primary text-on-primary`, hover → `primary-container` | Main CTA per screen (one max)      |
| `secondary` | `bg-secondary text-on-secondary` — sunlight        | Optional secondary action          |
| `outline`   | `border-outline text-primary bg-transparent`       | Tertiary action, cancel            |
| `ghost`     | `text-primary hover:bg-surface-container`          | Inline action, list-row trigger    |
| `danger`    | `bg-error text-on-error`                           | Destructive (delete scenario)      |

Sizes: `md` (`h-touch-target`, default) and `lg` (`h-touch-target px-2xl`,
heavy CTA). Loading state replaces children with a centred spinner; disabled
state drops opacity to 50% with `cursor-not-allowed`. Press animation: 120ms
`scale(0.98)`.

### 10.2 Field / input

Standard pattern (no dedicated component yet — extract one when added):

```html
<label class="block">
  <span class="text-label uppercase text-on-surface-variant">Plant size (MW)</span>
  <input
    type="number"
    inputmode="decimal"
    class="mt-xs h-touch-target w-full rounded-md border border-outline-variant
           bg-surface px-md text-body tabular focus:border-primary focus:ring-2
           focus:ring-primary/20"
  />
  <span class="mt-xs block text-label text-on-surface-variant">0.25 – 5 MW</span>
</label>
```

Mobile rules:

- Currency / percent → `inputmode="decimal"`
- Years → `inputmode="numeric"`
- Error state: swap border to `error`, helper text colour to `error`,
  prepend an `error_outline` icon. Never rely on red border alone.

### 10.3 Card / KpiCard — [`KpiCard.tsx`](../src/components/ui/KpiCard.tsx)

- Surface: `bg-surface` (or `bg-surface-container-lowest` on `surface-container`
  parents), `rounded-lg`, `shadow-card`, `p-lg`.
- Optional left-border accent (`border-l-4`) using `primary` /
  `secondary` / `tertiary` to group KPIs by category.
- Title in `text-label` uppercase; value in `text-data tabular`; optional
  hint in `text-label text-on-surface-variant`.

### 10.4 Table

- Header: `text-label uppercase text-on-surface-variant`, sticky on scroll
  with `shadow-sm` underline.
- Row dividers: `border-b border-outline-variant`. **No zebra striping.**
- Numeric columns: `text-right tabular`.
- Mobile: wrap in `overflow-x-auto`, sticky first column via
  `sticky left-0 bg-surface`. The P&L pattern in
  [`PnLTable.tsx`](../src/routes/Results/PnLTable.tsx) is the reference
  implementation.

### 10.5 Tag / Badge — [`Tag.tsx`](../src/components/ui/Tag.tsx)

- Two visual variants: `solid` (`bg-{semantic} text-on-{semantic}`) and
  `soft` (`bg-{semantic}-container text-on-{semantic}-container`).
- Semantic mapping: `success | warning | error | info | neutral` — neutral
  uses `surface-container-high` + `on-surface-variant`.
- Always `rounded-full`, `text-label`, `px-md py-xs`, no shadow.

### 10.6 Tooltip — [`Tooltip.tsx`](../src/components/ui/Tooltip.tsx)

- Container: `bg-surface-container-high`, `text-on-surface`, `rounded-md`,
  `shadow-card-lg`, `p-md`, `max-w-[280px]`.
- Text: `text-body`.
- **Mobile**: tap to open, tap outside to dismiss. **Desktop**: hover with
  150ms delay. Both behaviours are built into the primitive — don't reinvent.

### 10.7 Modal / sheet

- **Mobile (< md)**: bottom sheet sliding up, `rounded-t-xl`, `shadow-elevated`,
  drag-handle at top, scrim `bg-on-background/40`. 320ms `ease-emphasised`.
- **Desktop (md+)**: centred modal, `rounded-xl`, `shadow-elevated`,
  `max-w-[480px]` for confirms / `max-w-[640px]` for forms.
- Close affordances: explicit close button (top-right) **and** scrim click
  for non-destructive modals; destructive modals require explicit choice.

### 10.8 Navigation

- **Top nav** (`md+`) — [`TopBar.tsx`](../src/components/layout/TopBar.tsx):
  `bg-surface`, `shadow-top-nav`, `h-16`, sticky. Active route uses
  `text-primary` + filled icon variant.
- **Bottom nav** (`< md`) — [`BottomNav.tsx`](../src/components/layout/BottomNav.tsx):
  `bg-surface`, `shadow-bottom-nav`, `h-touch-target` items + label.
  Active route same treatment.
- Same routes, same data — never branch behaviour by surface.

### 10.9 Banner / alert

Inline banner pattern (no dedicated component yet):

- Container: `bg-{semantic}-container text-on-{semantic}-container`,
  `rounded-lg`, `p-md`, `flex gap-md items-start`.
- Leading icon (`info | warning | error | check_circle`).
- Optional trailing action button in `ghost` variant.
- **Max one visible at a time** per route. Stacked banners create noise.

### 10.10 Pill tabs — [`PillTab.tsx`](../src/components/ui/PillTab.tsx)

`rounded-full` segmented control. Active pill: `bg-primary text-on-primary`;
inactive: `text-on-surface-variant hover:bg-surface-container`. Always
`h-touch-target`, `px-base`.

### 10.11 Slider & Switch — [`Slider.tsx`](../src/components/ui/Slider.tsx), [`Switch.tsx`](../src/components/ui/Switch.tsx)

- Slider thumb: 20×20, `bg-primary`, 2px white border, `shadow-sm`.
  Track: 4px, `bg-surface-container-high`. Filled portion: `bg-primary`.
- Switch: 32×52 track, 24×24 thumb, `bg-primary` when on,
  `bg-surface-container-high` when off. Always paired with a `text-body`
  label on the left.

---

## 11. Accessibility — quick rules

1. **Contrast**: text ≥ 4.5:1, UI/borders ≥ 3:1. Verified for both themes.
2. **Focus**: visible 2px `outline` ring with 2px offset. **Never** remove
   focus rings — override with the token if the default conflicts.
3. **Touch**: minimum 48×48 hit area, even when the visual is smaller.
4. **Motion**: respect `prefers-reduced-motion: reduce` (handled globally,
   don't override per-component).
5. **Colour is never the only signal** — pair with shape, label, or icon.
   Most critical in charts (use stroke style + colour).
6. **All inputs have visible labels** (no placeholder-only labels).
7. **Numeric inputs** use the right `inputmode` for mobile keyboards.
8. **Tooltips** are not the sole carrier of critical information — they are
   supplementary explanation.

---

## 12. Mobile vs desktop behaviour

| Aspect       | < md                                    | md+                                     |
| ------------ | --------------------------------------- | --------------------------------------- |
| Layout       | Single column, full bleed within gutter | Two-column "main + sticky sidebar" at lg+ |
| Navigation   | Bottom tab bar                          | Top app bar                             |
| Tables       | `overflow-x-auto` + sticky first col    | Full table                              |
| Modals       | Bottom sheet                            | Centred modal                           |
| Tooltips     | Tap to open                             | Hover with 150ms delay                  |
| Type display | Display shrinks to headline             | Full display scale                      |
| Page gutter  | `px-base` (16px)                        | `md:px-lg` (24px)                       |

Same routes, same data, same store on both. **Never hide functionality on
mobile.** If a control doesn't fit, redesign it (use a sheet, an expandable
section, or a separate route) — don't gate it behind `hidden md:block`.

---

## 13. How to extend

Three rules for adding new things:

1. **Reuse a token, or add one with justification.** If your component needs
   a colour / spacing / radius / shadow value that isn't here, add it to
   `[tailwind.config.ts](../tailwind.config.ts)` with a one-line comment
   explaining the use case. Never hard-code a hex, px, ms, or shadow string
   inside a `.tsx` file.
2. **Place primitives in `src/components/ui/`, feature pieces in
   `src/components/<feature>/`, and routes in `src/routes/<Route>/`.**
   A primitive is anything generic enough to be reused across two or more
   features. Charts always live in `src/components/charts/`.
3. **Update this doc when you add a new pattern.** If you introduce a new
   primitive (e.g. a Stepper or DatePicker), add a short subsection under
   §10. The doc is the contract — code without an entry here is technical
   debt.

---

## Appendix — file map

- Tokens & theme: [`tailwind.config.ts`](../tailwind.config.ts), [`src/index.css`](../src/index.css)
- Document head (theme-color, fonts): [`index.html`](../index.html)
- UI primitives: [`src/components/ui/`](../src/components/ui/)
- Layout: [`src/components/layout/`](../src/components/layout/)
- Charts: [`src/components/charts/`](../src/components/charts/)
- Mocks (legacy): [`docs/design/`](./design/)
- Product spec: [`docs/prd.md`](./prd.md)
- Architecture: [`docs/architecture.md`](./architecture.md)
