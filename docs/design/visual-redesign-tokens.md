# Visual redesign — design tokens (Epic 17 / 18 / 19)

This is the **single source of truth** for the design tokens introduced by [Epic 17](../epic-17.md) (`/ops/*` redesign), [Epic 18](../epic-18.md) (`/account/*` redesign), and consumed by [Epic 19](../epic-19.md) (booking funnel) for visual rhythm. It supplements (does **not** replace) [`ops-design-system-parity.md`](../ops-design-system-parity.md) and [`ui-ux-specification.md`](../ui-ux-specification.md), and respects the locked stack from [ADR 0001](../adr/0001-ops-field-ui-stack-tailwind-radix.md): **Tailwind + Radix, no Ant Design**.

All values are **HSL components** (no `hsl()` wrapper) so they slot into the existing shadcn-style globals.css convention. Tailwind utility names are registered in `tailwind.config.ts`. **Marketing/booking `:root` tokens stay untouched** — only ops, account, and chart token namespaces are introduced or extended.

---

## 1. Color system

### 1.1 Brand palette (preserved from `tailwind.config.ts`)

| Token | Hex | HSL | Use |
|---|---|---|---|
| `vest.rust` | `#C04C33` | `9 58% 48%` | **Primary CTA**, active sidebar item rail, sparkline accent. The single brand voice in chrome. |
| `vest.rust-dark` | `#a33f2a` | `12 59% 40%` | CTA hover, focus shadow tint. |
| `vest.charcoal` | `#222222` | `0 0% 13%` | Body text on light surfaces, navy alternate. |
| `vest.section` | `#F8F8F8` | `0 0% 97%` | Marketing-page section background — **do not** reuse for ops/account canvas (we have dedicated tokens below). |

**Wheelzie** references use a **brighter** primary red (e.g. ~`#E11D48` / ~`#FF3B30` on buttons and badges). Vestroo keeps **`vest.rust`** (`#C04C33`) for **brand-correct** CTAs and key accents. For **side-by-side QA** against `docs/design/wheelzie-reference`, expect the **hue** to differ slightly; **layout, spacing, card structure, and chart composition** are the required match — not a pixel-identical red.

### 1.1a Reference (Wheelzie) — surfaces and selection (Epic 17 parity)

Use these as **HSL targets** when tuning ops chrome to match the reference screens. They **supplement** §1.2; if a value conflicts with an existing `--ops-*` in `globals.css`, treat the table below as the **intended** reference look and reconcile in a **visual parity** pass (see [`epic-17.md`](../epic-17.md) — visual parity).

| Visual element | Approx. hex (ref) | HSL components (no wrapper) | Token / note |
|----------------|------------------|----------------------------|----------------|
| Page canvas | `#F8F9FB` | `210 20% 98%` | Should match **`--ops-canvas`** feel (off-white, cool) |
| Card / sidebar surface | `#FFFFFF` | `0 0% 100%` | **`--ops-surface`** |
| **Active nav item background** (pill) | light sky | `211 100% 96%` or `214 60% 95%` | **Not** green. Wheelzie uses **soft blue** behind the active row; epic calls this out as **`--ops-nav-active`** (or reuse **`--ops-info` at ~8–12% opacity** for background + **`text-ops-accent` for icon**). **Avoid** reusing success/green (`hue ~142`) for nav selection — that reads as the **pre-redesign** mint shell, not the reference. |
| Primary button | reference reds | — | Map to **`--ops-accent`** (rust); optional **hover** via `vest.rust-dark` |
| “Navy” text + chart series | dark slate | `222.2 47% 11%` | Chart **`--ops-chart-2`**, body **`--ops-foreground`** |
| Table header band (optional) | very light blue | `214 50% 96%` | Optional **striped** header per Wheelzie **Clients**; use tokenized bg, not one-off hex |
| Status “Available” / deep blue pill | ~navy | use **`--ops-info`** or chart navy for **filled** dark pills on fleet cards |

