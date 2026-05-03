-- Epic 15 / Theme E — 15C.1: `comms_templates` + `comms_dispatch_rules` (registry + staff-only RLS).
-- Depends: Epic 13 email module (consumption in 15C.2); Epic 11 `public.is_staff(uuid)`.
-- Q23: template / SMS bodies are PR-reviewed (migrations / controlled seeds); 15C.3 adds `/ops/comms` editors.
-- Portal / account JWT: no SELECT/INSERT/UPDATE/DELETE policies — deny-by-default for non-staff `authenticated`.

-- ---------------------------------------------------------------------------
-- comms_templates
-- ---------------------------------------------------------------------------
create table public.comms_templates (
  id uuid primary key default gen_random_uuid(),
  event_key text not null
    check (length(trim(event_key)) > 0),
  channel text not null
    check (channel in ('email', 'sms')),
  subject text,
  body_html text,
  body_text text,
  sms_body text,
  version integer not null default 1
    check (version >= 1),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint comms_templates_event_channel_version_uniq unique (event_key, channel, version)
);

comment on table public.comms_templates is
  'Epic 15 / 15C.1: versioned outbound copy per event + channel; staff-only RLS. App validates `event_key` against `CommsEventKey` (src/types/comms.ts).';

comment on column public.comms_templates.event_key is
  'Logical comms event (e.g. quote_sent_account). Values constrained in TypeScript (`CommsEventKey`); DB enforces non-empty trimmed text.';

comment on column public.comms_templates.channel is
  'Delivery channel: `email` or `sms` (15B.4 vocabulary); extend via migration + type union in follow-on epics.';

comment on column public.comms_templates.subject is
  'Email subject line; nullable when channel is `sms` or template is SMS-only.';

comment on column public.comms_templates.body_html is
  'Rich email HTML; nullable for SMS-only templates.';

comment on column public.comms_templates.body_text is
  'Plain email body; nullable when unused.';

comment on column public.comms_templates.sms_body is
  'SMS body text; nullable for email-only templates.';

comment on column public.comms_templates.version is
  'Monotonic version per (event_key, channel); unique with those columns.';

comment on column public.comms_templates.active is
  'When true, row is a candidate for dispatch (15C.2). At most one active row per (event_key, channel) — partial unique index below.';

create unique index comms_templates_one_active_per_event_channel_idx
  on public.comms_templates (event_key, channel)
  where active;

create index comms_templates_event_channel_idx
  on public.comms_templates (event_key, channel);

create index comms_templates_event_channel_active_idx
  on public.comms_templates (event_key, channel)
  where active;

create trigger comms_templates_set_updated_at
  before update on public.comms_templates
  for each row execute function public.set_updated_at();

alter table public.comms_templates enable row level security;

-- Staff: read + write; no DELETE for authenticated (service_role bypasses for maintenance).
create policy comms_templates_staff_select
  on public.comms_templates
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

create policy comms_templates_staff_insert
  on public.comms_templates
  for insert
  to authenticated
  with check (public.is_staff(auth.uid()));

create policy comms_templates_staff_update
  on public.comms_templates
  for update
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- ---------------------------------------------------------------------------
-- comms_dispatch_rules
-- ---------------------------------------------------------------------------
create table public.comms_dispatch_rules (
  id uuid primary key default gen_random_uuid(),
  event_key text not null
    check (length(trim(event_key)) > 0),
  channel text not null
    check (channel in ('email', 'sms')),
  recipient_role text not null
    check (
      recipient_role in (
        'booker',
        'rider',
        'ops',
        'customer',
        'chauffeur',
        'dispatcher',
        'admin'
      )
    ),
  recipient_filter jsonb not null default '{}'::jsonb,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.comms_dispatch_rules is
  'Epic 15 / 15C.1: who receives which channel for an event; staff-only RLS. 15C.3 ops UI edits rules; 15C.2 evaluates at send time.';

comment on column public.comms_dispatch_rules.recipient_role is
  'Recipient class: booker/rider/customer (passenger-facing), ops (operations inbox), chauffeur (field), dispatcher/admin (staff). Aligns with 15C.3 vocabulary.';

comment on column public.comms_dispatch_rules.recipient_filter is
  'Optional JSON filters for 15C.3+ (e.g. account tags). `{}` means no extra filter beyond recipient_role.';

comment on column public.comms_dispatch_rules.active is
  'When true, rule participates in dispatch resolution. At most one active row per (event_key, channel, recipient_role).';

create unique index comms_dispatch_rules_active_event_channel_recipient_idx
  on public.comms_dispatch_rules (event_key, channel, recipient_role)
  where active;

create index comms_dispatch_rules_event_channel_idx
  on public.comms_dispatch_rules (event_key, channel);

create index comms_dispatch_rules_event_channel_active_idx
  on public.comms_dispatch_rules (event_key, channel)
  where active;

create trigger comms_dispatch_rules_set_updated_at
  before update on public.comms_dispatch_rules
  for each row execute function public.set_updated_at();

alter table public.comms_dispatch_rules enable row level security;

create policy comms_dispatch_rules_staff_select
  on public.comms_dispatch_rules
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

create policy comms_dispatch_rules_staff_insert
  on public.comms_dispatch_rules
  for insert
  to authenticated
  with check (public.is_staff(auth.uid()));

create policy comms_dispatch_rules_staff_update
  on public.comms_dispatch_rules
  for update
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));
