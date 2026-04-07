create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  bus_route_id uuid not null references public.bus_routes (id) on delete restrict,
  bus_trip_id uuid not null references public.bus_trips (id) on delete restrict,
  from_stop_id uuid not null references public.bus_stops (id) on delete restrict,
  to_stop_id uuid not null references public.bus_stops (id) on delete restrict,
  number_of_seats integer not null check (number_of_seats >= 1),
  fare double precision not null check (fare >= 0),
  boarding_time timestamptz not null,
  expected_drop_off_time timestamptz,
  status text not null default 'pending',
  passenger_id uuid not null references public.profiles (id) on delete restrict,
  passenger_info jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

create table public.trip_seats (
  id uuid primary key default gen_random_uuid(),
  bus_trip_id uuid not null references public.bus_trips (id) on delete cascade,
  from_stop_id uuid not null references public.bus_stops (id) on delete restrict,
  to_stop_id uuid not null references public.bus_stops (id) on delete restrict,
  seats_occupied integer not null default 0 check (seats_occupied >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bus_trip_id, from_stop_id, to_stop_id)
);

create trigger trip_seats_set_updated_at
  before update on public.trip_seats
  for each row execute function public.set_updated_at();

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  trip_code text not null,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  driver_id uuid not null references public.profiles (id) on delete cascade,
  list_message jsonb not null default '[]'::jsonb,
  last_message jsonb,
  time_to_open timestamptz not null,
  time_to_close timestamptz,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger notifications_set_updated_at
  before update on public.notifications
  for each row execute function public.set_updated_at();

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  driver_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  rate smallint not null check (rate >= 1 and rate <= 5),
  feedback text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger ratings_set_updated_at
  before update on public.ratings
  for each row execute function public.set_updated_at();

create table public.bus_trackings (
  id uuid primary key default gen_random_uuid(),
  driver_bus_schedule_id uuid not null references public.driver_bus_schedules (id) on delete cascade,
  bus_trip_id uuid not null references public.bus_trips (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  current_stop_id uuid references public.bus_stops (id) on delete set null,
  next_stop_id uuid references public.bus_stops (id) on delete set null,
  current_location jsonb not null,
  location_history jsonb not null default '[]'::jsonb,
  speed double precision,
  heading double precision,
  delay_time integer not null default 0,
  estimated_arrival timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger bus_trackings_set_updated_at
  before update on public.bus_trackings
  for each row execute function public.set_updated_at();

create table public.shared_itineraries (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.profiles (id) on delete cascade,
  vehicle_id uuid not null references public.vehicles (id) on delete restrict,
  schedule_id uuid not null references public.driver_schedules (id) on delete restrict,
  stops jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  status_history jsonb not null default '[]'::jsonb,
  expire_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger shared_itineraries_set_updated_at
  before update on public.shared_itineraries
  for each row execute function public.set_updated_at();

create table public.scenic_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  status text not null default 'draft',
  waypoints jsonb not null default '[]'::jsonb,
  scenic_route_coordinates jsonb not null default '[]'::jsonb,
  estimated_duration integer not null,
  total_distance double precision not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger scenic_routes_set_updated_at
  before update on public.scenic_routes
  for each row execute function public.set_updated_at();

create table public.key_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  public_key text not null,
  refresh_token text not null,
  refresh_tokens_used text[] not null default '{}',
  reset_public_key text,
  reset_private_key text,
  created_at timestamptz not null default now()
);

create table public.otp_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  phone text not null,
  code text not null,
  token_access text,
  token_refresh text,
  expires_at timestamptz not null
);

create index idx_bookings_customer on public.bookings (customer_id);
create index idx_trips_customer on public.trips (customer_id);
create index idx_trips_driver on public.trips (driver_id);
create index idx_tickets_bus_trip on public.tickets (bus_trip_id);
create index idx_notifications_recipient on public.notifications (recipient_id);
