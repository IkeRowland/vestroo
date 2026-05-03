-- FE.10.4 / Epic 10: Public trip-request funnel persists to `bookings` with intent `trip_request`
-- (no instant quote / PayFast on this path).
--
-- HISTORICAL ANNOTATION — Epic 16 / Theme N (US-N2 / Q31): the PayFast checkout integration
-- referenced above has been physically removed; trip-request bookings continue to land at
-- `submitted` and ops settle them out of band per US-N3.

alter table public.bookings
  drop constraint if exists bookings_booking_intent_check;

alter table public.bookings
  add constraint bookings_booking_intent_check check (
    booking_intent in (
      'point_to_point',
      'hourly_hire',
      'corporate_pattern',
      'experience_package',
      'trip_request'
    )
  );

comment on column public.bookings.booking_intent is
  'Web booking product intent: point_to_point, hourly_hire, corporate_pattern, experience_package, trip_request (public trip request funnel — no quote at submit).';
