create table public.driver_schedules (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  work_date date not null,
  shift text,
  total_working_hours double precision not null default 8,
  actual_working_hours double precision not null default 0,
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  status text not null default 'not_started',
  checkin_time timestamptz,
  checkout_time timestamptz,
  is_late boolean not null default false,
  is_early_checkout boolean not null default false,
  task_type text not null default 'general',
  break_times jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger driver_schedules_set_updated_at
  before update on public.driver_schedules
  for each row execute function public.set_updated_at();

create table public.driver_bus_schedules (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  bus_route_id uuid not null references public.bus_routes (id) on delete restrict,
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  trip_number integer not null,
  status text not null default 'active',
  checkin_time timestamptz,
  checkout_time timestamptz,
  is_late boolean not null default false,
  is_early_checkout boolean not null default false,
  current_passengers integer not null default 0,
  total_passengers integer not null default 0,
  current_stop_id uuid references public.bus_stops (id) on delete set null,
  completed_stop_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger driver_bus_schedules_set_updated_at
  before update on public.driver_bus_schedules
  for each row execute function public.set_updated_at();

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id) on delete restrict,
  driver_id uuid not null references public.profiles (id) on delete restrict,
  time_start timestamptz,
  time_end timestamptz,
  time_start_estimate timestamptz not null,
  time_end_estimate timestamptz not null,
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  schedule_id uuid not null references public.driver_schedules (id) on delete restrict,
  service_type text not null,
  trip_coordinates jsonb not null default '[]'::jsonb,
  service_payload jsonb not null default '{}'::jsonb,
  amount double precision,
  status text not null default 'booking',
  is_rating boolean not null default false,
  cancellation_time timestamptz,
  cancellation_reason text not null default '',
  cancelled_by text,
  refund_amount double precision not null default 0,
  expire_at timestamptz,
  is_prepaid boolean not null default true,
  is_payed boolean not null default true,
  status_history jsonb not null default '[]'::jsonb,
  code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  booking_code bigint unique,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'pending',
  total_amount double precision not null,
  trans_id text,
  payment_method text not null default 'pay_os',
  expire_at timestamptz,
  status_history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bookings_set_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

create table public.booking_trips (
  booking_id uuid not null references public.bookings (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete restrict,
  sort_order integer not null default 0,
  primary key (booking_id, trip_id)
);
