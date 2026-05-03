-- Epic 11 E1 / Theme A: eliminate infinite recursion on SELECT for bookings ↔ booking_trips.
--
-- Root cause: policy `bookings_select_chauffeur_linked` (VST-8) used an EXISTS over
-- `booking_trips` while `booking_trips_select` uses EXISTS over `bookings` for customers.
-- Evaluating either table re-entered the other’s policies → PostgreSQL "infinite recursion
-- detected in policy for relation" errors.
--
-- Fix: chauffeur visibility via `booking_trips` → `trips` is computed in a narrow
-- STABLE SECURITY DEFINER function so the policy body does not re-enter RLS on
-- `booking_trips` / `trips`. Staff continue to use `public.is_staff(auth.uid())` via
-- existing `bookings_select` / `booking_trips_select` policies (no client bypass).

create or replace function public.booking_is_visible_to_chauffeur_via_trips(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.booking_trips bt
    inner join public.trips t on t.id = bt.trip_id
    where bt.booking_id = p_booking_id
      and t.chauffeur_id = auth.uid()
  );
$$;

comment on function public.booking_is_visible_to_chauffeur_via_trips(uuid) is
  'E1 RLS helper: true when the current user is the chauffeur on a trip linked to the booking. '
  'SECURITY DEFINER avoids re-evaluating booking_trips RLS from bookings policies (recursion break).';

revoke all on function public.booking_is_visible_to_chauffeur_via_trips(uuid) from public;
grant execute on function public.booking_is_visible_to_chauffeur_via_trips(uuid) to authenticated;
grant execute on function public.booking_is_visible_to_chauffeur_via_trips(uuid) to service_role;

drop policy if exists bookings_select_chauffeur_linked on public.bookings;

create policy bookings_select_chauffeur_linked on public.bookings
  for select to authenticated
  using (public.booking_is_visible_to_chauffeur_via_trips(id));
