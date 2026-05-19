-- Epic 17 / fleet: default vehicle per driver profile. Dispatch may omit explicit vehicle when this is set;
-- `trips.chauffeur_id` + `trips.vehicle_id` still capture the operational snapshot.
alter table public.profiles
  add column if not exists default_vehicle_id uuid null references public.vehicles (id) on delete set null;

comment on column public.profiles.default_vehicle_id is
  'Default fleet vehicle for this driver (profiles.role = chauffeur in app). Used by ops dispatch when vehicle is not specified.';
