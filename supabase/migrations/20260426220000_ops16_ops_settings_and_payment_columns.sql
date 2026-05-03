-- Epic 16 Theme N / US-N1 — `public.ops_settings` (bank EFT config) + `bookings` EFT receipt columns.
-- Traceability: docs/epic-16.md Theme N; docs/stories/16.11.story.md.
-- Read: staff via `is_staff`; write: admin only (inline `profiles` EXISTS per epic; ADR 0006 escape below).

create table if not exists public.ops_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

comment on table public.ops_settings is
  'Epic 16 Theme N / Q31: key/value ops configuration (e.g. bank_account); staff SELECT; admin UPDATE.';

-- Seed bank account row (placeholders — admin can populate in a later US)
insert into public.ops_settings (key, value)
values (
  'bank_account',
  '{
    "bank_name": "",
    "account_holder": "",
    "account_number": "",
    "branch_code": "",
    "reference_format": "VST-{booking_ref}"
  }'::jsonb
)
on conflict (key) do nothing;

alter table public.ops_settings enable row level security;

drop policy if exists ops_settings_staff_select on public.ops_settings;
create policy ops_settings_staff_select on public.ops_settings
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

drop policy if exists ops_settings_admin_update on public.ops_settings;
-- rls-lint-ok: Epic-16-US-N1-inline-profiles-EXISTS-per-epic-DDL-ADR-0006-Story-16.11
create policy ops_settings_admin_update on public.ops_settings
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

comment on policy ops_settings_admin_update on public.ops_settings is
  'Epic 16 US-N1: admin-only row updates. Inline profiles EXISTS per epic; ADR 0006 (Theme O) — see migration header.';

alter table public.bookings
  add column if not exists payment_received_at timestamptz null,
  add column if not exists payment_evidence_ref text null;

comment on column public.bookings.payment_received_at is
  'Epic 16 Theme N: when ops staff confirmed EFT receipt. Null = not yet received.';

comment on column public.bookings.payment_evidence_ref is
  'Epic 16 Theme N: bank statement reference or other staff-recorded evidence of payment.';
