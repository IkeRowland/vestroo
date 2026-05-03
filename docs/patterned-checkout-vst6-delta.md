# Patterned / capacity checkout vs VST-6 (delta)

**Normative payment and ITN behaviour:** [`docs/integrations-and-payments.md`](integrations-and-payments.md) — **[§ INT.8.3 — `#int-8-3`](integrations-and-payments.md#int-8-3)**, **PayFast webhook lifecycle**. This note describes **only** how **patterned / per-run capacity** differs from on-demand **[VST-6](stories/vst-6.story.md)**.

## When a `service_run` attaches

| Flow | When `service_run_id` is known |
|------|----------------------------------|
| **VST-6** (point-to-point / hourly / experience) | Typically **not** on the web booking row at checkout; dispatch / ops may link a **trip** / **run** later (**VST-7**). |
| **SH.9.5** `corporate_pattern` | **`booking_metadata.service_run_id`** (and segment **`from_point_id` / `to_point_id`**) at **`processPayment`** — required to place a **capacity hold** on that **run** before PayFast. |

## Quotes vs per-run capacity

- **VST-6:** **`reconcileBookingQuote`** recomputes ZAR from Distance Matrix / hourly / experience rules; **`quoteAmount`** is not trusted.
- **Patterned:** Same **reconcile** path for **ZAR** today (corporate_pattern uses point-to-point quote plumbing for the wizard leg). **Seat count** vs **run capacity** is enforced in the database by **`reserve_service_run_capacity_for_booking_checkout`** (declared **`service_runs.passenger_capacity`**, holds + confirms per [ADR 0003](adr/0003-service-run-capacity-holds-sh9-3.md)).

## Customer-visible steps

| Step | VST-6 happy path | Patterned + capacity (SH.9.5) |
|------|------------------|-------------------------------|
| 1 | Quote → **Book** | Quote → **Book** (signed-in **required** for automated holds — see [ADR 0005](adr/0005-patterned-checkout-sh9-5.md)) |
| 2 | **`processPayment`** creates **pending** booking | Same + **hold** on **`tickets`** (inventory state **`hold`**, TTL) |
| 3 | PayFast hosted checkout | Same |
| 4 | ITN **`COMPLETE`** → **`paid`** | Same + **`confirm_ticket_holds_for_paid_booking`** → **`confirmed`** occupancy |
| 5 | ITN **`FAILED`/`CANCELLED`** | Same + **`release_ticket_holds_for_failed_booking`** → hold **released** |

**Do not** use **Realtime** as payment or inventory authority ([ADR 0004](adr/0004-patterned-run-realtime-sh9-4.md)).

## API / Server Actions

See **[`docs/front-end-api-interaction.md`](front-end-api-interaction.md)** — **`processPayment`**, **`webBookingPayloadSchema`**, PayFast **`notify_url`**, idempotency.

Full rules: **[ADR 0005 — Patterned checkout (SH.9.5)](adr/0005-patterned-checkout-sh9-5.md)**.
