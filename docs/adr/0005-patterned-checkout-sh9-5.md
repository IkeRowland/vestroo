# ADR 0005 — Patterned checkout and PayFast fulfilment (SH.9.5)

## Status

Accepted — **2026-04-18** (implementation: migration `20260418160000_sh95_patterned_checkout_payment.sql`, `processPayment`, PayFast webhook).

## Context

- **Gate:** [`docs/epic-9.md#sh-9-1`](../epic-9.md#sh-9-1) **go** (**2026-04-17**).
- **Prerequisites:** [ADR 0002](0002-patterned-shuttle-domain-sh9-2.md) (runs / patterns), [ADR 0003](0003-service-run-capacity-holds-sh9-3.md) (holds on `tickets`), [ADR 0004](0004-patterned-run-realtime-sh9-4.md) (Realtime is **not** payment authority).
- **On-demand baseline:** [VST-6](../stories/vst-6.story.md) — search → quote → book → pay for point-to-point / hourly; **delta** vs VST-6: [`docs/patterned-checkout-vst6-delta.md`](../patterned-checkout-vst6-delta.md).
- **Payments:** [INT.8.3 — `#int-8-3`](../integrations-and-payments.md#int-8-3) and [`docs/integrations-and-payments.md`](../integrations-and-payments.md) — **single** `verifyPayFastWebhookSignature` path; **no** duplicated gateway signing logic in application code.

`reserve_service_run_capacity` / `confirm_service_run_ticket_hold` (SH.9.3) require **`auth.uid()`**. **`processPayment`** and the PayFast ITN handler use the **Supabase service role** (`auth.uid()` is null). Checkout and webhook therefore use **dedicated `SECURITY DEFINER` RPCs** granted to **`service_role`**, which enforce **booking** / **`tickets`** state without re-implementing INT.8.3.

## Decision

### State machine (patterned / capacity web checkout)

1. **Authenticated customer** completes wizard with `booking_intent = corporate_pattern` and structured **`booking_metadata`** (`service_run_id`, segment points, `seats`, optional `idempotency_key`).
2. **`processPayment`** inserts **`bookings`** (with **`customer_id`** when session exists), then calls **`reserve_service_run_capacity_for_booking_checkout(booking_id)`** — creates **`tickets`** row(s) in **`hold`** with TTL (checkout window).
3. Customer pays on PayFast; **only** the **signed** ITN (`POST /api/payfast/webhook`) transitions **`payment_status`** per [PayFast webhook lifecycle](../integrations-and-payments.md#payfast-webhook-lifecycle).
4. **`COMPLETE`:** after **`paid`** transition (or on **duplicate `COMPLETE`** when already **`paid`**), **`confirm_ticket_holds_for_paid_booking(booking_id)`** sets holds → **`confirmed`** (idempotent).
5. **`FAILED` / `CANCELLED`:** after booking row reflects failure, **`release_ticket_holds_for_failed_booking(booking_id)`** sets holds → **`released`** (idempotent).

**Realtime** subscriptions do not authorise payment or inventory (ADR 0004).

### Guest vs authenticated scope (MVP)

- **`bookings.customer_id`** may be **null** for guest web (VST-6).
- **`tickets.passenger_id`** references **`profiles`**. Automated patterned capacity checkout **requires** a signed-in customer (**`customer_id` / `profiles.id`**) so **`passenger_id`** is valid. **Guest** patterned checkout with automated holds is **out of scope** for this MVP; the reserve RPC returns a clear error if **`customer_id`** is missing.

### Refunds (product rules)

| Scenario | Automation | Effect on `tickets` / capacity |
|----------|------------|------------------------------|
| Customer refund before **`paid`** | N/A | Holds **released** or **expired** per hold TTL / ITN **`FAILED`** path. |
| Customer refund after **`paid`**, before run | **TBD / manual** ops | Target: **`ticket_inventory_state`** → **`cancelled`** where policy allows; capacity returns when ticket leaves **confirmed** sum (see ADR 0003). **No** automated refund RPC in this slice. |
| Staff-initiated refund | **TBD / manual** | Same — align with finance and **[INT.8.3](../integrations-and-payments.md#int-8-3)** matrix honesty. |
| Gateway vs internal credit | Per **VST-13** / integrations doc | PayFast reversals tracked via **`trans_id`** / ops process; **not** forked in code here. |

### No-show (product rules)

| Item | Rule |
|------|------|
| Definition | **TBD** — e.g. passenger not at agreed waypoint within **X** minutes of **scheduled** segment time (product). |
| Outcome | **TBD / manual** — manifest / ops marking (**[ADR 0002](0002-patterned-shuttle-domain-sh9-2.md)**); **no** automatic forfeit billing in this slice. |
| Data | **`service_run_manifest_entries`**, **`tickets`** — RLS and **[VST-12](../compliance-and-safety.md)** unchanged. |

## Consequences

- New RPCs: **`reserve_service_run_capacity_for_booking_checkout`**, **`confirm_ticket_holds_for_paid_booking`**, **`release_ticket_holds_for_failed_booking`** — **`service_role` only**.
- Webhook remains the **only** PayFast signature entry; new behaviour is **RPC deltas** after the same verified route.
- Docs: [`docs/data-models.md`](../data-models.md), [`docs/patterned-checkout-vst6-delta.md`](../patterned-checkout-vst6-delta.md), [`docs/front-end-api-interaction.md`](../front-end-api-interaction.md), [`docs/integrations-and-payments.md`](../integrations-and-payments.md).

## Links

- Story: [`docs/stories/9.5.story.md`](../stories/9.5.story.md)
- VST-6 delta: [`docs/patterned-checkout-vst6-delta.md`](../patterned-checkout-vst6-delta.md)
