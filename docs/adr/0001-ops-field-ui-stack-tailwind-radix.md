# ADR 0001: Ops and field internal UI stack — Tailwind + Radix (no Ant Design)

## Status

Accepted

## Context

Vestroo ships **`/ops/*`** (staff console) and **authenticated `/field/*`** (chauffeur web) inside the same Next.js app as marketing and public booking. Capstone reference apps under **`docs/capstone-reference/`** used **Ant Design** for dense admin/manager UIs. Epic **FE.5.2** requires a **single, documented** stack for internal surfaces that stays aligned with the rest of the product, keeps bundles lean, and does not copy reference **auth or transport** (Supabase + server-first gates remain authoritative).

## Decision

- **Styling:** **Tailwind CSS** is the only utility styling layer for **`/ops/*`** and **authenticated `/field/*`** chrome and new internal features.
- **Primitives:** **Radix UI** (`@radix-ui/*`) for behaviour where needed, extended **deliberately** when a pattern requires it (e.g. dialog, dropdown). **shadcn-style** composition lives in **`src/components/ui/*`** (shared) and **`src/features/ops/components/*`** (ops-specific layouts).
- **Ant Design:** **MUST NOT** be added for **`/ops/*`** or **authenticated `/field/*`** unless a **future ADR** explicitly supersedes this one.

## Rationale

- **One stack** with marketing/booking (**Tailwind**, existing **`src/components/ui/*`**) reduces cognitive load and duplicate dependencies.
- **Brand fit:** Vestroo tokens (e.g. primary green, neutrals) stay coherent; internal tools use **documented ops semantic tokens** (see **`src/app/globals.css`** `[data-ops-theme="dark"]` and **`tailwind.config.ts`**) rather than a second visual system.
- **Bundle size (NFR.5.2):** Avoiding Ant + its ecosystem keeps client JS smaller; prefer **Server Components** and **lazy** client islands for heavy UI (maps, large tables, charts).
- **Maintainability (NFR.5.1):** Shared **ops primitives** (page header, filter row, table shell, action group) reduce copy-paste Tailwind blocks; **FE.5.3** will tighten CRUD/list patterns further.

## Scope

- **`src/app/(ops)/ops/**`** — full ops shell and pages.
- **Authenticated `src/app/(field)/field/**`** (after login): **same locked stack** for new work; existing field chrome may adopt tokens/primitives incrementally.
- **Out of scope for this ADR:** public **`/ops/login`**, **`/ops/unauthorized`**, **`/field/login`**, **`/field/unauthorized`** — may keep minimal styling; still **must not** introduce Ant for those routes.

## Non-goals

- **Pixel- or theme-match** to capstone **Ant** UIs. Parity is **interaction and density expectations**, documented in **[ops-design-system-parity.md](../ops-design-system-parity.md)**.
- **Copying** capstone **JWT in localStorage**, **REST client** patterns, or **Firebase** from reference code.
- **Mandating** Sonner, Recharts, nextjs-toploader, or other libraries; see parity spec **dependency inventory** and **defer/adopt** lines.

## Consequences

- New internal UI components **should** live in **`src/features/ops/components/`** (ops) or **`src/features/field/components/`** (field), composing **`src/components/ui/*`** where possible.
- **Ops chrome** scopes design tokens via **`data-ops-theme="dark"`** on the ops layout wrapper so **`:root`** marketing/booking tokens in **`globals.css`** are not overridden globally.
- Each new **`@radix-ui/*`** dependency should be **recorded** in the parity spec with a short **bundle / justification** note.
- **Field** layouts may set **`data-ops-theme="dark"`** (or a documented field variant) when product wants visual alignment with ops; until then, field remains slate-themed but **must not** introduce Ant.

## Related documents

- **[ops-design-system-parity.md](../ops-design-system-parity.md)** — capstone interaction mapping, tokens, primitives, NFR.5.1 / NFR.5.2, dependency inventory, nextjs-toploader product line.
- **[ops-console.md](../ops-console.md)** — routes, shell, primitives location.
- **[Epic 5 — FE.5.2](../epic-5.md)**
