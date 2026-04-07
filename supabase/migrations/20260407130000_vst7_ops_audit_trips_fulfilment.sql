-- VST-7: append-only ops audit log; trip columns for run linkage and delay notes; guest fulfilment (nullable trips.customer_id).

-- ---------------------------------------------------------------------------
-- ops_audit_log: dispatcher mutations (minimal PII — ids + action labels)
-- ---------------------------------------------------------------------------
create table public.ops_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  entity text not null,
  entity_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.ops_audit_log is
  'Append-only dispatcher/admin action log; no updates/deletes via API. Minimise PII in payload (prefer UUIDs).';
comment on column public.ops_audit_log.payload is
  'Structured context (e.g. prior_vehicle_id, new_status). Avoid names, emails, phones.';

create index idx_ops_audit_log_created on public.ops_audit_log (created_at desc);
create index idx_ops_audit_log_entity on public.ops_audit_log (entity, entity_id);

alter table public.ops_audit_log enable row level security;

create policy ops_audit_log_staff_select on public.ops_audit_log
  for select to authenticated
  using (public.is_staff(auth.uid()));

create policy ops_audit_log_staff_insert on public.ops_audit_log
  for insert to authenticated
  with check (
    public.is_staff(auth.uid())
    and actor_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- trips: guest customers, service run linkage, delay fields
-- ---------------------------------------------------------------------------
alter table public.trips alter column customer_id drop not null;

comment on column public.trips.customer_id is
  'Authenticated customer when present; null for guest web bookings linked only via booking_trips.';

alter table public.trips
  add column if not exists service_run_id uuid references public.service_runs (id) on delete set null,
  add column if not exists ops_delay_note text,
  add column if not exists ops_revised_time_end_estimate timestamptz;

comment on column public.trips.service_run_id is
  'Operational service run this fulfilment trip is tied to (VST-7 dispatch).';
comment on column public.trips.ops_delay_note is
  'Dispatcher-recorded delay context (non-PII preferred).';
comment on column public.trips.ops_revised_time_end_estimate is
  'Dispatcher override for expected trip end when delayed.';
