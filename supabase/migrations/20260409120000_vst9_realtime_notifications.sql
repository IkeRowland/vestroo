-- VST-9: operational notification typing, chauffeur→customer notification insert, Realtime publication

alter table public.notifications
  add column if not exists kind text not null default 'general',
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists channel text not null default 'in_app';

alter table public.notifications
  add constraint notifications_kind_check check (
    kind in ('general', 'assignment', 'change', 'no_show', 'trip_status')
  );

comment on column public.notifications.kind is
  'Operational category: assignment, change, no_show, trip_status, general (VST-9).';
comment on column public.notifications.metadata is
  'Non-PII context: trip_id, status labels, etc. (VST-9).';
comment on column public.notifications.channel is
  'Delivery channel; MVP uses in_app only (VST-9).';

-- Chauffeurs may insert a notification row for a trip customer they currently serve (RLS).
-- rls-lint-ok: Epic 16 Q35 terminal policy; trips EXISTS for recipient match reviewed
create policy notifications_chauffeur_customer_insert on public.notifications
  for insert to authenticated
  with check (
    exists (
      select 1 from public.trips t
      where t.chauffeur_id = auth.uid()
        and t.customer_id is not null
        and t.customer_id = recipient_id
    )
  );

-- Supabase Realtime: expose fulfilment rows to authorised subscribers (RLS still filters payloads).
alter publication supabase_realtime add table public.vehicle_trackings;
alter publication supabase_realtime add table public.trips;
