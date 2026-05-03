-- VST-5: Align profiles.role with epic (customer, chauffeur, dispatcher, admin).
-- Migrate legacy driver → chauffeur, manager → dispatcher; rename driver_id → chauffeur_id;
-- rename driver_schedules → chauffeur_schedules; update is_staff() and RLS predicates.

-- ---------------------------------------------------------------------------
-- Drop policies that reference driver_id or public.driver_schedules
-- ---------------------------------------------------------------------------
drop policy if exists driver_schedules_staff on public.driver_schedules;

drop policy if exists trips_select on public.trips;
drop policy if exists trips_insert_customer on public.trips;
drop policy if exists trips_update_parties on public.trips;
drop policy if exists bookings_select on public.bookings;
drop policy if exists bookings_insert on public.bookings;
drop policy if exists bookings_update on public.bookings;
drop policy if exists booking_trips_select on public.booking_trips;
drop policy if exists booking_trips_write on public.booking_trips;
drop policy if exists booking_trips_customer_insert on public.booking_trips;
drop policy if exists tickets_passenger on public.tickets;
drop policy if exists tickets_insert on public.tickets;
drop policy if exists tickets_update on public.tickets;
drop policy if exists conversations_parties on public.conversations;
drop policy if exists notifications_own on public.notifications;
drop policy if exists ratings_parties on public.ratings;
drop policy if exists ratings_insert_customer on public.ratings;

drop policy if exists vehicle_trackings_read on public.vehicle_trackings;
drop policy if exists vehicle_trackings_write on public.vehicle_trackings;
drop policy if exists vehicle_trackings_chauffeur_insert on public.vehicle_trackings;
drop policy if exists vehicle_trackings_chauffeur_update on public.vehicle_trackings;
drop policy if exists shared_itineraries_rw on public.shared_itineraries;
drop policy if exists key_tokens_rw on public.key_tokens;
drop policy if exists otp_sessions_rw on public.otp_sessions;
drop policy if exists service_runs_read_auth on public.service_runs;
drop policy if exists service_patterns_read_auth on public.service_patterns;
drop policy if exists chauffeur_assignments_driver_read on public.chauffeur_assignments;
drop policy if exists chauffeur_assignments_driver_update on public.chauffeur_assignments;
drop policy if exists driver_schedules_driver_rw on public.driver_schedules;

-- ---------------------------------------------------------------------------
-- profiles.role: data then CHECK constraint
-- ---------------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;

update public.profiles set role = 'chauffeur' where role = 'driver';
update public.profiles set role = 'dispatcher' where role = 'manager';

alter table public.profiles
  add constraint profiles_role_check check (role in ('customer', 'chauffeur', 'dispatcher', 'admin'));

-- ---------------------------------------------------------------------------
-- Staff helper: dispatch + admin only (chauffeurs use row-scoped policies)
-- ---------------------------------------------------------------------------
create or replace function public.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role in ('admin', 'dispatcher')
  );
$$;

-- ---------------------------------------------------------------------------
-- Column renames: chauffeur fulfilment identity
-- ---------------------------------------------------------------------------
alter table public.trips rename column driver_id to chauffeur_id;
alter table public.conversations rename column driver_id to chauffeur_id;
alter table public.ratings rename column driver_id to chauffeur_id;
alter table public.chauffeur_assignments rename column driver_id to chauffeur_id;
alter table public.driver_schedules rename column driver_id to chauffeur_id;
alter table public.shared_itineraries rename column driver_id to chauffeur_id;
alter table public.service_patterns rename column driver_ids to chauffeur_ids;
alter table public.service_runs rename column driver_id to chauffeur_id;

alter index if exists idx_trips_driver rename to idx_trips_chauffeur;

-- ---------------------------------------------------------------------------
-- Table rename: shift / roster rows for chauffeurs
-- ---------------------------------------------------------------------------
alter table public.driver_schedules rename to chauffeur_schedules;
alter trigger driver_schedules_set_updated_at on public.chauffeur_schedules
  rename to chauffeur_schedules_set_updated_at;

