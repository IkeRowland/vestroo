-- Charter / ops dispatch without patterned service_runs:
-- link chauffeur_assignments to trips; allow null service_route_id; allow null service_run on vehicle_trackings.

alter table public.chauffeur_assignments
  add column if not exists trip_id uuid references public.trips (id) on delete cascade;

comment on column public.chauffeur_assignments.trip_id is
  'When set, this assignment backs an ad-hoc charter trip dispatched without a service_run row.';

create index if not exists chauffeur_assignments_trip_id_idx
  on public.chauffeur_assignments (trip_id)
  where trip_id is not null;

alter table public.chauffeur_assignments
  alter column service_route_id drop not null;

alter table public.vehicle_trackings
  alter column service_run_id drop not null;
