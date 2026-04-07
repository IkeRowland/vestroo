create table public.bus_stops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  lat double precision not null,
  lng double precision not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bus_stops_set_updated_at
  before update on public.bus_stops
  for each row execute function public.set_updated_at();

create table public.bus_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  route_coordinates jsonb not null default '[]'::jsonb,
  total_distance double precision not null,
  estimated_duration integer not null,
  vehicle_category_id uuid references public.vehicle_categories (id) on delete set null,
  pricing_config_id uuid not null references public.vehicle_pricings (id) on delete restrict,
  status text not null default 'active',
  star_time timestamptz,
  end_time timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bus_routes_set_updated_at
  before update on public.bus_routes
  for each row execute function public.set_updated_at();

create table public.bus_route_stops (
  id uuid primary key default gen_random_uuid(),
  bus_route_id uuid not null references public.bus_routes (id) on delete cascade,
  stop_id uuid not null references public.bus_stops (id) on delete restrict,
  order_index integer not null,
  distance_from_start double precision not null,
  estimated_time integer not null,
  unique (bus_route_id, order_index),
  unique (bus_route_id, stop_id)
);

create table public.bus_schedules (
  id uuid primary key default gen_random_uuid(),
  bus_route_id uuid not null references public.bus_routes (id) on delete cascade,
  vehicle_ids uuid[] not null default '{}',
  driver_ids uuid[] not null default '{}',
  trips_per_day integer not null check (trips_per_day >= 1),
  daily_start_time text not null,
  daily_end_time text not null,
  status text not null default 'active',
  effective_date date not null,
  expiry_date date,
  driver_assignments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bus_schedules_set_updated_at
  before update on public.bus_schedules
  for each row execute function public.set_updated_at();

create table public.bus_trips (
  id uuid primary key default gen_random_uuid(),
  bus_schedule_id uuid not null references public.bus_schedules (id) on delete cascade,
  bus_route_id uuid not null references public.bus_routes (id) on delete restrict,
  service_date date not null,
  trip_number integer not null,
  vehicle_id uuid references public.vehicles (id) on delete set null,
  driver_id uuid references public.profiles (id) on delete set null,
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bus_schedule_id, service_date, trip_number)
);

create trigger bus_trips_set_updated_at
  before update on public.bus_trips
  for each row execute function public.set_updated_at();
