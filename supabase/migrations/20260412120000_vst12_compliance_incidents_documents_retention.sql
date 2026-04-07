-- VST-12: Compliance incidents, vehicle/chauffeur compliance documents, retention hooks.
-- RLS: anon + non-staff authenticated denied; dispatcher + admin via is_staff().

-- ---------------------------------------------------------------------------
-- Retention / anonymisation hooks on existing domain tables (policy in docs)
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists retention_class text
    check (
      retention_class is null
      or retention_class in (
        'operational',
        'financial',
        'compliance_document',
        'cp_engagement_related',
        'marketing'
      )
    ),
  add column if not exists retention_until date,
  add column if not exists data_subject_anonymised_at timestamptz;

comment on column public.profiles.retention_class is
  'Engineering retention class label; purge automation may be deferred — see docs/compliance-and-safety.md.';
comment on column public.profiles.retention_until is
  'Optional calendar date after which row may be eligible for purge per org policy (doc-first).';
comment on column public.profiles.data_subject_anonymised_at is
  'Set when admin DSR anonymise completed; PII columns replaced with placeholders.';

alter table public.bookings
  add column if not exists retention_class text
    check (
      retention_class is null
      or retention_class in (
        'operational',
        'financial',
        'compliance_document',
        'cp_engagement_related',
        'marketing'
      )
    ),
  add column if not exists retention_until date;

comment on column public.bookings.retention_class is
  'Engineering retention class; aligns with docs/compliance-and-safety.md.';
comment on column public.bookings.retention_until is
  'Optional purge eligibility date (doc-first; automation optional post-MVP).';

