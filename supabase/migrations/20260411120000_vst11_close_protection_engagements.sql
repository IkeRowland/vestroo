-- VST-11: Close protection engagements — staff-only coordination records linked to bookings / trips.
-- RLS: no access for anon/authenticated non-staff; dispatcher/admin via is_staff().

create table public.close_protection_engagements (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'completed', 'cancelled')),
  coordination_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.profiles (id) on delete restrict
);

comment on table public.close_protection_engagements is
  'VST-11: High-level close protection coordination per booking; staff-only. Does not duplicate protectee identity beyond the booking row.';

comment on column public.close_protection_engagements.booking_id is
  'Stable anchor; required for every engagement.';

comment on column public.close_protection_engagements.trip_id is
  'Optional fulfilment leg; set when dispatch links a trip (e.g. assign_booking_to_run) or manually by staff. Nullable until a trip exists.';

comment on column public.close_protection_engagements.status is
  'draft: being prepared; active: coordination in progress; completed: engagement closed successfully; cancelled: engagement voided.';

comment on column public.close_protection_engagements.coordination_notes is
  'Internal staff handover text only. MUST NOT contain passport/ID numbers, full medical data, or unrelated third-party PII; see docs/close-protection-engagements.md.';

comment on column public.close_protection_engagements.created_by is
  'Staff profile (profiles.id = auth.users.id) who created the row.';

create index close_protection_engagements_booking_id_idx
  on public.close_protection_engagements (booking_id);

create index close_protection_engagements_trip_id_idx
  on public.close_protection_engagements (trip_id)
  where trip_id is not null;

create index close_protection_engagements_updated_at_idx
  on public.close_protection_engagements (updated_at desc);

create trigger close_protection_engagements_set_updated_at
  before update on public.close_protection_engagements
  for each row execute function public.set_updated_at();

alter table public.close_protection_engagements enable row level security;

-- Named policies for PR review (staging-and-promotion.md).
-- No policies for anon → deny-all.

create policy close_protection_engagements_staff_select
  on public.close_protection_engagements
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

create policy close_protection_engagements_staff_insert
  on public.close_protection_engagements
  for insert
  to authenticated
  with check (
    public.is_staff(auth.uid())
    and created_by = auth.uid()
  );

create policy close_protection_engagements_staff_update
  on public.close_protection_engagements
  for update
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create policy close_protection_engagements_staff_delete
  on public.close_protection_engagements
  for delete
  to authenticated
  using (public.is_staff(auth.uid()));
