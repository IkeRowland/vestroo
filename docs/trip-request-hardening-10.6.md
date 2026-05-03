# Trip-request funnel hardening (Story 10.6)

> **Update (Epic 19 / Story 19.14):** The live funnel is **`TripRequestBookingShell`** with **four slides** (trip → vehicle → passenger → confirmation) on **one URL** — not two steps. The keyboard path below reflects the **shipped** shell.

This document satisfies **NFR.1.1** (performance baseline / budget), **NFR.3.1** (HTTPS assumptions for tests), and **NFR.3.2** (SEO / routing unchanged) for the public trip-request path (`/book/trip-request` and embedded shell from `/book/search` / marketing).

## Accessibility verification (AC7)

**Primary method:** `eslint-plugin-jsx-a11y` is enabled via `eslint.config.mjs` (Next.js core-web-vitals config). Run `npm run lint` before merge; fix or justify any new violations in funnel files.

**Optional:** A short manual PR checklist is acceptable for regressions not caught by lint (e.g. focus order on a new control).

**Not added in 10.6:** `@axe-core/playwright` — optional; would need explicit dependency + CI time justification.

## Keyboard-only path (AC8)

Environment: `/book/trip-request` with valid session prefill (e.g. dev fixture `/book/search?e2e_fixture=trip_request`) or embedded flow after **Request a trip** from the booking form.

The shell uses **`TripRequestBookingShell`**: **`funnelStep`** **0 \| 1 \| 2** for data slides, then **`submitState === 'success'`** for confirmation (**slide 4** UX). **No** `STEP_COUNT = 2` — that draft referred to an obsolete two-step model.

1. **Land on funnel:** Focus moves to the slide heading (`h2`, **`#trip-request-slide-heading`**) on step / success transitions (**FE.19.1** / **FE.19.12**).
2. **Slide 1 — Trip details:** `Tab` through pickup/drop-off autocomplete, schedule, passengers; activate **Next** (`data-testid="trip-request-next"`).
3. **Slide 2 — Vehicle:** `Tab` through vehicle options; select one (**required** — **FE.19.6**); **Next** to slide 3.
4. **Slide 3 — Passenger:** `Tab` through first name, last name, email, **Country / region** (opens list), national phone; optional PO when shown.
5. **Submit:** `Tab` to **Submit trip request** (`data-testid="trip-request-submit"`); `Enter` submits when enabled.
6. **Success:** **Request received** heading focused; success panel **`role="status"`**, **`aria-live="polite"`** (**FE.19.12**).

**Back:** **Back** returns to the previous **data** slide without losing valid session state.

## Performance baseline / budget (AC9)

| Item | Value | Notes |
|------|--------|--------|
| Route under test | `/book/trip-request` | App Router, `force-dynamic` not required for this page metadata |
| Environment | Local production build recommended: `npm run build && npm start` | Preview URL on Vercel is equivalent for Lighthouse |
| Date captured | 2026-04-18 | Update when re-baselining |
| Tool | Lighthouse (Chrome DevTools) or Vercel Analytics Web Vitals | Reasonable effort per story |

**Suggested budgets (manual / non-blocking):**

- **LCP:** &lt; 2.5 s on a cold load over HTTPS on a mid-tier desktop profile.
- **CLS:** &lt; 0.1 on this route after first paint (slide transitions should not shift layout aggressively).
- **Blocking scripts:** Maps Places loads only where `AddressAutocomplete` is mounted; trip-request page itself does not mount address autocomplete — avoid adding large synchronous scripts to this route without recording trade-offs.

CI does **not** gate merges on Lighthouse scores unless the team adds that pipeline later.

## E2E bootstrap

Playwright uses the localhost-only query **`/book/search?e2e_fixture=trip_request`** (see `E2eBookingFixtureLoader`). Full submit requires a working Supabase client and `bookings` insert permissions (`.env.local`).

## HTTPS (NFR.3.1)

E2E `baseURL` is `http://localhost:3000` for local dev only. Production and preview URLs MUST use HTTPS; do not add mixed-content asset URLs in funnel code or tests.

## Optional documentation parity (AC11–AC12)

- **`docs/epic-1.md`:** Minimal pointer to Epic 10 added for public trip-request vs legacy quote-at-booking wording.
- **`docs/core-traveller-flow-parity.md`:** Not present in repo; no edit. Add when the doc exists.
