-- Epic 16 Theme K / US-K1 — REMEDIATION: eliminate infinite recursion on
-- SELECT for `service_runs` ↔ `tickets` (live red banner on /ops/fulfil:
-- "infinite recursion detected in policy for relation service_runs",
-- SQLSTATE 42P17).
--
-- Root cause (verified against upstream policy bodies):
--   - `supabase/migrations/20260418150000_sh94_patterned_run_realtime.sql`
--     installs `service_runs_select_party` whose body contains
--     `EXISTS (… from public.tickets …)` (5-clause OR — chauffeur on linked
--     trip; customer on linked trip; customer via booking_trips → bookings;
--     ticket passenger; ticket-via-booking).
--   - `supabase/migrations/20260418140000_sh93_service_run_capacity_holds.sql`
--     installs `tickets_chauffeur_run_select` whose body contains
--     `EXISTS (… from public.service_runs …)`.
--   Selecting `service_runs` evaluates `tickets` policies (which select
--   `service_runs`) → PostgreSQL "infinite recursion detected in policy".
--
-- Fix: encapsulate the cross-table visibility checks in two
-- `SECURITY DEFINER STABLE` helpers (per the Epic 11 E1 canonical pattern in
-- `20260418210000_e1_rls_bookings_booking_trips_recursion_fix.sql` —
-- `booking_is_visible_to_chauffeur_via_trips`). SECURITY DEFINER makes the
-- helper run with the owner's privileges, so its internal `select` does not
-- re-enter caller-side RLS on the joined table. STABLE because the bodies
-- read from tables (not IMMUTABLE).
--
-- Q35 (epic-16) defers retroactive rewrite of all RLS policies — this
-- migration touches ONLY the named policy pair and the two helpers required
-- by US-K1. Original 5-clause OR semantics from `service_runs_select_party`
-- (incl. the `tickets.ticket_inventory_state in ('legacy','hold','confirmed')`
-- filter on the two ticket-side clauses) are preserved verbatim — no policy
-- drift beyond breaking the recursion.
--
-- Helper comments cite `docs/adr/0006-rls-cross-table-helpers.md` (Theme O,
-- planned in US-O1). The ADR file may not yet be on `main` when this
-- migration merges; the path string is stable so US-O1 ships the doc only,
-- with no retro-edit of these helper comments (per story Dependencies note).

-- ---------------------------------------------------------------------------
-- 1) Drop the recursive policies (idempotent guards in case of partial apply).
-- ---------------------------------------------------------------------------
drop policy if exists service_runs_select_party on public.service_runs;
drop policy if exists tickets_chauffeur_run_select on public.tickets;

-- ---------------------------------------------------------------------------
-- 2) Helper: service_run_is_visible_to_party(uuid)
--    Encapsulates the 5-clause OR from SH.9.4 `service_runs_select_party`.
--    SECURITY DEFINER + set search_path = public — same hardening as E1.
-- ---------------------------------------------------------------------------
create or replace function public.service_run_is_visible_to_party(p_service_run_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.trips t
      where t.service_run_id = p_service_run_id
        and t.chauffeur_id = auth.uid()
    )
    or exists (
      select 1 from public.trips t
      where t.service_run_id = p_service_run_id
        and t.customer_id = auth.uid()
    )
    or exists (
      select 1
      from public.trips t
      join public.booking_trips bt on bt.trip_id = t.id
      join public.bookings b on b.id = bt.booking_id
      where t.service_run_id = p_service_run_id
        and b.customer_id = auth.uid()
    )
    or exists (
      select 1 from public.tickets tk
      where tk.service_run_id = p_service_run_id
        and tk.passenger_id = auth.uid()
        and tk.ticket_inventory_state in ('legacy', 'hold', 'confirmed')
    )
    or exists (
      select 1 from public.tickets tk
      join public.bookings b on b.id = tk.booking_id
      where tk.service_run_id = p_service_run_id
        and b.customer_id = auth.uid()
        and tk.ticket_inventory_state in ('legacy', 'hold', 'confirmed')
    );
$$;

comment on function public.service_run_is_visible_to_party(uuid) is
  'Epic 16 K1 RLS helper: true when the current user is a party (chauffeur, '
  'customer, ticket passenger, or ticket-via-booking customer) on the given '
  'service_run. SECURITY DEFINER avoids re-entering tickets RLS from '
  'service_runs policies (recursion break). Convention: '
  'docs/adr/0006-rls-cross-table-helpers.md (Theme O).';

revoke all on function public.service_run_is_visible_to_party(uuid) from public;
grant execute on function public.service_run_is_visible_to_party(uuid) to authenticated;
grant execute on function public.service_run_is_visible_to_party(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 3) Helper: ticket_is_visible_to_run_chauffeur(uuid)
--    Single-direction lookup; SECURITY DEFINER prevents re-entering
--    service_runs RLS for the chauffeur visibility path.
-- ---------------------------------------------------------------------------
create or replace function public.ticket_is_visible_to_run_chauffeur(p_ticket_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tickets t
    join public.service_runs sr on sr.id = t.service_run_id
    where t.id = p_ticket_id
      and sr.chauffeur_id = auth.uid()
  );
$$;

comment on function public.ticket_is_visible_to_run_chauffeur(uuid) is
  'Epic 16 K1 RLS helper: true when the current user is the chauffeur on the '
  'service_run linked to the ticket. SECURITY DEFINER avoids re-entering '
  'service_runs RLS from tickets policies (recursion break). Convention: '
  'docs/adr/0006-rls-cross-table-helpers.md (Theme O).';

revoke all on function public.ticket_is_visible_to_run_chauffeur(uuid) from public;
grant execute on function public.ticket_is_visible_to_run_chauffeur(uuid) to authenticated;
grant execute on function public.ticket_is_visible_to_run_chauffeur(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4) Recreate policies via the helpers (no inline cross-table EXISTS).
-- ---------------------------------------------------------------------------
create policy service_runs_select_party on public.service_runs
  for select to authenticated
  using (public.service_run_is_visible_to_party(id));

comment on policy service_runs_select_party on public.service_runs is
  'Epic 16 K1: SELECT for chauffeur/customer/ticket party tied to this run '
  'via SECURITY DEFINER helper service_run_is_visible_to_party (recursion '
  'fix); staff use service_runs_staff. Original semantics from SH.9.4.';

create policy tickets_chauffeur_run_select on public.tickets
  for select to authenticated
  using (public.ticket_is_visible_to_run_chauffeur(id));

comment on policy tickets_chauffeur_run_select on public.tickets is
  'Epic 16 K1: chauffeur SELECT on tickets for runs they are assigned to '
  'via SECURITY DEFINER helper ticket_is_visible_to_run_chauffeur '
  '(recursion fix). Original semantics from SH.9.3 AC8.';
