-- Fleet: category hero images + public-catalog flag; vehicle fleet active toggle (separate from archive).

alter table public.vehicle_categories
  add column if not exists image_url text,
  add column if not exists is_active boolean not null default true;

comment on column public.vehicle_categories.image_url is
  'Public URL for trip-request “Choose your vehicle” and marketing; optional.';
comment on column public.vehicle_categories.is_active is
  'When false, category is hidden from the public trip-request vehicle slide (ops may still manage it).';

alter table public.vehicles
  add column if not exists is_fleet_active boolean not null default true;

comment on column public.vehicles.is_fleet_active is
  'When false, vehicle is excluded from assignment / dispatch suggestions / availability checks; still visible on ops Fleet for editing.';
