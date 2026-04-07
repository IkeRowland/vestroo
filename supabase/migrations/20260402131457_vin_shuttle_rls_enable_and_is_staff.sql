alter table public.profiles enable row level security;
alter table public.vehicle_categories enable row level security;
alter table public.vehicles enable row level security;
alter table public.service_configs enable row level security;
alter table public.vehicle_pricings enable row level security;
alter table public.bus_stops enable row level security;
alter table public.bus_routes enable row level security;
alter table public.bus_route_stops enable row level security;
alter table public.bus_schedules enable row level security;
alter table public.bus_trips enable row level security;
alter table public.driver_schedules enable row level security;
alter table public.driver_bus_schedules enable row level security;
alter table public.trips enable row level security;
alter table public.bookings enable row level security;
alter table public.booking_trips enable row level security;
alter table public.tickets enable row level security;
alter table public.trip_seats enable row level security;
alter table public.conversations enable row level security;
alter table public.notifications enable row level security;
alter table public.ratings enable row level security;
alter table public.bus_trackings enable row level security;
alter table public.shared_itineraries enable row level security;
alter table public.scenic_routes enable row level security;
alter table public.key_tokens enable row level security;
alter table public.otp_sessions enable row level security;

create or replace function public.is_staff(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role in ('admin', 'manager')
  );
$$;
