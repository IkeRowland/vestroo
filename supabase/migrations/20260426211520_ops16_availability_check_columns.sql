-- Epic 16 Theme B / US-B1 — availability-check audit columns on `public.bookings`.
-- Traceability: docs/epic-16.md Theme B; docs/stories/16.9.story.md.
-- RLS: no new policy; existing `bookings_update` (Epic 14.1 / VST-14) inherits writable columns for staff.

alter table public.bookings
  add column if not exists availability_checked_at timestamptz null,
  add column if not exists availability_checked_by uuid null references public.profiles (id) on delete set null,
  add column if not exists availability_check jsonb null;

comment on column public.bookings.availability_checked_at is
  'Epic 16 Theme B: when staff completed the vehicle/driver availability review for this booking. Null = not yet checked. Required before sendWalkInQuote / assignBookingToRun unless admin-overridden.';
comment on column public.bookings.availability_checked_by is
  'Staff profile id of who completed the availability check.';
comment on column public.bookings.availability_check is
  'Snapshot of candidates considered (vehicles, drivers), conflicts noted, staff rationale, and override flag if admin-bypassed.';

create index if not exists idx_bookings_availability_checked
  on public.bookings (availability_checked_at)
  where availability_checked_at is not null;
