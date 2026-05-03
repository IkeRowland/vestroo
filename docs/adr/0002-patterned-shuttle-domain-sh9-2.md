# ADR 0002: Patterned / capacity-managed corporate shuttle — domain vocabulary & collisions (SH.9.2)

## Status

Accepted

## Context

**Product gate:** **[Epic 9 — SH.9.1 (`#sh-9-1`)](../epic-9.md#sh-9-1)** records **go** (effective **2026-04-17**) for an optional **patterned / capacity-managed corporate shuttle** offering. **[Story 9.2 — SH.9.2](../stories/9.2.story.md)** requires a single **ADR** before DDL: canonical terms (**run**, **assignment**, **service window**, **waypoint**, **manifest**) mapped to **`public.*`** and **[Epic 4](../epic-4.md)** vocabulary, plus explicit resolution of **service route / quote** collisions (**NFR.5.4**, **NFR.3.1**).

The stack already ships a renamed **network / schedule** spine (see **`docs/data-models.md`**, migrations **`20260402133631_*`**, **`20260406103000_*`**). **SH.9.2** must **not** reintroduce transit-demo **primary** product labels (**bus line**, **stop**); **table** names like **`tickets`** remain **internal** traceability keys with **`COMMENT ON`** framing.

## Decision

### 1. Canonical term → `public.*` / Epic mapping

| SH.9.2 term | Canonical meaning | Primary `public.*` (and notes) |
|-------------|-------------------|-------------------------------|
| **Run** | One operational departure instance of a recurring template on a calendar day | **`service_runs`** (instance of **`service_patterns`**; **`scheduled_start` / `scheduled_end`** bound the run). |
| **Assignment** | Chauffeur + vehicle bound to a run for an ops time window | **`chauffeur_assignments`** (and optional **`service_runs.chauffeur_id`** on the run row). **`trips.service_run_id`** links fulfilment trips to a run (**VST-7**). |
| **Service window** | Wall-clock interval the product treats as “this departure” for ops and manifests | **`service_runs.scheduled_start`** … **`service_runs.scheduled_end`** (closed interval; no new columns in **SH.9.2**). Pattern-level defaults live on **`service_patterns`** (`daily_start_time` / `daily_end_time`, effective dates). |
| **Waypoint** | Ordered pickup / drop-off / corridor point on a **service route** | **`service_points`** in sequence via **`service_route_points.order_index`**. Product copy: **waypoint** / **service point** — **not** “stop” as primary UX (**NFR.5.4**). |
| **Manifest** | Ordered passenger list / party lines for a **run** (PII) | **New:** **`service_run_manifest_entries`** (one row per manifest line, **`sequence_order`** for pickup order). **`tickets`** / **`trip_seats`** remain **inventory / seat** mechanics for **SH.9.3**; manifest lines may reference **`bookings`** and/or **`passenger_profile_id`** when known. |

### 2. Collision — **marketing / web quote “route”** vs **ops published pattern**

| Concern | Resolution |
|---------|--------------|
| **Double meaning of “route”** | **Marketing / quote** “route” = customer journey intent + pricing geometry (**`bookings`**, **`booking_metadata`**, optional **`service_pattern_id`** on **`bookings`** for **`corporate_pattern`** — **VST-6**). **Ops published pattern** = **`service_routes`** + **`service_route_points`** + **`service_patterns`** + **`service_runs`**. |
| **FK direction** | **Quote → pattern (optional):** **`bookings.service_pattern_id` → `service_patterns.id`** (already in **`20260406120000_*`**). **Fulfilment → run:** **`trips.service_run_id` → `service_runs.id`** (**VST-7**). **Manifest → run:** **`service_run_manifest_entries.service_run_id` → `service_runs.id`**; optional **`booking_id` → `bookings.id`**. |
| **Lifecycle** | Web **`bookings`** rows are **intent / payment** records; **dispatch** attaches **`trips`** and may attach **`service_run_id`**. **Patterned** seats and **capacity holds** are **SH.9.3**; this ADR only defines **names**, **joins**, and the **manifest** table introduced in **`20260417120000_*`**. |

### 3. Schema delivery (this ADR + migration)

- **`service_run_manifest_entries`:** **`ENABLE ROW LEVEL SECURITY`**; **staff** full DML; **chauffeur** `SELECT` when assigned to the run (**`service_runs.chauffeur_id`**); **customer** `SELECT` when **`passenger_profile_id = auth.uid()`** or **`bookings.customer_id = auth.uid()`** for linked **`booking_id`**. **No `anon`** policy — deny-by-default for unauthenticated clients.
- **No** new **Server Actions** or **ops UI** in **SH.9.2** (story scope).

## Rationale

- Reuses existing **run / pattern / route-point** model instead of parallel **Bus\***-shaped tables (**BE.6.1** / matrix traceability).
- Splits **manifest** (PII list) from **`tickets`** (seat inventory) so **SH.9.3** can attach **capacity** keys without overloading **`tickets`** semantics.
- **`service_runs.scheduled_*`** as **service window** avoids redundant columns and aligns with **SH.9.3** “per-departure” keys.

## Consequences

- **`docs/data-models.md`** and **`src/types/database.types.ts`** gain **SH.9.2** / **`service_run_manifest_entries`** documentation and a small **hand-maintained** type for **`entry_source`**.
- **Ops / field** features that edit manifests **must** use **server** clients + **`is_staff()`** / role checks; follow-up stories add UI.
- **`#sh-9-1`** links here; this ADR links **`#sh-9-1`** (single logical **go** decision surface per gate preamble).

## Related documents

- **[Epic 9 — SH.9.1 gate (`#sh-9-1`)](../epic-9.md#sh-9-1)**
- **[Story 9.1 — SH.9.1](../stories/9.1.story.md)** · **[Story 9.2 — SH.9.2](../stories/9.2.story.md)**
- **[ADR 0003 — Service run capacity / holds (SH.9.3)](0003-service-run-capacity-holds-sh9-3.md)** — reservation economics and contention; extends **`tickets`** / **`service_runs`** without changing manifest vs inventory split above.
- **[Data models](../data-models.md)** · **[Epic 4](../epic-4.md)** · **[Compliance (VST-12)](../compliance-and-safety.md)**
- **Migration:** `supabase/migrations/20260417120000_sh92_service_run_manifest_entries.sql`
