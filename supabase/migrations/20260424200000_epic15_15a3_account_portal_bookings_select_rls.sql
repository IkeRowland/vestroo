-- Epic 15 / Story 15A.3 — Account portal: members can SELECT bookings (and trip join chain)
-- for rows where `bookings.customer_account_id` is an account they belong to.
--
-- Baseline `bookings_select` remains owner + staff; this policy ORs in account-scoped reads.
-- Uses `public.account_ids_for_current_user()` (SECURITY DEFINER) to avoid member RLS recursion.

create policy bookings_select_account_member
  on public.bookings
  for select
  to authenticated
  using (
    customer_account_id is not null
    and customer_account_id in (select public.account_ids_for_current_user())
  );

comment on policy bookings_select_account_member on public.bookings is
  'Epic 15 15A.3: account members may read bookings linked to their customer_accounts.';

create policy booking_trips_select_account_member
  on public.booking_trips
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_trips.booking_id
        and b.customer_account_id is not null
        and b.customer_account_id in (select public.account_ids_for_current_user())
    )
  );

comment on policy booking_trips_select_account_member on public.booking_trips is
  'Epic 15 15A.3: account members may read booking_trips for account-linked bookings.';

create policy trips_select_account_member
  on public.trips
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.booking_trips bt
      join public.bookings b on b.id = bt.booking_id
      where bt.trip_id = trips.id
        and b.customer_account_id is not null
        and b.customer_account_id in (select public.account_ids_for_current_user())
    )
  );

comment on policy trips_select_account_member on public.trips is
  'Epic 15 15A.3: account members may read trips attached to account-linked bookings (list embeds).';
