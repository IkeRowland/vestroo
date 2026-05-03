-- VST-6: Seed one corporate-oriented service pattern and one experience-package template pattern.
-- Historical: required vehicle_pricings at migrate time (skipped if empty). As of
-- `20260428103000_service_routes_pricing_optional_ops_fulfil.sql`, routes may omit pricing; use that
-- migration or **Add default patterns** in ops Service runs when pricing was never loaded.

do $$
declare
  vp_id uuid;
  vc_id uuid;
  corp_route uuid := 'a0000001-0000-4000-8000-000000000001'::uuid;
  exp_route uuid := 'a0000001-0000-4000-8000-000000000002'::uuid;
  corp_pattern uuid := 'b0000001-0000-4000-8000-000000000001'::uuid;
  exp_pattern uuid := 'b0000001-0000-4000-8000-000000000002'::uuid;
begin
  select vp.id, vp.vehicle_category_id
    into vp_id, vc_id
  from public.vehicle_pricings vp
  limit 1;

  if vp_id is null then
    raise notice 'VST-6 seed skipped: no vehicle_pricings row (load core vehicle/pricing data first).';
    return;
  end if;

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
    vp_id,
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
    vp_id,
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
