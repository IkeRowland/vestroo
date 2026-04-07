-- VST-8: Chauffeurs may read bookings / booking_trips linked to their trips (minimal RLS path for guest PII).
-- Extend ops_audit_log with actor_role; allow chauffeur append-only inserts for field actions.

-- ---------------------------------------------------------------------------
-- Bookings: chauffeur linked via booking_trips → trips.chauffeur_id
-- ---------------------------------------------------------------------------
create policy bookings_select_chauffeur_linked on public.bookings
  for select to authenticated
  using (
    exists (
      select 1
      from public.booking_trips bt
      join public.trips t on t.id = bt.trip_id
      where bt.booking_id = bookings.id
        and t.chauffeur_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- booking_trips: chauffeur may read rows for own trips
-- ---------------------------------------------------------------------------
create policy booking_trips_select_chauffeur on public.booking_trips
  for select to authenticated
  using (
    exists (
      select 1 from public.trips t
      where t.id = booking_trips.trip_id
        and t.chauffeur_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- ops_audit_log: actor_role + chauffeur insert policy
-- ---------------------------------------------------------------------------
alter table public.ops_audit_log
  add column if not exists actor_role text not null default 'dispatcher';

comment on column public.ops_audit_log.actor_role is
  'Who performed the action: dispatcher, admin, or chauffeur (field app). Default dispatcher for legacy staff writes.';

alter table public.ops_audit_log
  add constraint ops_audit_log_actor_role_check
  check (actor_role in ('dispatcher', 'admin', 'chauffeur'));

drop policy if exists ops_audit_log_staff_insert on public.ops_audit_log;

create policy ops_audit_log_staff_insert on public.ops_audit_log
  for insert to authenticated
  with check (
    public.is_staff(auth.uid())
    and actor_id = auth.uid()
    and actor_role in ('dispatcher', 'admin')
  );

create policy ops_audit_log_chauffeur_insert on public.ops_audit_log
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'chauffeur'
    )
    and actor_id = auth.uid()
    and actor_role = 'chauffeur'
    and action in (
      'chauffeur_confirm_assignment',
      'chauffeur_update_trip_status',
      'chauffeur_contact_intent'
    )
  );