-- ---------------------------------------------------------------------------
-- RLS: vestoo domain staff (was 20260402133646) — chauffeur_schedules only
-- ---------------------------------------------------------------------------
create policy chauffeur_schedules_staff on public.chauffeur_schedules
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- RLS: booking & social (was 20260402133655), chauffeur_id
-- ---------------------------------------------------------------------------
create policy trips_select on public.trips
  for select to authenticated using (
    public.is_staff(auth.uid()) or customer_id = auth.uid() or chauffeur_id = auth.uid()
  );
create policy trips_insert_customer on public.trips
  for insert to authenticated with check (customer_id = auth.uid() or public.is_staff(auth.uid()));
create policy trips_update_parties on public.trips
  for update to authenticated using (
    public.is_staff(auth.uid()) or customer_id = auth.uid() or chauffeur_id = auth.uid()
  ) with check (true);

create policy bookings_select on public.bookings
  for select to authenticated using (customer_id = auth.uid() or public.is_staff(auth.uid()));
create policy bookings_insert on public.bookings
  for insert to authenticated with check (customer_id = auth.uid() or public.is_staff(auth.uid()));
create policy bookings_update on public.bookings
  for update to authenticated using (customer_id = auth.uid() or public.is_staff(auth.uid()));

-- rls-lint-ok: Epic 16 Q35 terminal policy; customer EXISTS on bookings reviewed (E1 chauffeur path uses helper; no 42P17 here)
create policy booking_trips_select on public.booking_trips
  for select to authenticated using (
    public.is_staff(auth.uid())
    or exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid())
  );
create policy booking_trips_write on public.booking_trips
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
-- rls-lint-ok: Epic 16 Q35 terminal policy; INSERT WITH CHECK cross-reads bookings+trips reviewed
create policy booking_trips_customer_insert on public.booking_trips
  for insert to authenticated with check (
    exists (select 1 from public.bookings b where b.id = booking_id and b.customer_id = auth.uid())
    and exists (select 1 from public.trips t where t.id = trip_id and t.customer_id = auth.uid())
  );

create policy tickets_passenger on public.tickets
  for select to authenticated using (passenger_id = auth.uid() or public.is_staff(auth.uid()));
create policy tickets_insert on public.tickets
  for insert to authenticated with check (passenger_id = auth.uid() or public.is_staff(auth.uid()));
create policy tickets_update on public.tickets
  for update to authenticated using (passenger_id = auth.uid() or public.is_staff(auth.uid()));

create policy conversations_parties on public.conversations
  for all to authenticated using (
    public.is_staff(auth.uid()) or customer_id = auth.uid() or chauffeur_id = auth.uid()
  ) with check (
    public.is_staff(auth.uid()) or customer_id = auth.uid() or chauffeur_id = auth.uid()
  );

create policy notifications_own on public.notifications
  for all to authenticated using (recipient_id = auth.uid() or public.is_staff(auth.uid()))
  with check (recipient_id = auth.uid() or public.is_staff(auth.uid()));

create policy ratings_parties on public.ratings
  for select to authenticated using (
    public.is_staff(auth.uid()) or customer_id = auth.uid() or chauffeur_id = auth.uid()
  );
