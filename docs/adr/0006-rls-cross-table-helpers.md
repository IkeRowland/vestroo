# ADR 0006: Cross-table RLS via `SECURITY DEFINER STABLE` helpers

## Status

**Accepted** — governs **new** RLS policies and relevant trigger bodies; documents the shipped **Theme K1** remediation as the canonical before/after. Does not require a repo-wide rewrite of historical policies ([Epic 16](../epic-16.md) **Q35**).

## Numbering

This repository’s ADRs live under `docs/adr/`. **`0006`** is the identifier agreed in [Epic 16](../epic-16.md) Theme **O** / **US-O1** and in `COMMENT ON FUNCTION` text on helpers shipped in **`20260426170000_ops16_service_runs_tickets_rls_helpers.sql`** so the path stays stable without renaming database comments.

## Context

PostgreSQL Row Level Security (**RLS**) evaluates **`USING`** / **`WITH CHECK`** expressions as the current role. When a policy on table **A** uses an inline **`EXISTS (SELECT … FROM B …)`**, PostgreSQL applies **B**’s RLS for that inner scan. If a policy on **B** in turn references **A** (again under invoker RLS), the engine can detect **infinite recursion** and raise **SQLSTATE `42P17`** (“infinite recursion detected in policy for relation …”).

The same class of failure can appear in **trigger functions** that embed cross-table predicates subject to mutual RLS evaluation when a **`SECURITY INVOKER`** (default) path would inline those predicates.

## Decision

### Rule

1. **RLS policies:** Any policy **`USING`** or **`WITH CHECK`** clause that must consult rows in **another** table (different relation than the policy’s own table) MUST do so through a **`SECURITY DEFINER STABLE`** SQL helper function defined in the same migration (or a closely related one), **not** through an inline **`EXISTS`** (or equivalent subquery) into that other table **under the invoker’s RLS**.

2. **Trigger functions:** When a trigger touches **multiple** RLS-protected tables and the straightforward implementation would inline cross-table **`EXISTS`** predicates that re-enter each other’s policies, use the same helper pattern (or a dedicated **`SECURITY DEFINER`** helper appropriate to the write path) so inner reads do not recurse.

The helper body runs with the **function owner’s** privileges; well-scoped internal **`SELECT`**s therefore **do not re-enter** caller-side RLS on the joined tables in the way that caused the recursion. Use **`STABLE`** when the function reads from tables (not **`IMMUTABLE`**).

### Rationale

Inline **`EXISTS`** into table **B** runs **B**’s policies as the **authenticated** (or current) user. If **B**’s policy references **A** and **A**’s policy again reaches **B**, PostgreSQL raises **`42P17`**. Encapsulating the cross-table visibility check in **`SECURITY DEFINER`** breaks the cycle by evaluating the inner visibility logic **outside** the mutually recursive policy graph.

### Pattern references (prior art in this repo)

| Example | Role | Migration (filename suffix) |
|--------|------|----------------------------|
| **`public.booking_is_visible_to_chauffeur_via_trips(p_booking_id uuid)`** | Canonical **Epic 11** **E1** pattern: bookings ↔ booking_trips / trips chauffeur visibility without recursion | `20260418210000_e1_rls_bookings_booking_trips_recursion_fix.sql` (see also `20260419220000_reapply_e1_bookings_chauffeur_rls_recursion_fix.sql`) |
| **`public.service_run_is_visible_to_party(p_service_run_id uuid)`** | **Epic 16 K1** — encapsulates former **`service_runs_select_party`** cross-table **`EXISTS`** | `20260426170000_ops16_service_runs_tickets_rls_helpers.sql` |
| **`public.ticket_is_visible_to_run_chauffeur(p_ticket_id uuid)`** | **Epic 16 K1** — encapsulates former **`tickets_chauffeur_run_select`** path into **`service_runs`** | `20260426170000_ops16_service_runs_tickets_rls_helpers.sql` |

Epic 11 programme context: [Epic 11 — Operations platform](../epic-11.md) (Phase **1 — Security foundation**, Theme **A**).

### Naming convention

Use descriptive, consistent names:

**`<source_table_singular>_is_visible_to_<role_or_relationship>(p_<source_table_singular>_id uuid) returns boolean`**

