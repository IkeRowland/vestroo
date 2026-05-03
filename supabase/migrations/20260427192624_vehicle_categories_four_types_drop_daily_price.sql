-- Ops fleet: standardise vehicle_categories to Sedan, SUV, MPV, Minibus; remove vehicles.daily_price_zar.

insert into public.vehicle_categories (name, description, number_of_seat)
values
  ('Sedan', 'Sedan passenger car', 4),
  ('SUV', 'Sport utility vehicle', 5),
  ('MPV', 'Multi-purpose vehicle / people carrier', 7),
  ('Minibus', 'Minibus / shuttle', 14)
on conflict (name) do update set
  description = excluded.description,
  number_of_seat = excluded.number_of_seat,
  updated_at = now();

-- Repoint FKs that must not reference rows we are about to delete.
update public.vehicles v
set category_id = (select id from public.vehicle_categories where name = 'Sedan' limit 1)
where category_id not in (
  select id from public.vehicle_categories where name in ('Sedan', 'SUV', 'MPV', 'Minibus')
);

update public.vehicle_pricings vp
set vehicle_category_id = (select id from public.vehicle_categories where name = 'Sedan' limit 1)
where vehicle_category_id not in (
  select id from public.vehicle_categories where name in ('Sedan', 'SUV', 'MPV', 'Minibus')
);

update public.service_routes sr
set vehicle_category_id = (select id from public.vehicle_categories where name = 'Sedan' limit 1)
where vehicle_category_id is not null
  and vehicle_category_id not in (
    select id from public.vehicle_categories where name in ('Sedan', 'SUV', 'MPV', 'Minibus')
  );

update public.experience_packages ep
set default_vehicle_category_id = (select id from public.vehicle_categories where name = 'Sedan' limit 1)
where default_vehicle_category_id is not null
  and default_vehicle_category_id not in (
    select id from public.vehicle_categories where name in ('Sedan', 'SUV', 'MPV', 'Minibus')
  );

delete from public.vehicle_categories c
where c.name not in ('Sedan', 'SUV', 'MPV', 'Minibus');

alter table public.vehicles
  drop constraint if exists vehicles_daily_price_check;

alter table public.vehicles
  drop column if exists daily_price_zar;
