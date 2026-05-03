-- Epic 16 Theme G / US-G1 — `public.ops_alerts` (Q28 v1 kinds + staff RLS).
-- Traceability: docs/epic-16.md Theme G; docs/stories/16.10.story.md.
-- Inserts: service_role / bypass only — no `INSERT` policy for `authenticated`.
-- Dismiss: server-action layer (admin check); no separate dismiss policy in US-G1.

create table if not exists public.ops_alerts (
  id uuid primary key default gen_random_uuid(),
  kind text not null
    check (kind in (
      'maintenance_due',
      'license_expiring',
      'prdp_expiring',
      'quote_expiring_soon',
      'email_retry_failed',
      'delayed_trip',
      'overdue_invoice'
    )),
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high', 'critical')),
  subject_table text not null,
  subject_id uuid,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles (id) on delete set null,
  dismissed_at timestamptz,
  dismissed_by uuid references public.profiles (id) on delete set null
);

comment on table public.ops_alerts is
  'Epic 16 Theme G / Q28: operational alert queue; v1 kinds CHECK-constrained; staff SELECT/UPDATE; inserts via service_role generators (US-G2).';

create index if not exists idx_ops_alerts_open
  on public.ops_alerts (created_at desc)
  where acknowledged_at is null and dismissed_at is null;

create index if not exists idx_ops_alerts_subject
  on public.ops_alerts (subject_table, subject_id);

alter table public.ops_alerts enable row level security;

drop policy if exists ops_alerts_staff_select on public.ops_alerts;
create policy ops_alerts_staff_select on public.ops_alerts
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

drop policy if exists ops_alerts_staff_acknowledge on public.ops_alerts;
create policy ops_alerts_staff_acknowledge on public.ops_alerts
  for update
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));
