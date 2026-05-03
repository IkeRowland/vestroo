-- Epic 16 / Story 16.17 (Theme N / US-N6) — durable acceptance timestamp for walk-in quote
-- EFT confirmation landing; idempotency: skip duplicate email/audit when set.
-- Traceability: docs/stories/16.17.story.md

alter table public.bookings
  add column if not exists quote_accepted_at timestamptz;

comment on column public.bookings.quote_accepted_at is
  'Epic 16 N6: set when a walk-in customer first accepts a sent quote via /q/[token]/accept; used for EFT idempotency (no duplicate audit/email on reload).';

-- Backfill existing accepted walk-in rows so reloads are treated as idempotent (no new emails).
update public.bookings b
set quote_accepted_at = sub.accepted_at
from (
  select distinct on (booking_id) booking_id, accepted_at
  from public.booking_quotes
  where status = 'accepted'
    and accepted_at is not null
  order by booking_id, accepted_at desc nulls last
) sub
where sub.booking_id = b.id
  and b.status = 'awaiting_payment'
  and b.client_type = 'walk_in'
  and b.quote_accepted_at is null;
