-- SH.9.4: Tighten `service_runs` SELECT for Realtime; publish run + assignment rows.
-- ADR: docs/adr/0004-patterned-run-realtime-sh9-4.md · Gate: docs/epic-9.md#sh-9-1 (go 2026-04-17).

-- Replace open authenticated read (unsafe for Realtime fan-out).
drop policy if exists service_runs_read_auth on public.service_runs;

-- Party-scoped SELECT: staff already covered by `service_runs_staff` (FOR ALL).
-- Chauffeurs / customers / ticket passengers see runs they are bound to.
create policy service_runs_select_party on public.service_runs
  for select to authenticated using (
    exists (
      select 1 from public.trips t
      where t.service_run_id = service_runs.id
        and t.chauffeur_id = auth.uid()
    )
    or exists (
      select 1 from public.trips t
      where t.service_run_id = service_runs.id
        and t.customer_id = auth.uid()
    )
    or exists (
      select 1
      from public.trips t
      join public.booking_trips bt on bt.trip_id = t.id
      join public.bookings b on b.id = bt.booking_id
      where t.service_run_id = service_runs.id
        and b.customer_id = auth.uid()
    )
    or exists (
      select 1 from public.tickets tk
      where tk.service_run_id = service_runs.id
        and tk.passenger_id = auth.uid()
        and tk.ticket_inventory_state in ('legacy', 'hold', 'confirmed')
    )
    or exists (
      select 1 from public.tickets tk
      join public.bookings b on b.id = tk.booking_id
      where tk.service_run_id = service_runs.id
        and b.customer_id = auth.uid()
        and tk.ticket_inventory_state in ('legacy', 'hold', 'confirmed')
    )
  );

comment on policy service_runs_select_party on public.service_runs is
  'SH.9.4: SELECT for chauffeur/customer/ticket party tied to this run; staff use service_runs_staff.';

-- Realtime: expose rows to authorised subscribers only (RLS filters payloads).
alter publication supabase_realtime add table public.service_runs;
alter publication supabase_realtime add table public.chauffeur_assignments;