Examples matching shipped code:

- `booking_is_visible_to_chauffeur_via_trips(p_booking_id uuid)` — source **booking**, relationship **chauffeur via trips**
- `service_run_is_visible_to_party(p_service_run_id uuid)` — source **service_run**, relationship **party** (aggregate visibility)
- `ticket_is_visible_to_run_chauffeur(p_ticket_id uuid)` — source **ticket**, relationship **run chauffeur**

Align the parameter name with the table’s primary key semantic (`p_booking_id`, `p_service_run_id`, `p_ticket_id`).

### Grants

For helpers **invoked from RLS** (and typically from triggers that mirror the same security model), apply:

```sql
REVOKE ALL ON FUNCTION public.<helper>(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.<helper>(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.<helper>(uuid) TO service_role;
```

Shipped instance: **`20260426170000_ops16_service_runs_tickets_rls_helpers.sql`** (both K1 helpers). E1 migration applies the same pattern to **`booking_is_visible_to_chauffeur_via_trips`**.

Also set **`SET search_path = public`** on **`SECURITY DEFINER`** functions (see K1 and E1 migrations).

### Smoke test requirement

Every **new** RLS policy (or materially changed policy) MUST be accompanied by coverage in **`supabase/smoke_rls.sql`** such that a **`SELECT count(*) FROM <table>;`** (or another **safe read** agreed with QA / security) runs **without error**—including **without `42P17`**—under the **relevant role(s)** (e.g. **`authenticated`** contexts exercised by the smoke script).

This ADR states the **expectation** only. It does **not** implement the **US-M2** full catalogue or **US-O2** automated sweep across all tables; those are separate stories ([Epic 16](../epic-16.md) Theme **O** / **M**).

### Exceptions

- **Same-table** predicates (e.g. “customer sees own row” via **`customer_id = auth.uid()`** with no **`EXISTS`** into another RLS-protected table) **do not** require this helper pattern.
- Legitimate exceptions after **US-O2** lint may use an agreed escape hatch (e.g. review-approved comment) — see Epic 16 **US-O2** when implemented.

## Worked example (Theme K1)

### Before (recursive policy pair)

1. **`service_runs_select_party`** on **`public.service_runs`** — introduced in **`supabase/migrations/20260418150000_sh94_patterned_run_realtime.sql`**. The **`USING`** clause included inline **`EXISTS`** subqueries against **`public.tickets`** (and other tables), evaluating **tickets** RLS from **service_runs** policy evaluation.

2. **`tickets_chauffeur_run_select`** on **`public.tickets`** — introduced in **`supabase/migrations/20260418140000_sh93_service_run_capacity_holds.sql`**. The **`USING`** clause included **`EXISTS`** into **`public.service_runs`**.

Selecting **service_runs** pulled in **tickets** policies; **tickets** policies referenced **service_runs** again → **`42P17`**.

### After (helpers + thin policies)

Migration **`supabase/migrations/20260426170000_ops16_service_runs_tickets_rls_helpers.sql`**:

- Drops **`service_runs_select_party`** and **`tickets_chauffeur_run_select`**.
- Creates **`public.service_run_is_visible_to_party(uuid)`** and **`public.ticket_is_visible_to_run_chauffeur(uuid)`** as **`SECURITY DEFINER STABLE`** with **`set search_path = public`**, preserving the original visibility semantics.
- Recreates policies as:

  - **`service_runs_select_party`**: **`USING (public.service_run_is_visible_to_party(id))`**
  - **`tickets_chauffeur_run_select`**: **`USING (public.ticket_is_visible_to_run_chauffeur(id))`**

No inline cross-table **`EXISTS`** remains in those two policy definitions.

## Consequences

- Migration authors and reviewers have a **single** convention document for cross-table RLS.
- **US-O2** (lint + CI + extended smoke) will reference this file path in messages — implement in a follow-on story.

## Related

- [Epic 16 — Theme O](../epic-16.md) (**US-O1**, **US-O2**)
- [Epic 6 — BE.6.2](../epic-6.md)
- [Contributing — Pull requests](../../CONTRIBUTING.md)
- K1 story: [Story 16.1](../stories/16.1.story.md)
