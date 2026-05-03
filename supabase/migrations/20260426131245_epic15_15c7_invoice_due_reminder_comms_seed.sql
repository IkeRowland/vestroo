-- Epic 15 / **15C.7** — minimal **`invoice_due_reminder`** matrix seed (email only v1; SMS not seeded).
-- Idempotent: skips when an active row already exists for the (event_key, channel[, recipient_role]) pair.

insert into public.comms_templates (
  event_key,
  channel,
  subject,
  body_html,
  body_text,
  sms_body,
  version,
  active
)
select 'invoice_due_reminder', 'email',
  'Invoice due reminder · {{booking_ref}}',
  null, null, null, 1, true
where not exists (
  select 1 from public.comms_templates t
  where t.event_key = 'invoice_due_reminder' and t.channel = 'email' and t.active = true
);

insert into public.comms_dispatch_rules (
  event_key, channel, recipient_role, recipient_filter, active
)
select 'invoice_due_reminder', 'email', 'customer', '{}'::jsonb, true
where not exists (
  select 1 from public.comms_dispatch_rules r
  where r.event_key = 'invoice_due_reminder' and r.channel = 'email' and r.active = true
);
