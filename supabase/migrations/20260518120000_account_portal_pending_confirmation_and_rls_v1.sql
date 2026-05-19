-- Account Client portal: `pending_confirmation` status + RLS so confirmed account bookings
-- can surface assigned chauffeur + fleet vehicle to portal members (read-only).

-- ---------------------------------------------------------------------------
-- 1) bookings.status CHECK — add pending_confirmation
-- ---------------------------------------------------------------------------

alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
    check (status in (
      'pending',
      'pending_confirmation',
      'submitted','triaged',
      'quote_sent','quote_accepted','quote_rejected',
      'awaiting_payment','paid','ready_to_assign',
      'assigned','in_progress','completed',
      'cancelled','expired',
      'ready_to_invoice','invoiced','paid_invoice'
    ));

comment on constraint bookings_status_check on public.bookings is
  'VST-14 + Epic 13.9 + Epic 14.1 + account portal: includes pending_confirmation '
  '(organisation portal submission — ops confirms after trip + saved quote).';

-- ---------------------------------------------------------------------------
-- 2) RLS — account members read chauffeur profile for confirmed account trips only
-- ---------------------------------------------------------------------------

drop policy if exists profiles_select_chauffeur_for_account_booking_trip on public.profiles;

create policy profiles_select_chauffeur_for_account_booking_trip
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.trips t
      join public.booking_trips bt on bt.trip_id = t.id
      join public.bookings b on b.id = bt.booking_id
      where t.chauffeur_id = profiles.id
        and b.client_type = 'account_client'
        and b.customer_account_id is not null
        and b.customer_account_id in (select public.account_ids_for_current_user())
        and b.status in (
          'assigned',
          'in_progress',
          'completed',
          'ready_to_invoice',
          'invoiced',
          'paid',
          'paid_invoice'
        )
    )
  );

comment on policy profiles_select_chauffeur_for_account_booking_trip on public.profiles is
  'Account portal: members may read the assigned chauffeur profile for their organisation '
  'bookings once ops has confirmed dispatch (post–pending_confirmation pipeline).';

-- ---------------------------------------------------------------------------
-- 3) RLS — account members read fleet vehicle on those same trips
-- ---------------------------------------------------------------------------

drop policy if exists vehicles_select_account_booking_trip on public.vehicles;

create policy vehicles_select_account_booking_trip
  on public.vehicles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.trips t
      join public.booking_trips bt on bt.trip_id = t.id
      join public.bookings b on b.id = bt.booking_id
      where t.vehicle_id = vehicles.id
        and b.client_type = 'account_client'
        and b.customer_account_id is not null
        and b.customer_account_id in (select public.account_ids_for_current_user())
        and b.status in (
          'assigned',
          'in_progress',
          'completed',
          'ready_to_invoice',
          'invoiced',
          'paid',
          'paid_invoice'
        )
    )
  );

comment on policy vehicles_select_account_booking_trip on public.vehicles is
  'Account portal: members may read the assigned vehicle row for confirmed organisation bookings.';
