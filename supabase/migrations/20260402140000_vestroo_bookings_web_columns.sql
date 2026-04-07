-- Align public.bookings with web booking Server Actions (createBooking, processPayment).
-- Guest flow: customer_id nullable. vehicle_id holds quote option id (text), not necessarily public.vehicles.id.

alter table public.bookings alter column customer_id drop not null;

alter table public.bookings
  add column if not exists origin_place_id text,
  add column if not exists origin_address text,
  add column if not exists origin_name text,
  add column if not exists origin_latitude double precision,
  add column if not exists origin_longitude double precision,
  add column if not exists destination_place_id text,
  add column if not exists destination_address text,
  add column if not exists destination_name text,
  add column if not exists destination_latitude double precision,
  add column if not exists destination_longitude double precision,
  add column if not exists pickup_datetime timestamptz,
  add column if not exists trip_date timestamptz,
  add column if not exists passenger_count integer,
  add column if not exists flight_number text,
  add column if not exists vehicle_id text,
  add column if not exists estimated_duration double precision,
  add column if not exists distance_km double precision,
  add column if not exists customer_name text,
  add column if not exists customer_email text,
  add column if not exists customer_phone text,
  add column if not exists payment_status text default 'pending',
  add column if not exists payment_reference text;

comment on column public.bookings.customer_id is 'Authenticated profile when present; null for guest web bookings.';
comment on column public.bookings.vehicle_id is 'Vehicle option id from quote (e.g. default tiers 1/2/3); may later reference fleet vehicles.';
