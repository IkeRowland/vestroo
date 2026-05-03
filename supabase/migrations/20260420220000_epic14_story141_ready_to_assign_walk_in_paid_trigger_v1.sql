-- Epic 14 / Story 14.1 — ready_to_assign status + walk-in paid trigger (Q19) + RLS WITH CHECK.
--
-- HISTORICAL ANNOTATION — Epic 16 / Theme N (US-N2 / Q31): the trigger created by this
-- migration (`bookings_walk_in_paid_to_ready_to_assign`) and its supporting function were
-- DROPPED by `20260426234500_ops16_drop_payfast_trigger.sql`. Walk-in ready_to_assign is
-- now driven explicitly by `markBookingPaymentReceived` (US-N3); the CHECK constraint on
-- `bookings.status` (this migration) is retained.
--
-- Trigger vs RLS (AC8 / US-A2):
--   Row transitions from this BEFORE trigger mutate NEW as part of the same SQL UPDATE;
--   PostgreSQL does not re-evaluate RLS policies on intermediate NEW projections inside
--   the trigger. Client sessions (authenticated JWT) are still subject to policy on the
--   statement as a whole; PayFast ITN and other server paths typically use the service
--   role or table owner, which bypass RLS — so this path is not subject to client-session
--   RLS the same way as browser/anon updates.
--
--   Implementation: plain PL/pgSQL trigger function with default SECURITY INVOKER
--   (no SECURITY DEFINER). Rationale: only assigns NEW.status from trusted transition
--   rules; no cross-table reads or privilege elevation needed — keep blast radius minimal.

-- ---------------------------------------------------------------------------
-- 1) bookings.status CHECK — full list from Epic 13.9 migration
--    20260420200000_epic13_story139_bookings_invoicing_statuses_v1.sql + ready_to_assign
-- ---------------------------------------------------------------------------

alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
    check (status in (
      'pending',
      'submitted','triaged',
      'quote_sent','quote_accepted','quote_rejected',
      'awaiting_payment','paid','ready_to_assign',
      'assigned','in_progress','completed',
      'cancelled','expired',
      'ready_to_invoice','invoiced','paid_invoice'
    ));

comment on constraint bookings_status_check on public.bookings is
  'VST-14 + Epic 13.9 + Epic 14.1: booking lifecycle including invoicing states '
  'ready_to_invoice, invoiced, paid_invoice, and Epic 14 ready_to_assign (walk-in paid queue). '
  'See docs/epic-12.md, epic-13.md, epic-14.md.';

-- ---------------------------------------------------------------------------
-- 2) BEFORE UPDATE OF payment_status — walk-in pending→paid → ready_to_assign (inline NEW)
-- ---------------------------------------------------------------------------

create or replace function public.bookings_walk_in_paid_to_ready_to_assign_fn()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if NEW.payment_status = 'paid'
     and OLD.payment_status is distinct from 'paid'
     and NEW.client_type = 'walk_in'
     and NEW.status not in ('cancelled', 'expired', 'completed')
  then
    NEW.status := 'ready_to_assign';
  end if;
  return NEW;
end;
$$;

comment on function public.bookings_walk_in_paid_to_ready_to_assign_fn() is
  'Epic 14 / Story 14.1: BEFORE UPDATE OF payment_status — sets status to ready_to_assign '
  'when payment becomes paid for non-terminal walk-in rows (Q19).';

drop trigger if exists bookings_walk_in_paid_to_ready_to_assign on public.bookings;

create trigger bookings_walk_in_paid_to_ready_to_assign
  before update of payment_status on public.bookings
  for each row
  execute function public.bookings_walk_in_paid_to_ready_to_assign_fn();

-- ---------------------------------------------------------------------------
-- 3) RLS — non-staff cannot persist status = ready_to_assign on direct UPDATE (US-A2)
--     Staff (admin/dispatcher via is_staff) unchanged.
-- ---------------------------------------------------------------------------

drop policy if exists bookings_update on public.bookings;

create policy bookings_update on public.bookings
  for update to authenticated
  using (customer_id = auth.uid() or public.is_staff(auth.uid()))
  with check (
    public.is_staff(auth.uid())
    or (
      customer_id = auth.uid()
      and (
        status is distinct from 'ready_to_assign'
        or (
          status = 'ready_to_assign'
          and client_type = 'walk_in'
          and payment_status = 'paid'
        )
      )
    )
  );

comment on policy bookings_update on public.bookings is
  'Epic 14.1: customers may update own rows; direct status=ready_to_assign denied except '
  'walk_in rows that are already paid (covers Q19 trigger outcome on same-statement payment updates). '
  'Staff may set any status.';
