-- Epic 15 / Theme E — Story 15B.5 (15.15): per-account opt-in for public live rider map (Q22 double opt-in with RIDER_LIVE_LOCATION_ENABLED).
-- Deferred from 20260426120000_epic15_15b1_bookings_rider_columns.sql.

alter table public.customer_accounts
	add column if not exists live_rider_tracking boolean not null default false;

comment on column public.customer_accounts.live_rider_tracking is
	'Epic 15 / 15B.5 (Q22): when true and deploy RIDER_LIVE_LOCATION_ENABLED, public /track may show live map while trip is en_route; default false (POPIA).';
