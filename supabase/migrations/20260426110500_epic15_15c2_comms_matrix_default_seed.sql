-- Epic 15 / **15C.2** — default active `comms_templates` + `comms_dispatch_rules` for matrix-driven sends.
-- Idempotent: skips when an active row already exists for the (event_key, channel[, recipient_role]) pair.
-- Template `body_html` left NULL so apps use React/HTML fallbacks until ops seeds copy (**Q23**).

-- ---------------------------------------------------------------------------
-- comms_templates (subject only; bodies from code fallback until PR-seeded HTML)
-- ---------------------------------------------------------------------------
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
select 'quote_sent_account', 'email',
  'Trip confirmation and quote · {{booking_ref}}',
  null, null, null, 1, true
where not exists (
  select 1 from public.comms_templates t
  where t.event_key = 'quote_sent_account' and t.channel = 'email' and t.active = true
);

insert into public.comms_templates (
  event_key, channel, subject, body_html, body_text, sms_body, version, active
)
select 'quote_sent_walk_in', 'email',
  'Your Vestroo quote · {{booking_ref}}',
  null, null, null, 1, true
where not exists (
  select 1 from public.comms_templates t
  where t.event_key = 'quote_sent_walk_in' and t.channel = 'email' and t.active = true
);

insert into public.comms_templates (
  event_key, channel, subject, body_html, body_text, sms_body, version, active
)
select 'payment_received', 'email',
  'Payment received — booking confirmed · {{booking_ref}}',
  null, null, null, 1, true
where not exists (
  select 1 from public.comms_templates t
  where t.event_key = 'payment_received' and t.channel = 'email' and t.active = true
);

-- ---------------------------------------------------------------------------
-- comms_dispatch_rules — customer-facing email for each event
-- ---------------------------------------------------------------------------
insert into public.comms_dispatch_rules (
  event_key, channel, recipient_role, recipient_filter, active
)
select 'quote_sent_account', 'email', 'customer', '{}'::jsonb, true
where not exists (
  select 1 from public.comms_dispatch_rules r
  where r.event_key = 'quote_sent_account' and r.channel = 'email' and r.active = true
);

insert into public.comms_dispatch_rules (
  event_key, channel, recipient_role, recipient_filter, active
)
select 'quote_sent_walk_in', 'email', 'customer', '{}'::jsonb, true
where not exists (
  select 1 from public.comms_dispatch_rules r
  where r.event_key = 'quote_sent_walk_in' and r.channel = 'email' and r.active = true
);

insert into public.comms_dispatch_rules (
  event_key, channel, recipient_role, recipient_filter, active
)
select 'payment_received', 'email', 'customer', '{}'::jsonb, true
where not exists (
  select 1 from public.comms_dispatch_rules r
  where r.event_key = 'payment_received' and r.channel = 'email' and r.active = true
);
