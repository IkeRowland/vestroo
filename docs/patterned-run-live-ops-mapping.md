# Patterned-run live ops — capstone traceability → Vestroo (SH.9.4)

**Gate:** **[`docs/epic-9.md`](epic-9.md#sh-9-1)** **go** (**2026-04-17**). **ADR:** **[`docs/adr/0004-patterned-run-realtime-sh9-4.md`](adr/0004-patterned-run-realtime-sh9-4.md)**.

Reference class and module names (**BusTracking**, **DriverBusSchedule**, **BusTrackingModule**, **DriverBusScheduleModule**) are **engineering traceability keys only** — **not** customer-facing product labels (**NFR.5.4**).

## BusTracking-style concerns → Vestroo

| Reference concept | Vestroo storage / behaviour | Realtime / refresh |
| ----------------- | ---------------------------- | ------------------ |
| Live vehicle position vs route | **`vehicle_trackings`** (`current_location`, **`service_run_id`**, **`chauffeur_assignment_id`**, **`vehicle_id`**) + **`trips`** linkage | **`subscribeVehicleTrackings`** (RLS: staff + chauffeur on assignment). Customer: **no** `vehicle_trackings` SELECT in MVP (VST-9). |
| Progress vs pattern / waypoints | **`service_runs`** → **`service_route_points`** / **`service_points`** (ADR 0002); ETA stub on **`vehicle_trackings.estimated_arrival`** (`src/lib/maps.ts`) | **`trips`** + tracking refresh; **`subscribeServiceRuns`** for run window/metadata updates on ops. |
| Status / board | **`trips.status`**, time windows | **`subscribeTripsBoard`** + ops debounce (**`OpsBoardRealtimeBridge`**) |

## DriverBusSchedule-style concerns → Vestroo

| Reference concept | Vestroo storage | Realtime vs polling |
| ----------------- | ---------------- | ------------------- |
| Chauffeur ↔ scheduled run | **`chauffeur_assignments`** (chauffeur, vehicle, route window) + **`trips.service_run_id`** + **`service_runs`** | **`subscribeChauffeurAssignments`** optional (narrow **`chauffeur_id`** filter); **no** requirement for **`chauffeur_schedules`** Realtime — roster pages use queries + revalidation. |
| Shift / roster grid | **`chauffeur_schedules`** | **Polling / navigation refresh** only (RT.7.5); not in **`supabase_realtime`**. |
| Run instance (calendar departure) | **`service_runs`** (`service_date`, **`scheduled_start`**, **`scheduled_end`**, **`trip_number`**, **`passenger_capacity`**) | **`subscribeServiceRuns`** for authorised subscribers; capacity **truth** = **Postgres** + **SH.9.3** RPCs, **not** Realtime event counts (ADR 0003). |

## Epic 7 / surfaces

- **Ops:** **`/ops/board`** — **`OpsBoardRealtimeBridge`**: **`trips`**, **`vehicle_trackings`**, **`service_runs`** (debounced refresh).
- **Field:** **`publishChauffeurLocationAction`**, **`FieldLocationPublisher`** — throttle/cadence per VST-9 § *Update intervals and rate limits*.
- **Customer:** **`trips`** Realtime where RLS allows; **no** **`vehicle_trackings`** stream in MVP; map precision via **`roundCoordinatesForPrivacyTier`** when UI exposes coordinates.

## Related code

- **`src/lib/supabase/realtime.ts`**
- **`docs/realtime-and-notifications.md`** (VST-9)
- **`docs/data-models.md`** — **`service_runs`**, **`chauffeur_assignments`**, **`vehicle_trackings`**, **`trips`**
