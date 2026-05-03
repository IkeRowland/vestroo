-- SH.9.3 (AC7): Evidence that two concurrent reservers cannot both pass per-run capacity.
-- Prerequisites: migrations applied (including 20260418140000_sh93_service_run_capacity_holds.sql).
--
-- Mechanism (see migration): reserve_service_run_capacity locks public.service_runs FOR UPDATE,
-- recomputes public.service_run_reserved_seat_count(service_run_id), then INSERTs a hold ticket.
-- Second transaction blocks on the lock; after the first commits, the second sees updated usage
-- and raises capacity_exceeded when passenger_capacity is saturated.
--
-- True parallel proof: open two psql sessions (or two clients) connected as authenticated roles
-- with JWT set to the same or different passengers as required. Set a run's passenger_capacity
-- to 1, then issue reserve_service_run_capacity from both sessions for 1 seat each — one succeeds,
-- the second fails with capacity_exceeded.
--
-- Sequential smoke (single session): run after seed data exists for service_runs / service_points.
-- Replace UUIDs with real ids from your database.

begin;

-- Example placeholders — replace before running:
-- select id, passenger_capacity from public.service_runs limit 5;
-- select id from public.service_points limit 2;

-- update public.service_runs set passenger_capacity = 1 where id = '<RUN_ID>';

-- select public.reserve_service_run_capacity(
--   '<RUN_ID>'::uuid,
--   '<PASSENGER_A>'::uuid,
--   1,
--   '<FROM_POINT>'::uuid,
--   '<TO_POINT>'::uuid,
--   'proof-key-a',
--   null,
--   0,
--   now(),
--   900
-- );

-- select public.reserve_service_run_capacity(
--   '<RUN_ID>'::uuid,
--   '<PASSENGER_B>'::uuid,
--   1,
--   '<FROM_POINT>'::uuid,
--   '<TO_POINT>'::uuid,
--   'proof-key-b',
--   null,
--   0,
--   now(),
--   900
-- );
-- Expected: second call errors with capacity_exceeded when capacity is 1.

rollback;
