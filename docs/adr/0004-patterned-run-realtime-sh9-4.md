# ADR 0004: Patterned-run Realtime publication and privacy (SH.9.4)

## Status

Accepted — implementation **2026-04-18**. Product gate **[`docs/epic-9.md`](../epic-9.md#sh-9-1)** = **go** (**2026-04-17**).

## Context

- **SH.9.2** + **[ADR 0002](0002-patterned-shuttle-domain-sh9-2.md)** define **`service_runs`**, manifest entries, and pattern semantics.
- **SH.9.3** + **[ADR 0003](0003-service-run-capacity-holds-sh9-3.md)** define **capacity / ticket holds** on **`tickets`** — **authoritative** inventory remains **Postgres**; **Realtime must not** be used as a substitute for capacity truth (**NFR.1.2**).
- **[VST-9](../realtime-and-notifications.md)** is the canonical channel matrix; this ADR records **patterned-run** publication rules without duplicating VST-9 wholesale.
- Reference **Nest** names **BusTracking** / **DriverBusSchedule** appear **only** as traceability keys (**NFR.5.4**), not product copy.

## Decision

1. **Publication** — Add **`public.service_runs`** and **`public.chauffeur_assignments`** to **`supabase_realtime`** alongside existing **`vehicle_trackings`** and **`trips`**, **after** tightening **`service_runs`** SELECT RLS (migration **`20260418150000_sh94_patterned_run_realtime.sql`**).
2. **RLS** — Replace **`service_runs_read_auth`** (`USING (true)` for all authenticated) with **`service_runs_select_party`**: chauffeurs, customers, and ticket/booking parties tied to the run **via** **`trips`** / **`tickets`** / **`bookings`**. **Staff** retain full access via existing **`service_runs_staff`**. **No** anon read; **service role** remains server-only (**NFR.3.1**).
3. **Chauffeur assignments** — Existing **`chauffeur_assignments_chauffeur_read`** / staff policies already scope rows; publication is acceptable without a parallel open-read policy.
4. **Client helpers** — Extend **`src/lib/supabase/realtime.ts`** with **`subscribeServiceRuns`** and **`subscribeChauffeurAssignments`**, optional **`filter`** strings (`id=eq.<run>`, `chauffeur_id=eq.<uid>`) to reduce churn where callers know scope; RLS remains the security boundary.
5. **Privacy** — **`roundCoordinatesForPrivacyTier`** (**`src/lib/maps.ts`**) applies to any **non-staff** map surface; **customer** **`vehicle_trackings`** Realtime remains **disabled** per VST-9 — patterned runs do not change that; customers rely on **`trips`** / rounded copy where product allows.
6. **Roster / schedule** — **`chauffeur_schedules`** stays **off** Realtime publication; roster UIs use **Server Actions** + **refresh** / polling. Run and assignment Realtime cover **binding** and **metadata** updates, not a full timetable hub (**RT.7.5**).

## Consequences

- Ops **`/ops/board`** may subscribe to **`service_runs`** (see **`OpsBoardRealtimeBridge`**) with the same debounce pattern as **`trips`** / **`vehicle_trackings`** (**AC7** alignment).
- Field apps can adopt **`subscribeChauffeurAssignments`** with **`chauffeur_id=eq.<session>`** when product wires it; until then helpers are documented integration points.
- Capacity-sensitive fields on **`tickets`** / RPCs are unchanged; clients **must** refetch or use actions after holds — not **`postgres_changes`** alone.

## Links

- Story: **[`docs/stories/9.4.story.md`](../stories/9.4.story.md)**
- Mapping: **[`docs/patterned-run-live-ops-mapping.md`](../patterned-run-live-ops-mapping.md)**
- VST-9: **[`docs/realtime-and-notifications.md`](../realtime-and-notifications.md)**
- Matrix: **[`docs/capstone-backend-module-matrix.md`](../capstone-backend-module-matrix.md)** § **RT.7.1**, **RT.7.4**, **RT.7.5**
