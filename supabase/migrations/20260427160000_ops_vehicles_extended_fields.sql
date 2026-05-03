-- Extend public.vehicles with marketing/specs columns required by the ops "Add vehicle" form.
-- Adds optional marketing fields without breaking existing inserts.

alter table public.vehicles
  add column if not exists make text,
  add column if not exists model text,
  add column if not exists model_year integer,
  add column if not exists daily_price_zar numeric(12, 2),
  add column if not exists mileage_km integer,
  add column if not exists color text,
  add column if not exists seats integer,
  add column if not exists transmission text,
  add column if not exists fuel_type text,
  add column if not exists description text,
  add column if not exists primary_image_url text,
  add column if not exists gallery_image_urls text[] not null default '{}';

alter table public.vehicles
  drop constraint if exists vehicles_transmission_check;
alter table public.vehicles
  add constraint vehicles_transmission_check
  check (transmission is null or transmission in ('automatic', 'manual', 'cvt', 'semi_automatic'));

alter table public.vehicles
  drop constraint if exists vehicles_fuel_type_check;
alter table public.vehicles
  add constraint vehicles_fuel_type_check
  check (
    fuel_type is null
    or fuel_type in ('petrol', 'diesel', 'electric', 'hybrid', 'plug_in_hybrid')
  );

alter table public.vehicles
  drop constraint if exists vehicles_model_year_check;
alter table public.vehicles
  add constraint vehicles_model_year_check
  check (model_year is null or (model_year between 1950 and 2100));

alter table public.vehicles
  drop constraint if exists vehicles_seats_check;
alter table public.vehicles
  add constraint vehicles_seats_check
  check (seats is null or (seats between 1 and 80));

alter table public.vehicles
  drop constraint if exists vehicles_mileage_km_check;
alter table public.vehicles
  add constraint vehicles_mileage_km_check
  check (mileage_km is null or mileage_km >= 0);

alter table public.vehicles
  drop constraint if exists vehicles_daily_price_check;
alter table public.vehicles
  add constraint vehicles_daily_price_check
  check (daily_price_zar is null or daily_price_zar >= 0);

comment on column public.vehicles.make is 'Manufacturer (e.g. Toyota).';
comment on column public.vehicles.model is 'Model name (e.g. Corolla).';
comment on column public.vehicles.model_year is 'Manufacture year.';
comment on column public.vehicles.daily_price_zar is 'Indicative daily rental price in ZAR.';
comment on column public.vehicles.mileage_km is 'Odometer reading at time of registration.';
comment on column public.vehicles.color is 'Body color.';
comment on column public.vehicles.seats is 'Total passenger seats including driver.';
comment on column public.vehicles.transmission is 'Gearbox type (automatic, manual, cvt, semi_automatic).';
comment on column public.vehicles.fuel_type is 'Fuel type (petrol, diesel, electric, hybrid, plug_in_hybrid).';
comment on column public.vehicles.description is 'Free-text description for ops/customers.';
comment on column public.vehicles.primary_image_url is 'Public URL of the main vehicle image.';
comment on column public.vehicles.gallery_image_urls is 'Additional vehicle image URLs.';

-- Storage bucket for vehicle images (idempotent).
insert into storage.buckets (id, name, public)
values ('vehicles', 'vehicles', true)
on conflict (id) do nothing;

-- Staff (dispatcher/admin) can manage vehicle images; everyone can read (public bucket).
drop policy if exists vehicles_images_staff_insert on storage.objects;
create policy vehicles_images_staff_insert on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'vehicles' and public.is_staff(auth.uid()));

drop policy if exists vehicles_images_staff_update on storage.objects;
create policy vehicles_images_staff_update on storage.objects
  for update
  to authenticated
  using (bucket_id = 'vehicles' and public.is_staff(auth.uid()))
  with check (bucket_id = 'vehicles' and public.is_staff(auth.uid()));

drop policy if exists vehicles_images_staff_delete on storage.objects;
create policy vehicles_images_staff_delete on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'vehicles' and public.is_staff(auth.uid()));