**Typography (reference):** Inter-like **sans**; Vestroo keeps **Montserrat + Poppins** per §2.1 — acceptable variance if weight and scale match [`§2.2`](#22-type-scale-extending-the-existing-ops--font-sizes).

### 1.2 Semantic chrome — `data-ops-theme="light"` extension

Add these to `[data-ops-theme="light"]` in `globals.css`. The existing canvas/surface/border/foreground/muted/topbar tokens stay (the values below are **additions** for FE.17.1).

| Token | HSL | Notes |
|---|---|---|
| `--ops-accent` | `9 58% 48%` | = `vest.rust`. Primary CTA, active rail accent. |
| `--ops-accent-foreground` | `0 0% 100%` | Text/icon on `--ops-accent` background. |
| `--ops-accent-soft` | `9 58% 48% / 0.08` | Table row / card hover tint; **not** the primary **sidebar active** fill. |
| `--ops-nav-active` | `211 100% 96%` *(suggested; tune in browser)* | **Sidebar** active item background (Wheelzie **sky pill**). Register in Tailwind as e.g. `bg-ops-nav-active`. **Do not** reuse `hue ~142` green for this. |
| `--ops-success` | `142 71% 35%` | = existing `--primary` green. Status pill: completed, paid. |
| `--ops-success-foreground` | `0 0% 100%` |  |
| `--ops-warning` | `38 92% 50%` | Amber. Status pill: pending, awaiting payment. |
| `--ops-warning-foreground` | `0 0% 100%` |  |
| `--ops-danger` | `0 84.2% 60.2%` | = existing `--destructive`. Status pill: cancelled, overdue. |
| `--ops-danger-foreground` | `0 0% 100%` |  |
| `--ops-info` | `217 91% 60%` | Blue. Status pill: on duty, scheduled, on trip. |
| `--ops-info-foreground` | `0 0% 100%` |  |
| `--ops-elevation-1` | `0 0% 10% / 0.04` | Subtle card shadow — `box-shadow: 0 1px 2px hsl(var(--ops-elevation-1))`. |
| `--ops-elevation-2` | `0 0% 10% / 0.06` | Hover/pressed card shadow — `box-shadow: 0 4px 12px hsl(var(--ops-elevation-2))`. |
| `--ops-radius-card` | `0.75rem` (12px) | Card corners on KPI cards, detail rail, calendar events. |
| `--ops-radius-pill` | `9999px` | Status pills, count badges. |

### 1.3 Dark theme — `data-ops-theme="dark"`

The dark theme reuses semantic tones with brightness shifts so contrast stays AA+ on dense surfaces:

| Token | HSL |
|---|---|
| `--ops-accent` | `12 70% 60%` (brighter rust) |
| `--ops-accent-foreground` | `0 0% 100%` |
| `--ops-accent-soft` | `12 70% 60% / 0.12` |
| `--ops-success` | `142 60% 55%` |
| `--ops-warning` | `38 95% 60%` |
| `--ops-danger` | `0 90% 65%` |
| `--ops-info` | `217 95% 70%` |
| `--ops-elevation-1` | `0 0% 0% / 0.30` |
| `--ops-elevation-2` | `0 0% 0% / 0.45` |

### 1.4 Account theme — `data-account-theme="light"`

Per FE.18.1: a **parallel namespace** so account chrome can be tuned independently while sharing the brand palette. The defaults below mirror ops light theme but with slightly more whitespace-friendly values.

| Token | HSL | Notes |
|---|---|---|
| `--account-canvas` | `0 0% 99%` | Page background — slightly warmer than `--ops-canvas`. |
| `--account-surface` | `0 0% 100%` | Cards, panels. |
| `--account-surface-hover` | `210 40% 97%` | Hover row / hover card. |
| `--account-border` | `214.3 31.8% 91.4%` | Same as `--border`. |
| `--account-foreground` | `222.2 84% 4.9%` | Body text. |
| `--account-muted` | `215.4 16.3% 46.9%` | Secondary text. |
| `--account-topbar` | `0 0% 100%` | Top bar surface. |
| `--account-sidebar-width` | `14rem` |  |
| `--account-sidebar-collapsed-width` | `4.5rem` |  |
| `--account-accent` | = `--ops-accent` | Brand parity. |
| `--account-success` / `-warning` / `-danger` / `-info` | = `--ops-*` equivalents | Status pills consistent across products. |

### 1.5 Chart palette

Six categorical chart colors derived from brand + system tokens. Use via `currentColor` or inline `style={{ color: 'hsl(var(--ops-chart-N))' }}` — never hard-code hex in chart components.

| Token | HSL | Suggested role |
|---|---|---|
| `--ops-chart-1` | `9 58% 48%` (rust) | Primary metric / featured series |
| `--ops-chart-2` | `222.2 47.4% 11.2%` (navy) | Comparison series |
| `--ops-chart-3` | `217 91% 60%` (blue) | Tertiary |
| `--ops-chart-4` | `215 16% 65%` (slate-500) | Neutral / "other" |
| `--ops-chart-5` | `142 71% 35%` (success green) | Positive bucket |
| `--ops-chart-6` | `38 92% 50%` (amber) | Warning bucket |

---

## 2. Typography

### 2.1 Font families (already in `tailwind.config.ts`)

* **Display:** `var(--font-montserrat)` — page titles, KPI values, dashboard headlines.
* **Body:** `var(--font-poppins)` — paragraphs, table cells, form labels, all other text.
* **Fallback:** `system-ui, sans-serif`.

Montserrat handles weight 600 well at small sizes (KPI delta) and 700 well at hero sizes (dashboard headlines). Poppins is the workhorse.

### 2.2 Type scale (extending the existing `ops-*` font sizes)

| Tailwind class | Size / line / weight | Use |
|---|---|---|
| `text-ops-page-title` (existing) | 1.5rem / 2rem / 600 | Page heading. |
| `text-ops-card-value` *(new)* | 1.875rem / 2.25rem / 600 | KPI card primary value. **Always** `tabular-nums`. |
| `text-ops-card-label` *(new)* | 0.875rem / 1.25rem / 500 | KPI card label, scorecard label. |
| `text-ops-table-header` (existing) | 0.75rem / 1rem / 600 | Table header row. |
| `text-ops-table-body` (existing) | 0.875rem / 1.25rem / 400 | Table cells. |
| `text-ops-pill` *(new)* | 0.6875rem (11px) / 1rem / 500 | Status pill body. |
| `text-ops-meta` *(new)* | 0.75rem / 1rem / 400 | Helper / muted captions. |
| `text-ops-section-eyebrow` *(new)* | 0.6875rem (11px) / 1rem / 600 / uppercase tracking-wide | Sidebar group labels, dashboard section eyebrows. |

Mirror these as `text-account-*` if account density differs (initially they match ops).

---

## 3. Spacing, radius, shadow

### 3.1 Card/panel rhythm

* **Card padding:** `p-4` (16px) for KPI cards, `p-5` (20px) for detail rail headers, `p-6` (24px) for hero/welcome strip.
* **Card gap (grid):** `gap-4` (16px) between KPI cards on `sm`, `gap-5` (20px) on `lg+`.
* **Section spacing:** `space-y-6` (24px) between major page sections, `space-y-8` (32px) on `/account` (lighter density).

### 3.2 Radius

* `rounded-md` (6px) — buttons, inputs, dropdowns. Matches existing shadcn `--radius - 2px`.
* `rounded-ops-card` (12px) — KPI cards, vehicle cards, calendar events.
* `rounded-ops-pill` (9999px) — status pills, avatar containers, count badges.

### 3.3 Shadow / elevation

* `shadow-ops-1` — `box-shadow: 0 1px 2px hsl(var(--ops-elevation-1))`. Resting state for KPI cards.
* `shadow-ops-2` — `box-shadow: 0 4px 12px hsl(var(--ops-elevation-2))`. Hover state for KPI cards. **Never use on tables** (causes flicker on row hover).

---

## 4. Motion

### 4.1 Durations

* **Fast:** 150ms — tooltip fade, popover open.
* **Default:** 200ms — card hover, sidebar collapse, detail rail slide.
* **Slow:** 300ms — modal/dialog enter, route transitions.

### 4.2 Easing

* **Standard:** `cubic-bezier(0.4, 0, 0.2, 1)` (Tailwind `ease-in-out` default).
* **Decelerate:** `cubic-bezier(0, 0, 0.2, 1)` (entering elements).
* **Accelerate:** `cubic-bezier(0.4, 0, 1, 1)` (exiting elements).

### 4.3 framer-motion patterns

`framer-motion` is **already a dependency** — no new import. Patterns to standardise:

* **Card mount reveal:** `initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}`. Apply to KPI cards on `/ops` dashboard load.
* **Detail rail slide-in (mobile):** `initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ duration: 0.2, ease: 'easeOut' }}`.
* **Status pill flash (state change):** brief scale `1 → 1.06 → 1` over 250ms when a row's status changes via realtime — only use sparingly.

Reduced-motion: respect `prefers-reduced-motion: reduce` — skip translate/scale, keep opacity-only fades.

---

## 5. Iconography

* **Library:** `lucide-react` (already a dep — version `^0.556.0` in `package.json`).
* **Stroke width:** 1.5 for header icons, 2 for inline body icons (default lucide).
* **Sizes:** `h-4 w-4` (16px) inline, `h-5 w-5` (20px) sidebar/topbar, `h-6 w-6` (24px) on KPI card headers.

---

## 6. Component composition recipes

### 6.1 KPI Card (`OpsKpiCard` / `AccountKpiCard`)

```tsx
<Link
  href={drillHref}
  className={cn(
    'group flex h-full flex-col rounded-ops-card border border-ops-border bg-ops-surface p-4 shadow-ops-1 transition',
    'hover:border-ops-accent/40 hover:shadow-ops-2',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
  )}
>
  <header className="flex items-start justify-between gap-2">
    <span className="flex items-center gap-2 text-ops-card-label text-ops-foreground">
      <Icon className="h-4 w-4 text-ops-muted" aria-hidden /> {label}
    </span>
    {/* optional dropdown menu */}
  </header>
  <div className="mt-3 flex items-baseline gap-2">
    <span className="text-ops-card-value tabular-nums text-ops-foreground">{value}</span>
    {unit ? <span className="text-ops-meta">{unit}</span> : null}
  </div>
  <div className="mt-2 flex items-center gap-1 text-ops-meta">
    <DeltaIcon /> <span className={deltaClass}>{deltaText}</span>
    <span className="text-ops-muted">from last week</span>
  </div>
  {sparkline ? <div className="mt-3 h-16">{sparkline}</div> : null}
</Link>
```

### 6.2 Status Pill (`OpsStatusPill`)

```tsx
<span
  className={cn(
    'inline-flex items-center gap-1.5 rounded-ops-pill px-2 py-0.5 text-ops-pill',
    toneClass[tone], // see ops-status-pill-tones.ts
  )}
>
  {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', dotClass[tone])} /> : null}
  {children}
</span>
```

Where `toneClass` provides soft-tinted bg + saturated text (e.g. `bg-ops-success/10 text-ops-success`).

### 6.3 Avatar Cell (`OpsAvatarCell`)

```tsx
<div className="flex items-center gap-3 min-w-0">
  <Avatar className="h-8 w-8 shrink-0">
    {src ? <Image src={src} alt="" fill /> : <Initials name={name} />}
  </Avatar>
  <div className="min-w-0">
    <div className="truncate text-ops-table-body font-semibold text-ops-foreground">{name}</div>
    {secondary ? <div className="truncate text-ops-meta text-ops-muted">{secondary}</div> : null}
  </div>
</div>
```

### 6.4 Split View (`OpsSplitView`)

```tsx
<div className="flex min-w-0 gap-4">
  <main className="min-w-0 flex-1">{list}</main>
  <aside className="hidden xl:block w-[400px] shrink-0">
    <OpsDetailRail>{detail}</OpsDetailRail>
  </aside>
  {/* mobile drawer mirrors the rail at < lg via Radix Dialog/Sheet */}
</div>
```

---

## 7. Tailwind config additions (cheat sheet)

Add under `theme.extend.colors`:

```ts
'ops-accent': 'hsl(var(--ops-accent) / <alpha-value>)',
'ops-accent-soft': 'hsl(var(--ops-accent-soft))',
'ops-nav-active': 'hsl(var(--ops-nav-active) / <alpha-value>)',
'ops-success': 'hsl(var(--ops-success) / <alpha-value>)',
'ops-warning': 'hsl(var(--ops-warning) / <alpha-value>)',
'ops-danger':  'hsl(var(--ops-danger)  / <alpha-value>)',
'ops-info':    'hsl(var(--ops-info)    / <alpha-value>)',
account: {
  canvas: 'hsl(var(--account-canvas) / <alpha-value>)',
  surface: 'hsl(var(--account-surface) / <alpha-value>)',
  border: 'hsl(var(--account-border) / <alpha-value>)',
  foreground: 'hsl(var(--account-foreground) / <alpha-value>)',
  muted: 'hsl(var(--account-muted) / <alpha-value>)',
  accent: 'hsl(var(--account-accent) / <alpha-value>)',
  // ...
},
```

Under `theme.extend.borderRadius`:

```ts
'ops-card': 'var(--ops-radius-card)',
'ops-pill': 'var(--ops-radius-pill)',
```

Under `theme.extend.boxShadow`:

```ts
'ops-1': '0 1px 2px hsl(var(--ops-elevation-1))',
'ops-2': '0 4px 12px hsl(var(--ops-elevation-2))',
```

Under `theme.extend.fontSize`:

```ts
'ops-card-value':     ['1.875rem', { lineHeight: '2.25rem', fontWeight: '600' }],
'ops-card-label':     ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
'ops-pill':           ['0.6875rem', { lineHeight: '1rem', fontWeight: '500' }],
'ops-meta':           ['0.75rem', { lineHeight: '1rem' }],
'ops-section-eyebrow':['0.6875rem', { lineHeight: '1rem', fontWeight: '600', letterSpacing: '0.05em' }],
```

Under `theme.extend.width`:

```ts
'account-sidebar': 'var(--account-sidebar-width)',
'account-sidebar-collapsed': 'var(--account-sidebar-collapsed-width)',
```

---

## 8. What this doc does **not** cover

* Specific page-by-page wireframes — see [`design/visual-redesign-references.md`](visual-redesign-references.md) for the Wheelzie image → Vestroo route mapping.
* Booking funnel field-by-field UX — see [`design/booking-flow-simplified.md`](booking-flow-simplified.md).
* Component a11y notes — those live in [`ops-design-system-parity.md`](../ops-design-system-parity.md) § 17 / § 18 (to be authored as story 17.20 / 18.13 deliverables).
* Story acceptance criteria — those live in each Epic's child stories.

---

## 9. Change log

| Date | Change | Author |
|---|---|---|
| 2026-04-28 | Initial token sheet for Epic 17 / 18 / 19 | PO |
| 2026-04-28 | §1.1a — Wheelzie reference surface/selection HSL targets; nav active = soft blue, not green | PO |
| 2026-04-28 | §1.2 — added `--ops-nav-active` row (sidebar selection); clarified `--ops-accent-soft` vs nav | PO |
