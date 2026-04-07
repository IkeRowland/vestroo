# Repository conventions

Where to put new code so the layout stays predictable. Naming for **domain language** (bookings, quotes, vehicles, etc.) should follow the shared vocabulary in [epic-4.md — Domain vocabulary (schema, UI, APIs)](epic-4.md#domain-vocabulary-schema-ui-and-apis).

## Server Actions

Place Next.js **Server Actions** (files with `"use server"` and mutations or server-only reads used from the App Router) under:

- **`src/actions/`**

Colocate **unit tests** next to the code in **`src/actions/__tests__/`** (for example, `calculateQuote.test.ts` alongside `calculateQuote.ts`).

## Feature modules

Group **feature-specific** UI, hooks, and small helpers by product area under:

- **`src/features/*`**

Example: booking flows live under `src/features/booking/` (components, hooks, etc.). Prefer importing shared primitives from `src/components/` rather than duplicating UI.

## Shared UI and layout

Reusable **React components** that are not owned by a single feature—layout chrome, generic UI, Shadcn-style primitives—belong under:

- **`src/components/`** (for example `src/components/ui/` for design-system pieces, `src/components/layout/` for header/footer)

## Libraries and shared logic

Shared **non-UI** utilities, pricing helpers, health checks, and similar code live under **`src/lib/`**. Tests for that code go in **`src/lib/__tests__/`**.

The repo includes **`src/services/`** for cross-cutting service-style modules (e.g. email helpers). Colocate Vitest specs under **`src/services/__tests__/`** the same way as `src/lib/` and `src/actions/`.

## Application routes

Next.js **App Router** routes, layouts, and route groups live under **`src/app/`** (for example `src/app/(app)/`, `src/app/(marketing)/`).

## Tests (summary)

| Kind | Typical location |
| ---- | ---------------- |
| Unit / integration (Vitest) | Colocated **`__tests__`** next to the module (e.g. `src/actions/__tests__/`, `src/lib/__tests__/`, `src/services/__tests__/`) |
| End-to-end (Playwright) | **`tests/e2e/`** |

Run **`npm test`** for Vitest and **`npm run test:e2e`** for Playwright (see [local-development.md](local-development.md)).

## Related docs

- [Project structure](project-structure.md) — broader repository map
- [Local development](local-development.md) — scripts, env, and CI
- [Operational guidelines](operational-guidelines.md) — standards and testing strategy
