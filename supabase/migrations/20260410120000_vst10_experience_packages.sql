-- VST-10: Tour / experience package catalogue, public read (active only), staff writes.
-- Aligns narrative with VST-6 Winelands experience template seed (docs/data-models.md).

create table public.experience_packages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  base_price_zar numeric(12, 2) not null check (base_price_zar >= 0),
  per_passenger_increment_zar numeric(12, 2) not null default 0 check (per_passenger_increment_zar >= 0),
  included_passengers integer not null default 1 check (included_passengers >= 1),
  default_vehicle_category_id uuid references public.vehicle_categories (id) on delete set null,
  itinerary jsonb not null default '[]'::jsonb,
  addon_catalog jsonb not null default '[]'::jsonb,
  stub_origin jsonb not null,
  stub_destination jsonb not null,
  estimated_duration_minutes integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.experience_packages is 'VST-10: Bookable experience/tour packages; booking_metadata references experience_package_id.';
comment on column public.experience_packages.itinerary is 'Ordered steps: [{order, title, duration_minutes?, location_label?, highlight?}].';
comment on column public.experience_packages.addon_catalog is 'Add-ons: [{id, label, price_zar}]; selected ids stored in bookings.booking_metadata.selected_addon_ids.';
comment on column public.experience_packages.stub_origin is 'Pickup stub for bookings row / wizard: {placeId, formattedAddress, name, latitude, longitude}.';
comment on column public.experience_packages.stub_destination is 'Drop-off stub (same shape as stub_origin).';

create trigger experience_packages_set_updated_at
  before update on public.experience_packages
  for each row execute function public.set_updated_at();

alter table public.experience_packages enable row level security;

-- Public catalogue: active packages only
create policy experience_packages_select_active_anon
  on public.experience_packages
  for select
  to anon
  using (is_active = true);

create policy experience_packages_select_active_authenticated
  on public.experience_packages
  for select
  to authenticated
  using (is_active = true);

-- Staff: full CRUD (service role bypasses RLS for seeds / server actions)
create policy experience_packages_staff_all
  on public.experience_packages
  for all
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- Seed one bookable package (fixed id for docs / staging references)
do $$
declare
  vc_id uuid;
  pkg_id uuid := 'e0000001-0000-4000-8000-000000000001'::uuid;
begin
  select id into vc_id from public.vehicle_categories order by name limit 1;
  -- Package remains seedable without fleet data; vehicle category is optional.

  insert into public.experience_packages (
    id,
    slug,
    title,
    description,
    base_price_zar,
    per_passenger_increment_zar,
    included_passengers,
    default_vehicle_category_id,
    itinerary,
    addon_catalog,
    stub_origin,
    stub_destination,
    estimated_duration_minutes,
    is_active
  )
  values (
    pkg_id,
    'cape-winelands-day',
    'Cape Winelands full-day experience',
    'Private chauffeured day exploring the Cape Winelands — tastings and scenery, premium vehicle, flexible pacing. Narrative aligned with the VST-6 Winelands experience template seed.',
    4490.00,
    420.00,
    2,
    vc_id,
    '[
      {"order": 1, "title": "Morning pickup", "duration_minutes": 30, "location_label": "Cape Town hotel or address", "highlight": "Discreet meet and luggage check"},
      {"order": 2, "title": "Stellenbosch & Franschhoek route", "duration_minutes": 300, "location_label": "Winelands", "highlight": "Scenic driving and scheduled estate stops"},
      {"order": 3, "title": "Lunch window", "duration_minutes": 90, "location_label": "Guest preference", "highlight": "Reservation support on request"},
      {"order": 4, "title": "Return transfer", "duration_minutes": 60, "location_label": "Cape Town", "highlight": "Drop-off at agreed service point"}
    ]'::jsonb,
    '[
      {"id": "addon-champagne", "label": "Sparkling welcome pack", "price_zar": 350},
      {"id": "addon-extra-hour", "label": "Extra hour on route", "price_zar": 580}
    ]'::jsonb,
    '{"placeId": "vestroo-stub-cpt-origin", "formattedAddress": "Cape Town City Bowl, Western Cape, South Africa", "name": "Cape Town (experience pickup)", "latitude": -33.9249, "longitude": 18.4241}'::jsonb,
    '{"placeId": "vestroo-stub-stellenbosch", "formattedAddress": "Stellenbosch, Western Cape, South Africa", "name": "Winelands region (experience area)", "latitude": -33.9326, "longitude": 18.8602}'::jsonb,
    480,
    true
  )
  on conflict (id) do update set
    slug = excluded.slug,
    title = excluded.title,
    description = excluded.description,
    base_price_zar = excluded.base_price_zar,
    per_passenger_increment_zar = excluded.per_passenger_increment_zar,
    included_passengers = excluded.included_passengers,
    default_vehicle_category_id = coalesce(
      excluded.default_vehicle_category_id,
      public.experience_packages.default_vehicle_category_id
    ),
    itinerary = excluded.itinerary,
    addon_catalog = excluded.addon_catalog,
    stub_origin = excluded.stub_origin,
    stub_destination = excluded.stub_destination,
    estimated_duration_minutes = excluded.estimated_duration_minutes,
    is_active = excluded.is_active,
    updated_at = now();
end $$;
