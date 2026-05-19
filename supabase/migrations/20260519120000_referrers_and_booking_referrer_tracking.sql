-- Referrers + booking/trip referrer tracking (ops compensation MVP).
-- Future: commission rules, payout batches, eligibility — see docs/referrals-compensation-mvp.md

create table public.referrers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text,
  email text,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  commission_rate numeric(5, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referrers_code_key unique (code),
  constraint referrers_commission_rate_range
    check (commission_rate is null or (commission_rate >= 0 and commission_rate <= 100))
);

create trigger referrers_set_updated_at
  before update on public.referrers
  for each row execute function public.set_updated_at();

comment on table public.referrers is
  'Partners who refer bookings for compensation. Ops assigns referrer on create; finance reviews referred volume.';

comment on column public.referrers.commission_rate is
  'Optional default % for future payout automation — not enforced in MVP.';

alter table public.bookings
  add column if not exists referrer_id uuid references public.referrers (id) on delete set null;

comment on column public.bookings.referrer_id is
  'Referrer credited for this booking. Copied to trips when a trip is created from this booking.';

alter table public.trips
  add column if not exists referrer_id uuid references public.referrers (id) on delete set null;

comment on column public.trips.referrer_id is
  'Referrer at trip creation — copied from bookings.referrer_id when ops assigns a trip.';

create index if not exists bookings_referrer_id_idx on public.bookings (referrer_id)
  where referrer_id is not null;

create index if not exists trips_referrer_id_idx on public.trips (referrer_id)
  where referrer_id is not null;

alter table public.referrers enable row level security;

create policy referrers_staff_all on public.referrers
  for all to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));
