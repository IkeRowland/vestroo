-- Idempotent repair: hosted DBs may have `comms_templates` from 15C.2 but zero `comms_dispatch_rules`
-- rows (e.g. partial migration apply). Re-assert the Epic 15 / 15C.2 customer email rules.

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
