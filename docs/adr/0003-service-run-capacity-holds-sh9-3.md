# ADR 0003: Service run capacity, reservation holds, and idempotency (SH.9.3)

## Status

Accepted

## Context

**Product gate:** **[Epic 9 — SH.9.1 (`#sh-9-1`)](../epic-9.md#sh-9-1)** records **go** (effective **2026-04-17**). **[ADR 0002 — Patterned shuttle domain](0002-patterned-shuttle-domain-sh9-2.md)** assigns **`tickets`** / **`trip_seats`** to **inventory / seat** mechanics and **`service_run_manifest_entries`** to **manifest (PII)**. **SH.9.3** must enforce **no oversell** under concurrency (**NFR.1.2**), **idempotent** reserves (**AC6**), and **documented** hold lifecycle (**AC5**), without contradicting ADR 0002.

## Decision

### 1. Capacity dimension (AC4)

- **Primary:** **`service_runs.id`** — declared capacity on **`service_runs.passenger_capacity`** (non-negative integer; default **14** in migration for existing rows).
- **Enforcement:** Sum of **`tickets.number_of_seats`** where **`ticket_inventory_state = 'confirmed'`** or **`'hold'`** with **`hold_expires_at > now()`** must not exceed **`passenger_capacity`**.
- **Segment-level (`trip_seats`):** Not automated in this delivery; **`trip_seats`** remains available for a future segment-aggregate model (see **[data-models.md](../data-models.md)** gap analysis). Per-run totals are authoritative for **SH.9.3**.

### 2. Hold model on `public.tickets` (aligns with ADR 0002)

- **`ticket_inventory_state`:** `legacy` (pre–SH.9.3 rows, excluded from capacity), **`hold`**, **`confirmed`**, **`released`**, **`expired`**, **`cancelled`**.
- **`hold_expires_at`:** Wall-clock expiry for **`hold`** rows; cleared when moving to **`confirmed`** or terminal states.
- **`idempotency_key`:** Optional client key; **unique per `service_run_id`** when set (partial unique index).
- **Natural key dedupe:** Optional **`booking_id`** + **`service_run_id`** + **`from_point_id`** + **`to_point_id`** unique while **`hold`** or **`confirmed`** (partial unique index).

### 3. Transaction boundaries (AC3)

- **`reserve_service_run_capacity`** is **`SECURITY DEFINER`**, **`SET search_path = public`**, and runs **`SELECT … FROM service_runs WHERE id = $1 FOR UPDATE`**, then recomputes usage and **`INSERT`s** a **`hold`** ticket in one call — single database round-trip from the app (**`supabase.rpc`**).
- **Invalid state transitions** are blocked by trigger **`tickets_inventory_transition_guard`** (before update of **`ticket_inventory_state`**).

### 4. Hold lifecycle (AC5)

| Transition | Meaning | Who |
|------------|---------|-----|
| → **`hold`** | Reserve capacity for a bounded time | **`reserve_service_run_capacity`** |
| **`hold`** → **`confirmed`** | Hold converted to committed inventory (e.g. after checkout in a later story) | **`confirm_service_run_ticket_hold`** (passenger or staff) |
| **`hold`** → **`released`** | Customer / system releases capacity without “cancel” semantics | **`release_service_run_ticket_hold`** |
| **`hold`** → **`cancelled`** | Explicit cancellation of the hold | **`cancel_service_run_ticket_hold`** |
| **`hold`** → **`expired`** | Past **`hold_expires_at`** | **`expire_outdated_service_run_holds`** (scheduled / ops) |
| **`confirmed`** → **`cancelled`** | Confirmed seat cancelled (e.g. staff) | Direct update allowed by trigger; prefer future dedicated RPC |

**Default hold TTL:** **900** seconds (**15 minutes**) in **`reserve_service_run_capacity`**; valid range **60–86400** seconds.

### 5. RPC surface (trusted server + authenticated JWT)

| Function | Purpose |
|----------|---------|
| **`reserve_service_run_capacity`** | Lock run, idempotency return, capacity check, insert **`hold`** |
| **`release_service_run_ticket_hold`** | **`hold`** → **`released`** |
| **`cancel_service_run_ticket_hold`** | **`hold`** → **`cancelled`** |
| **`confirm_service_run_ticket_hold`** | **`hold`** → **`confirmed`** (rejects expired holds) |
| **`expire_outdated_service_run_holds`** | Batch **`hold`** → **`expired`** where **`hold_expires_at <= now()`** |
| **`service_run_reserved_seat_count`** | Read-only seat sum (authenticated) |

**Authorization:** Non-staff callers may only act on **`passenger_id = auth.uid()`** (except **`expire_outdated_service_run_holds`**, which is safe housekeeping on expired rows).

### 6. RLS (AC8)

- Existing **`tickets`** policies for passenger / staff remain.
- **New:** **`tickets_chauffeur_run_select`** — chauffeurs may **`SELECT`** **`tickets`** for **`service_runs`** where **`chauffeur_id = auth.uid()`** (operational visibility without broad PII).
- **No `anon`** policies on **`tickets`** — unchanged.
- **Service role** (Server Actions) bypasses RLS for trusted server paths only.

## Rationale

- **ADR 0002** keeps manifest vs inventory separate; **`tickets`** already models seat commitments — extending it avoids parallel “hold” tables while meeting **SH.9.3** ACs.
- **`FOR UPDATE`** on **`service_runs`** serializes competing reservers; combined with idempotent keys and a capacity sum, two sessions cannot both commit over capacity.

## Consequences

- Ops must set **`passenger_capacity`** per run (or future automation from vehicle category) when runs are capacity-managed.
- **`trip_seats`** is not auto-maintained here; segment dashboards must either update it in a follow-up or rely on per-run totals until a segment story lands.
- **`docs/data-models.md`** and **`src/types/database.types.ts`** document **`ticket_inventory_state`** and RPC names.

## Related documents

- **[Epic 9 — SH.9.1 (`#sh-9-1`)](../epic-9.md#sh-9-1)** · **[Story 9.3 — SH.9.3](../stories/9.3.story.md)**
- **[ADR 0002](0002-patterned-shuttle-domain-sh9-2.md)** · **[Data models — tickets / trip_seats](../data-models.md)**
- **Migration:** `supabase/migrations/20260418140000_sh93_service_run_capacity_holds.sql`
