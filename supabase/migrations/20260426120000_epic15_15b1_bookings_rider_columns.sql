-- Epic 15 / Theme E — Story 15B.1 (15.11): optional rider PII on `public.bookings` for US-C1
-- (trip confirmations / future rider SMS). Columns are nullable `text` like `customer_*`.
-- `customer_accounts.live_rider_tracking` remains out of scope (defer 15B.5 per AC2).

alter table public.bookings
  add column if not exists rider_name text null,
  add column if not exists rider_phone text null,
  add column if not exists rider_email text null;

comment on column public.bookings.rider_name is
  'Epic 15 / 15B.1: optional passenger/rider display name (POPIA — same handling as customer_name).';
comment on column public.bookings.rider_phone is
  'Epic 15 / 15B.1: optional rider contact phone (E.164 where trip-request validated; wizard may store ZA national).';
comment on column public.bookings.rider_email is
  'Epic 15 / 15B.1: optional rider email for ops / future comms (not a public API surface).';
