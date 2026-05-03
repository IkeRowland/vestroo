-- Epic 16 Theme K / US-K1 (FOLLOW-UP) — eliminate infinite recursion on
-- SELECT for `trips` ↔ `booking_trips` (live red banner across `/ops`,
-- `/ops/board`, `/ops/calendar`, `/ops/bookings`, `/ops/trips`, `/ops/invoicing`
-- after K1 shipped: "infinite recursion detected in policy for relation trips",
-- SQLSTATE 42P17). This is the same recursion class as K1, on a different
-- table pair, unmasked once `service_runs × tickets` was unblocked.
--
-- Forensic cycle (verified against upstream policy bodies):
--   - `supabase/migrations/20260424200000_epic15_15a3_account_portal_bookings_select_rls.sql`
--     installs `trips_select_account_member` whose body inline-EXISTS into
--     `public.booking_trips` joined to `public.bookings`.
--   - `supabase/migrations/20260408120000_vst8_chauffeur_booking_rls_ops_audit_actor_role.sql`
--     installs `booking_trips_select_chauffeur` whose body inline-EXISTS into
--     `public.trips`.
--   Path: SELECT public.trips → `trips_select_account_member` body queries
--   `booking_trips` → Postgres evaluates `booking_trips` SELECT policies (OR
--   semantics) → `booking_trips_select_chauffeur` body queries `public.trips`
--   → re-enters trips RLS → 42P17.
--
-- The third related policy `booking_trips_select_account_member` (same
-- 20260424200000 migration) is NOT itself recursive — it queries `bookings`
-- only, and bookings policies don't inline-EXISTS into `booking_trips`. We
-- still rewrite it via a helper for defence-in-depth and Theme O ADR
-- conformance (`docs/adr/0006-rls-cross-table-helpers.md`).
--
-- Other policies in the graph (already safe — verified):
--   - `bookings_select`, `bookings_select_chauffeur_linked`
--     (uses `public.booking_is_visible_to_chauffeur_via_trips` — Epic 11 E1),
--     `bookings_select_account_member`
--     (uses `public.account_ids_for_current_user`).
--   - `trips_select` (only checks `is_staff(auth.uid())` /
--     `customer_id = auth.uid()` / `chauffeur_id = auth.uid()`).
--   - `booking_trips_select` (queries `bookings` only — non-recursive at
--     present).
--   - `service_runs_select_party` and `tickets_chauffeur_run_select` are
--     already helper-based after K1
--     (`20260426170000_ops16_service_runs_tickets_rls_helpers.sql`).
--
-- Fix: encapsulate the cross-table visibility checks in three
-- `SECURITY DEFINER STABLE` helpers (per the Epic 11 E1 canonical pattern in
-- `20260418210000_e1_rls_bookings_booking_trips_recursion_fix.sql` —
-- `booking_is_visible_to_chauffeur_via_trips` — and the K1 pattern in
-- `20260426170000_ops16_service_runs_tickets_rls_helpers.sql`). SECURITY
-- DEFINER makes each helper run with the owner's privileges, so its internal
-- `select` does not re-enter caller-side RLS on the joined table. STABLE
-- because the bodies read from tables (not IMMUTABLE).
--
-- Q35 (epic-16) defers retroactive rewrite of all RLS policies — this
-- migration touches ONLY the named policy triple and the three helpers
-- required to break the cycle. Original row-set semantics of each replaced
-- policy are preserved verbatim — no policy drift beyond breaking the
-- recursion.
--
-- Helper comments cite `docs/adr/0006-rls-cross-table-helpers.md` (Theme O,
-- planned in US-O1). The ADR file may not yet be on `main` when this
-- migration merges; the path string is stable so US-O1 ships the doc only,
-- with no retro-edit of these helper comments.

-- ---------------------------------------------------------------------------
-- 1) Helper: booking_trip_is_visible_to_chauffeur(uuid)
--    Replaces the inline EXISTS body of `booking_trips_select_chauffeur`
--    (VST-8). Single-direction lookup; SECURITY DEFINER prevents re-entering
--    `trips` RLS for the chauffeur visibility path.
-- ---------------------------------------------------------------------------
create or replace function public.booking_trip_is_visible_to_chauffeur(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trips t
    where t.id = p_trip_id
      and t.chauffeur_id = auth.uid()
  );
$$;

comment on function public.booking_trip_is_visible_to_chauffeur(uuid) is
  'RLS helper (docs/adr/0006-rls-cross-table-helpers.md, Theme O): true when '
  'the current user is the chauffeur on the trip linked to the booking_trips '
  'row. SECURITY DEFINER avoids recursion through trips/booking_trips RLS.';

