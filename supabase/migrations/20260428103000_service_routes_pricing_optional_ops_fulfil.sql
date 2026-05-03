-- Ops fulfilment: scheduling routes do not require catalog `vehicle_pricings`.
-- Quote / ride pricing stays separate from operational `service_runs` windows.

alter table public.service_routes
  alter column pricing_config_id drop not null;

comment on column public.service_routes.pricing_config_id is
  'Optional link to vehicle_pricings. NULL for operational routes used only for scheduling (VST-6 fulfilment fixtures, ad-hoc ops routes).';

-- Idempotent VST-6 fixtures (same UUIDs as 20260406121000). Earlier migration may have skipped when pricing was empty.
do $$
declare
  vc_id uuid;
  corp_route uuid := 'a0000001-0000-4000-8000-000000000001'::uuid;
  exp_route uuid := 'a0000001-0000-4000-8000-000000000002'::uuid;
  corp_pattern uuid := 'b0000001-0000-4000-8000-000000000001'::uuid;
  exp_pattern uuid := 'b0000001-0000-4000-8000-000000000002'::uuid;
begin
  select c.id
    into vc_id
  from public.vehicle_categories c
  order by c.name
  limit 1;

  insert into public.service_routes (
    id, name, description, route_coordinates, total_distance, estimated_duration,
    vehicle_category_id, pricing_config_id, status
  )
  values (
    corp_route,
    'VST-6 Seed — Corporate Sandton circuit',
    'Demonstrates corporate contracted service route vocabulary (not a public-transit fare).',
    '[]'::jsonb,
    12.5,
    28,
    vc_id,
    null,
    'active'
  )
  on conflict (id) do nothing;

  insert into public.service_routes (
    id, name, description, route_coordinates, total_distance, estimated_duration,
    vehicle_category_id, pricing_config_id, status
  )
  values (
    exp_route,
    'VST-6 Seed — Winelands experience template',
    'Stub template for curated experience / tour packages (VST-10 expands this).',
    '[]'::jsonb,
    85,
    480,
    vc_id,
    null,
    'active'
  )
  on conflict (id) do nothing;

  insert into public.service_patterns (
    id, service_route_id, vehicle_ids, chauffeur_ids, trips_per_day,
    daily_start_time, daily_end_time, status, effective_date, expiry_date, driver_assignments
  )
  values (
    corp_pattern,
    corp_route,
    '{}'::uuid[],
    '{}'::uuid[],
    4,
    '06:00',
    '22:00',
    'active',
    current_date,
    null,
    '[]'::jsonb
  )
  on conflict (id) do nothing;

  insert into public.service_patterns (
    id, service_route_id, vehicle_ids, chauffeur_ids, trips_per_day,
    daily_start_time, daily_end_time, status, effective_date, expiry_date, driver_assignments
  )
  values (
    exp_pattern,
    exp_route,
    '{}'::uuid[],
    '{}'::uuid[],
    1,
    '08:00',
    '18:00',
    'active',
    current_date,
    null,
    '[]'::jsonb
  )
  on conflict (id) do nothing;
end $$;
