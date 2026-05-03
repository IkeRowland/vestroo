# Ops dashboard KPIs — v1 (normative)

**Version:** v1  
**Route:** [`/ops`](../src/app/(ops)/ops/page.tsx) (dashboard home; trip kanban remains [`/ops/board`](../src/app/(ops)/ops/board/page.tsx)).  
**Implementation module:** [`src/lib/ops-dashboard-kpis.ts`](../src/lib/ops-dashboard-kpis.ts) (keys and drill targets must stay aligned with this doc).

**Timezone:** Unless stated otherwise, **UTC** is used for calendar boundaries (`Date` in Node/Edge is UTC for ISO strings). **“Last 7 days”** means rolling **168 hours** from the instant the dashboard snapshot is taken (`fetchedAt` on the page), using `trips.time_end_estimate` for completed trips.

**Fulfil queue predicates** for booking-backed KPIs match [`docs/fulfil-queue-buckets.md`](fulfil-queue-buckets.md) and [`src/lib/fulfil-queue-buckets.ts`](../src/lib/fulfil-queue-buckets.ts).

| Key (`OpsDashboardKpiId`) | Label (UI) | Numerator | Denominator | Drill target | Filter parity notes |
| ------------------------- | ---------- | --------- | ----------- | ------------ | ------------------- |
| `trips_open` | Open trips | `COUNT(*)` from `trips` where `status` ∈ `booking`, `assigned`, `en_route` | None — all trips in those statuses | `/ops/board` | Board shows up to **80** most recent trips by `time_start_estimate`; column grouping may omit trips beyond that cap — **counts can exceed visible cards**. |
| `trips_booking` | Trips — booking | `COUNT(*)` where `status = 'booking'` | None | `/ops/board` | Same visibility cap as above. |
| `trips_en_route` | Trips — en route | `COUNT(*)` where `status = 'en_route'` | None | `/ops/board` | Same visibility cap as above. |
| `trips_completed_7d_utc` | Completed trips (7d) | `COUNT(*)` where `status = 'completed'` **and** `time_end_estimate` ≥ (now − 7d) **and** `time_end_estimate` ≤ now | None | `/ops/board` | Board **completed** column is **not** filtered to the 7-day window; drill is the **closest** triage view. Rows with null `time_end_estimate` are **excluded** from the count. |
| `bookings_pending_payment` | Pending payment (queue) | `COUNT(*)` from `bookings` matching **pending** bucket: `(booking_intent IS NULL OR booking_intent <> 'trip_request')` **and** (`status <> 'paid'` OR `payment_status <> 'paid'`) | None | `/ops/fulfil?queue=pending` | Matches Fulfil **Pending payment** tab query. |
| `bookings_trip_request` | Trip requests (queue) | `COUNT(*)` where `booking_intent = 'trip_request'` | None | `/ops/fulfil?queue=trip_request` | Matches Fulfil **Trip requests** tab. |

**Week-over-week delta row (FE.17.4 UI):** Scorecards reserve a delta row (`OpsKpiCard`). Comparison percentages are **not** part of the v1 loader yet — the dashboard renders `— · from last week` until a dedicated aggregate story adds prior-period numerators (stay aligned with **`docs/ops-design-system-parity.md`** §17.4).

## Cross-links

- Data freshness for this route: [`docs/ops-data-freshness.md`](ops-data-freshness.md)  
- Server logging on aggregate failure: [`docs/ops-server-action-logging.md`](ops-server-action-logging.md) (`ops_dashboard_load_aggregates`)
