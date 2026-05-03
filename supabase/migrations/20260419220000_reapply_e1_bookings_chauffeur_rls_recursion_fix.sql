-- Re-apply Epic 11 E1 chauffeur visibility fix for environments where
-- `20260418210000_e1_rls_bookings_booking_trips_recursion_fix.sql` did not run or the
-- policy was reverted to the pre-fix EXISTS form (causes "infinite recursion" on
-- `bookings` when staff or chauffeurs query `bookings` alongside `booking_trips` RLS).
--
-- Idempotent: CREATE OR REPLACE function; DROP + CREATE policy.
-- Traceability: docs/epic-11.md E1; docs/stories/11.1.story.md.

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
