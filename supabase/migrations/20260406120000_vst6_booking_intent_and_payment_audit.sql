-- VST-6: Booking intent (P2P, hourly, corporate/package stubs), PayFast audit column,
-- and optional link to a service pattern for contracted journeys.
--
-- HISTORICAL ANNOTATION — Epic 16 / Theme N (US-N2 / Q31): the PayFast checkout-provider
-- integration referenced below was physically removed in
-- `20260426234500_ops16_drop_payfast_trigger.sql`. The `payment_timestamp` and `trans_id`
-- columns are retained as audit / capability surfaces; future EFT settlement (US-N3
-- `markBookingPaymentReceived`) writes the same audit columns.

alter table public.bookings
  add column if not exists booking_intent text not null default 'point_to_point',
  add column if not exists hourly_duration_hours double precision,
  add column if not exists hourly_service_area_notes text,
  add column if not exists service_pattern_id uuid references public.service_patterns (id) on delete set null,
  add column if not exists booking_metadata jsonb not null default '{}'::jsonb,
  add column if not exists payment_timestamp timestamptz;

alter table public.bookings
  drop constraint if exists bookings_booking_intent_check;

alter table public.bookings
  add constraint bookings_booking_intent_check check (
    booking_intent in (
      'point_to_point',
      'hourly_hire',
      'corporate_pattern',
      'experience_package'
    )
  );

comment on column public.bookings.booking_intent is
  'Web booking product intent: point_to_point, hourly_hire, corporate_pattern (contracted service pattern), experience_package (tour/package stub).';
comment on column public.bookings.hourly_duration_hours is
  'Billable duration for hourly_hire intent; server quote uses minimum hours floor from env.';
comment on column public.bookings.hourly_service_area_notes is
  'Free-text service area / start window notes for hourly hire (premium as-directed work).';
comment on column public.bookings.service_pattern_id is
  'Optional FK to service_patterns for corporate_pattern / scheduled template references.';
comment on column public.bookings.booking_metadata is
  'Extensible JSON: e.g. experience_package_stub_id, ops notes; see docs/data-models.md.';
comment on column public.bookings.payment_timestamp is
  'When PayFast (or other provider) reported a terminal payment state; server-only.';

-- Guest web rows use trans_id (legacy column) for PayFast pf_payment_id; payment_reference stays customer-facing VST-* ref.