create policy ratings_insert_customer on public.ratings
  for insert to authenticated with check (customer_id = auth.uid() or public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- RLS: tracking & chauffeur rows (was 20260402133703)
-- ---------------------------------------------------------------------------
-- rls-lint-ok: Epic 16 Q35 terminal policy; chauffeur_assignment EXISTS reviewed (no mutual RLS loop with vehicle_trackings)
create policy vehicle_trackings_read on public.vehicle_trackings
  for select to authenticated using (
    public.is_staff(auth.uid())
    or exists (
      select 1 from public.chauffeur_assignments c
      where c.id = chauffeur_assignment_id and c.chauffeur_id = auth.uid()
    )
  );
create policy vehicle_trackings_write on public.vehicle_trackings
  for all to authenticated using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
-- rls-lint-ok: Epic 16 Q35 terminal policy; chauffeur_assignment EXISTS reviewed
create policy vehicle_trackings_chauffeur_insert on public.vehicle_trackings
  for insert to authenticated with check (
    exists (
      select 1 from public.chauffeur_assignments c
      where c.id = chauffeur_assignment_id and c.chauffeur_id = auth.uid()
    )
  );
-- rls-lint-ok: Epic 16 Q35 terminal policy; chauffeur_assignment EXISTS in USING+WITH CHECK reviewed
create policy vehicle_trackings_chauffeur_update on public.vehicle_trackings
  for update to authenticated using (
    exists (
      select 1 from public.chauffeur_assignments c
      where c.id = chauffeur_assignment_id and c.chauffeur_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.chauffeur_assignments c
      where c.id = chauffeur_assignment_id and c.chauffeur_id = auth.uid()
    )
  );

create policy shared_itineraries_rw on public.shared_itineraries
  for all to authenticated using (
    public.is_staff(auth.uid()) or chauffeur_id = auth.uid()
  ) with check (
    public.is_staff(auth.uid()) or chauffeur_id = auth.uid()
  );

create policy key_tokens_rw on public.key_tokens
  for all to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()))
  with check (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy otp_sessions_rw on public.otp_sessions
  for all to authenticated using (user_id = auth.uid() or public.is_staff(auth.uid()))
  with check (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy service_runs_read_auth on public.service_runs
  for select to authenticated using (true);
create policy service_patterns_read_auth on public.service_patterns
  for select to authenticated using (true);

create policy chauffeur_assignments_chauffeur_read on public.chauffeur_assignments
  for select to authenticated using (chauffeur_id = auth.uid() or public.is_staff(auth.uid()));
create policy chauffeur_assignments_chauffeur_update on public.chauffeur_assignments
  for update to authenticated using (chauffeur_id = auth.uid())
  with check (chauffeur_id = auth.uid());

create policy chauffeur_schedules_chauffeur_rw on public.chauffeur_schedules
  for all to authenticated using (
    public.is_staff(auth.uid()) or chauffeur_id = auth.uid()
  ) with check (
    public.is_staff(auth.uid()) or chauffeur_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Vestroo vocabulary: table comments (service point / pattern / run / booking)
-- ---------------------------------------------------------------------------
comment on table public.service_points is
  'Pickup, drop-off, or waypoint locations on a service route (Vestroo domain: service point).';
comment on table public.service_routes is
  'Logical or marketed corridors linking service points; ties to pricing and patterns.';
comment on table public.service_route_points is
  'Ordered service points belonging to a service route.';
comment on table public.service_patterns is
  'Recurring template (times, days, default vehicles/chauffeurs) for scheduled operations.';
comment on table public.service_runs is
  'Operational instance of a service pattern on a calendar date (a run).';
comment on table public.chauffeur_assignments is
  'Assignment of a chauffeur and vehicle to a service run for a time window.';
comment on table public.chauffeur_schedules is
  'Chauffeur shift / roster row for a date and vehicle (operations scheduling).';
comment on table public.tickets is
  'Seat commitments on a scheduled service run between two service points; maps to passenger journey on a run. Prefer booking/trip for premium charter context.';
comment on table public.trip_seats is
  'Seat inventory segment on a service run between two service points.';
comment on table public.bookings is
  'Customer booking header (web flow may use guest fields; links to trips when used).';
comment on table public.trips is
  'Fulfilment trip leg: customer, chauffeur, vehicle, schedule link, and status.';
comment on table public.vehicle_trackings is
  'Live or recent vehicle location tied to a chauffeur assignment and service run.';
