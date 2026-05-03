-- SH.9.2: manifest lines for patterned / capacity-managed corporate shuttle runs.
-- ADR: docs/adr/0002-patterned-shuttle-domain-sh9-2.md · Gate: docs/epic-9.md#sh-9-1

create table public.service_run_manifest_entries (
  id uuid primary key default gen_random_uuid(),
  service_run_id uuid not null references public.service_runs (id) on delete cascade,
  sequence_order smallint not null check (sequence_order >= 0),
  booking_id uuid references public.bookings (id) on delete set null,
  passenger_profile_id uuid references public.profiles (id) on delete set null,
  guest_display_label text,
  entry_source text not null default 'manual' check (entry_source in ('manual', 'booking', 'ticket_sync')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (service_run_id, sequence_order)
);

create index idx_service_run_manifest_entries_run
  on public.service_run_manifest_entries (service_run_id);

create trigger service_run_manifest_entries_set_updated_at
  before update on public.service_run_manifest_entries
  for each row execute function public.set_updated_at();

comment on table public.service_run_manifest_entries is
  'SH.9.2: ordered manifest lines for a service run (corporate shuttle); not a public timetable product label.';
comment on column public.service_run_manifest_entries.sequence_order is
  'Pickup / manifest order on the run (0-based).';
comment on column public.service_run_manifest_entries.guest_display_label is
  'Staff-controlled display text when no passenger_profile_id; minimise PII in downstream logs.';
comment on column public.service_run_manifest_entries.entry_source is
  'manual | booking | ticket_sync — how the row was created.';

alter table public.service_run_manifest_entries enable row level security;

-- Staff: full access (dispatch / admin).
create policy service_run_manifest_entries_staff_all
  on public.service_run_manifest_entries
  for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- Chauffeur: read-only for runs they are assigned on the run row.
-- rls-lint-ok: Epic 16 Q35 terminal policy; service_runs EXISTS reviewed (K1 fixed tickets↔runs recursion separately)
create policy service_run_manifest_entries_chauffeur_select
  on public.service_run_manifest_entries
  for select to authenticated
  using (
    exists (
      select 1
      from public.service_runs sr
      where sr.id = service_run_id
        and sr.chauffeur_id is not null
        and sr.chauffeur_id = auth.uid()
    )
  );

-- Customer: read-only for own profile or own booking linkage.
-- rls-lint-ok: Epic 16 Q35 terminal policy; bookings EXISTS for customer linkage reviewed
create policy service_run_manifest_entries_customer_select
  on public.service_run_manifest_entries
  for select to authenticated
  using (
    passenger_profile_id = auth.uid()
    or exists (
      select 1
      from public.bookings b
      where b.id = booking_id
        and b.customer_id is not null
        and b.customer_id = auth.uid()
    )
  );
