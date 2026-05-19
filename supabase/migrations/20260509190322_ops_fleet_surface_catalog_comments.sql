-- Ops fleet IA: document primary catalogue surfaces (tables unchanged — routes moved to /ops/fleet).
comment on table public.vehicles is
  'Fleet vehicle records. Staff catalogue UI: /ops/fleet (Vehicles tab). Legacy /ops/vehicles redirects.';

comment on table public.vehicle_categories is
  'Fleet vehicle category taxonomy (seating class). Staff UI: /ops/fleet/categories. Referenced by vehicles.category_id.';