revoke all on function public.booking_trip_is_visible_to_chauffeur(uuid) from public;
grant execute on function public.booking_trip_is_visible_to_chauffeur(uuid) to authenticated;
grant execute on function public.booking_trip_is_visible_to_chauffeur(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 2) Helper: trip_is_visible_to_account_member(uuid)
--    Replaces the inline EXISTS body of `trips_select_account_member`
--    (Epic 15 / 15A.3). Account-member visibility via the booking chain.
--    SECURITY DEFINER prevents re-entering `booking_trips` RLS — that re-entry
--    is what brings `booking_trips_select_chauffeur` (and any future inline
--    cross-table policy on booking_trips) into the trip read path.
-- ---------------------------------------------------------------------------
create or replace function public.trip_is_visible_to_account_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.booking_trips bt
    join public.bookings b on b.id = bt.booking_id
    where bt.trip_id = p_trip_id
      and b.customer_account_id is not null
      and b.customer_account_id in (select public.account_ids_for_current_user())
  );
$$;

comment on function public.trip_is_visible_to_account_member(uuid) is
  'RLS helper (docs/adr/0006-rls-cross-table-helpers.md, Theme O): true when '
  'the current user is a member of the customer_account that owns a booking '
  'linked to the trip via booking_trips. SECURITY DEFINER avoids recursion '
  'through trips/booking_trips RLS.';

revoke all on function public.trip_is_visible_to_account_member(uuid) from public;
grant execute on function public.trip_is_visible_to_account_member(uuid) to authenticated;
grant execute on function public.trip_is_visible_to_account_member(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 3) Helper: booking_trip_is_visible_to_account_member(uuid)
--    Replaces the inline EXISTS body of `booking_trips_select_account_member`
--    (Epic 15 / 15A.3). Defence-in-depth + Theme O ADR conformance — the
--    original body was non-recursive (queries `bookings` only) but routing it
--    through a helper closes the door on future inline cross-table additions
--    on bookings policies that would re-enter booking_trips RLS.
-- ---------------------------------------------------------------------------
create or replace function public.booking_trip_is_visible_to_account_member(p_booking_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.bookings b
    where b.id = p_booking_id
      and b.customer_account_id is not null
      and b.customer_account_id in (select public.account_ids_for_current_user())
  );
$$;

comment on function public.booking_trip_is_visible_to_account_member(uuid) is
  'RLS helper (docs/adr/0006-rls-cross-table-helpers.md, Theme O): true when '
  'the current user is a member of the customer_account that owns the parent '
  'booking. SECURITY DEFINER avoids recursion through bookings/booking_trips '
  'RLS (defence-in-depth — original body was non-recursive).';

revoke all on function public.booking_trip_is_visible_to_account_member(uuid) from public;
grant execute on function public.booking_trip_is_visible_to_account_member(uuid) to authenticated;
grant execute on function public.booking_trip_is_visible_to_account_member(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 4) Drop the recursive (and defence-in-depth) policies (idempotent guards).
-- ---------------------------------------------------------------------------
drop policy if exists booking_trips_select_chauffeur on public.booking_trips;
drop policy if exists trips_select_account_member on public.trips;
drop policy if exists booking_trips_select_account_member on public.booking_trips;

-- ---------------------------------------------------------------------------
-- 5) Recreate the policies via the helpers (no inline cross-table EXISTS).
-- ---------------------------------------------------------------------------
create policy booking_trips_select_chauffeur on public.booking_trips
  for select to authenticated
  using (public.booking_trip_is_visible_to_chauffeur(trip_id));

comment on policy booking_trips_select_chauffeur on public.booking_trips is
  'Epic 16 K1 follow-up (recursion fix via SECURITY DEFINER helper): '
  'chauffeur may read booking_trips rows for their own trips. Original '
  'intent from VST-8 — chauffeur linked via trips.chauffeur_id.';

create policy trips_select_account_member on public.trips
  for select to authenticated
  using (public.trip_is_visible_to_account_member(id));

comment on policy trips_select_account_member on public.trips is
  'Epic 16 K1 follow-up (recursion fix via SECURITY DEFINER helper): '
  'account members may read trips attached to account-linked bookings (list '
  'embeds). Original intent from Epic 15 / 15A.3.';

create policy booking_trips_select_account_member on public.booking_trips
  for select to authenticated
  using (public.booking_trip_is_visible_to_account_member(booking_id));

comment on policy booking_trips_select_account_member on public.booking_trips is
  'Epic 16 K1 follow-up (Theme O defence-in-depth via SECURITY DEFINER '
  'helper): account members may read booking_trips for account-linked '
  'bookings. Original intent from Epic 15 / 15A.3.';