-- ---------------------------------------------------------------------------
-- Incidents (operational / privacy / safety event log)
-- ---------------------------------------------------------------------------
create table public.compliance_incidents (
  id uuid primary key default gen_random_uuid(),
  category text not null
    check (
      category in (
        'safety',
        'privacy',
        'security',
        'operational',
        'data_handling',
        'other'
      )
    ),
  summary text not null,
  occurred_at timestamptz not null,
  reported_by uuid not null references public.profiles (id) on delete restrict,
  related_booking_id uuid references public.bookings (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  retention_class text
    check (
      retention_class is null
      or retention_class in (
        'operational',
        'financial',
        'compliance_document',
        'cp_engagement_related',
        'marketing'
      )
    ),
  retention_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.compliance_incidents is
  'VST-12: Staff-only incident log (safety, privacy, operations). Not a legal case system.';
comment on column public.compliance_incidents.metadata is
  'Operational ids, coarse labels, ticket refs. MUST NOT store raw PII (names, emails, phones, ID numbers, free-text customer narratives).';
comment on column public.compliance_incidents.category is
  'High-level classification for triage and reporting.';

create index compliance_incidents_occurred_at_idx
  on public.compliance_incidents (occurred_at desc);

create index compliance_incidents_related_booking_id_idx
  on public.compliance_incidents (related_booking_id)
  where related_booking_id is not null;

create trigger compliance_incidents_set_updated_at
  before update on public.compliance_incidents
  for each row execute function public.set_updated_at();

alter table public.compliance_incidents enable row level security;

create policy compliance_incidents_staff_select
  on public.compliance_incidents
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

create policy compliance_incidents_staff_insert
  on public.compliance_incidents
  for insert
  to authenticated
  with check (
    public.is_staff(auth.uid())
    and reported_by = auth.uid()
  );

create policy compliance_incidents_staff_update
  on public.compliance_incidents
  for update
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create policy compliance_incidents_staff_delete
  on public.compliance_incidents
  for delete
  to authenticated
  using (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- Vehicle compliance documents (separate table — see docs for polymorphic rationale)
-- ---------------------------------------------------------------------------
create table public.vehicle_compliance_documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles (id) on delete cascade,
  document_type text not null
    check (
      document_type in (
        'licence_disc',
        'insurance',
        'roadworthy',
        'registration',
        'other'
      )
    ),
  expiry_date date,
  storage_bucket text not null,
  storage_object_path text not null,
  notes text,
  retention_class text
    check (
      retention_class is null
      or retention_class in (
        'operational',
        'financial',
        'compliance_document',
        'cp_engagement_related',
        'marketing'
      )
    ),
  retention_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.vehicle_compliance_documents is
  'VST-12: Fleet compliance metadata; file bytes live in Supabase Storage (bucket + path).';
comment on column public.vehicle_compliance_documents.notes is
  'Staff-only operational notes; do not store unrelated third-party PII.';
comment on column public.vehicle_compliance_documents.storage_bucket is
  'Supabase Storage bucket name; signed URLs are server-generated only.';
comment on column public.vehicle_compliance_documents.storage_object_path is
  'Object path within bucket; never embed service keys in client.';

create index vehicle_compliance_documents_vehicle_id_idx
  on public.vehicle_compliance_documents (vehicle_id);

create index vehicle_compliance_documents_expiry_idx
  on public.vehicle_compliance_documents (expiry_date asc nulls last)
  where expiry_date is not null;

create trigger vehicle_compliance_documents_set_updated_at
  before update on public.vehicle_compliance_documents
  for each row execute function public.set_updated_at();

alter table public.vehicle_compliance_documents enable row level security;

create policy vehicle_compliance_documents_staff_select
  on public.vehicle_compliance_documents
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

create policy vehicle_compliance_documents_staff_insert
  on public.vehicle_compliance_documents
  for insert
  to authenticated
  with check (public.is_staff(auth.uid()));

create policy vehicle_compliance_documents_staff_update
  on public.vehicle_compliance_documents
  for update
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create policy vehicle_compliance_documents_staff_delete
  on public.vehicle_compliance_documents
  for delete
  to authenticated
  using (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- Chauffeur compliance documents (profiles.id with role chauffeur in app layer)
-- ---------------------------------------------------------------------------
create table public.chauffeur_compliance_documents (
  id uuid primary key default gen_random_uuid(),
  chauffeur_id uuid not null references public.profiles (id) on delete cascade,
  document_type text not null
    check (
      document_type in (
        'pdp',
        'drivers_licence',
        'background_check',
        'work_permit',
        'other'
      )
    ),
  expiry_date date,
  storage_bucket text not null,
  storage_object_path text not null,
  notes text,
  retention_class text
    check (
      retention_class is null
      or retention_class in (
        'operational',
        'financial',
        'compliance_document',
        'cp_engagement_related',
        'marketing'
      )
    ),
  retention_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.chauffeur_compliance_documents is
  'VST-12: Chauffeur credential metadata; chauffeur_id references profiles.id (role enforced in app).';
comment on column public.chauffeur_compliance_documents.notes is
  'Staff-only; avoid identity document numbers in plain text.';

create index chauffeur_compliance_documents_chauffeur_id_idx
  on public.chauffeur_compliance_documents (chauffeur_id);

create index chauffeur_compliance_documents_expiry_idx
  on public.chauffeur_compliance_documents (expiry_date asc nulls last)
  where expiry_date is not null;

create trigger chauffeur_compliance_documents_set_updated_at
  before update on public.chauffeur_compliance_documents
  for each row execute function public.set_updated_at();

alter table public.chauffeur_compliance_documents enable row level security;

create policy chauffeur_compliance_documents_staff_select
  on public.chauffeur_compliance_documents
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

create policy chauffeur_compliance_documents_staff_insert
  on public.chauffeur_compliance_documents
  for insert
  to authenticated
  with check (public.is_staff(auth.uid()));

create policy chauffeur_compliance_documents_staff_update
  on public.chauffeur_compliance_documents
  for update
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create policy chauffeur_compliance_documents_staff_delete
  on public.chauffeur_compliance_documents
  for delete
  to authenticated
  using (public.is_staff(auth.uid()));
