create table public.vehicle_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  number_of_seat integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger vehicle_categories_set_updated_at
  before update on public.vehicle_categories
  for each row execute function public.set_updated_at();

create table public.service_configs (
  id uuid primary key default gen_random_uuid(),
  service_type text not null unique,
  base_unit double precision not null,
  base_unit_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger service_configs_set_updated_at
  before update on public.service_configs
  for each row execute function public.set_updated_at();

create table public.vehicle_pricings (
  id uuid primary key default gen_random_uuid(),
  vehicle_category_id uuid not null references public.vehicle_categories (id) on delete restrict,
  service_config_id uuid not null references public.service_configs (id) on delete restrict,
  tiered_pricing jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger vehicle_pricings_set_updated_at
  before update on public.vehicle_pricings
  for each row execute function public.set_updated_at();

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category_id uuid not null references public.vehicle_categories (id) on delete restrict,
  license_plate text not null unique,
  image_urls text[] not null default '{}',
  operation_status text not null default 'charging',
  vehicle_condition text not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger vehicles_set_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();
