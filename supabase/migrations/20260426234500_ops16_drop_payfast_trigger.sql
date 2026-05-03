-- Epic 16 / Theme N — US-N2 (Q31): physically remove the legacy walk-in payment trigger and
-- its supporting function from `public.bookings`. After this drop, no DB automation flips
-- `payment_status` or `status` on payment events; settlement is recorded out of band by
-- `markBookingPaymentReceived` (US-N3) once that ships.
--
-- The `bookings.payment_status` column is retained — only the trigger/function pair is
-- removed. The historical PayFast naming is preserved in this migration's identifier per the
-- epic's AC2 wording (suffix `ops16_drop_payfast_trigger`); subsequent migrations referring
-- to the legacy provider carry the historical-annotation comment per AC6.
--
-- Trigger names dropped (idempotent — both legacy aliases are covered):
--   * `bookings_walk_in_paid_to_ready_to_assign` (actual name created by the Epic 14 / 14.1
--     migration — `20260420220000_epic14_story141_ready_to_assign_walk_in_paid_trigger_v1.sql`).
--   * `ready_to_assign_walk_in_paid_trigger` (epic snippet alias — included for safety so
--     this drop is a no-op on environments that may have used the alternate name).
--
-- Functions dropped (idempotent — both names are covered for the same reason):
--   * `public.bookings_walk_in_paid_to_ready_to_assign_fn()`
--   * `public.ready_to_assign_walk_in_paid_v1()`

drop trigger if exists bookings_walk_in_paid_to_ready_to_assign on public.bookings;
drop trigger if exists ready_to_assign_walk_in_paid_trigger on public.bookings;

drop function if exists public.bookings_walk_in_paid_to_ready_to_assign_fn();
drop function if exists public.ready_to_assign_walk_in_paid_v1();
