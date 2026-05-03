-- =============================================================================
-- smoke_rls.sql ? RLS structural & policy regression checks
-- Run as postgres (or Dashboard SQL) against a database with migrations applied.
-- Hosted / no Docker: set DATABASE_URL in .env.local, then `npm run smoke:rls`
-- (see docs/local-development.md ? RLS smoke tests).
--
-- VST-14 / Epic 12 Story 12.1 (US-A2): assertions below expect migration head
--   20260419120000_vst14_account_clients_and_quotes.sql
--   applied (customer_accounts, booking_quotes RLS, bookings CHECKs,
--   booking_trips.booking_id UNIQUE, v_booking_current_quote, etc.).
-- Epic 13 Story 13.9 / 13.12: bookings.status includes ready_to_invoice, invoiced, paid_invoice
--   (20260420200000_epic13_story139_bookings_invoicing_statuses_v1.sql) ? section 14 exercises staff UPDATE + member SELECT.
-- Epic 14 Story 14.1: ready_to_assign CHECK constraint on bookings.status ? the original
--   trigger (`bookings_walk_in_paid_to_ready_to_assign`) was DROPPED by Epic 16 / US-N2
--   (`20260426234500_ops16_drop_payfast_trigger.sql`). Section 15 now exercises the constraint
--   plus RLS on direct status writes only; transitions to `ready_to_assign` are driven by
--   `markBookingPaymentReceived` (US-N3) once that ships.
-- Epic 12 Story 12.8 (US-E2 Q3): bookings INSERT gate for account-linked rows ?
--   apply 20260420140000_epic12_story128_bookings_insert_account_member_q3_rls.sql
--   (section 12 behavioural matrix exercises JWT + authenticated role).
-- Epic 12 Story 12.9: section 13 ? booking_quotes staff INSERT + v_booking_current_quote + DELETE deny.
-- Epic 15 Story 15A.9: section 17 ? portal two-account SELECT isolation (JWT + authenticated;
--   member of Account A only must not SELECT Account B rows on bookings, booking_quotes,
--   customer_account_members, customer_accounts).
-- Smoke is intended to pass only after that migration (and prior chain) is applied.
-- Epic 15 / 15C.1: section 18 ? `comms_templates` + `comms_dispatch_rules` staff-only RLS
--   (`20260426104021_epic15_15c1_comms_templates_and_dispatch_rules.sql`).
-- Epic 16 / Story 16.1 / US-K1: section 19 ? chauffeur SELECT on `service_runs`
--   must NOT raise SQLSTATE `42P17` (infinite recursion). Pre-fix the policy pair
--   `service_runs_select_party` ? `tickets_chauffeur_run_select` recursed; fix
--   migration `20260426170000_ops16_service_runs_tickets_rls_helpers.sql` introduces
--   `public.service_run_is_visible_to_party(uuid)` and
--   `public.ticket_is_visible_to_run_chauffeur(uuid)` (`SECURITY DEFINER STABLE`).
-- Epic 16 / Story 16.1 follow-up: section 20 ? `trips` ? `booking_trips` recursion
--   guard (helpers from `20260426180000_ops16_trips_booking_trips_rls_helpers.sql`).
--   Same recursion class as K1, different table pair: `trips_select_account_member`
--   ? `booking_trips_select_chauffeur`, unmasked post-K1. Section asserts no
--   SQLSTATE `42P17` on chauffeur-authenticated and account-member-authenticated
--   SELECTs against `public.trips` and `public.booking_trips`.
-- Epic 16 / US-O2 (Theme O): end-of-script `DO` sweep (fixed table list) for
--   `42P17` on `select 1 from public.<table>` ? see `scripts/lint-rls-policies.mjs`.
-- Epic 16 / Story 16.9 / Theme B / US-B1: section 21 ? `bookings` availability-check
--   audit columns + partial index + `pg_description`; staff may UPDATE via existing
--   `bookings_update`; chauffeur linked via `booking_trips`/`trips.chauffeur_id` must not
--   persist availability-only UPDATE (`20260426211520_ops16_availability_check_columns.sql`).
-- Epic 16 / Story 16.10 / Theme G / US-G1: section 22 ? `ops_alerts` table + RLS
--   (service_role/superuser INSERT; staff SELECT + UPDATE acknowledge; no authenticated
--   INSERT policy) ? `20260426213503_ops16_ops_alerts_table.sql`.
-- Epic 16 / Story 16.11 / Theme N / US-N1: section 23 ? `ops_settings` (bank_account seed) + RLS
--   (staff SELECT; admin UPDATE; non-admin staff UPDATE denied) ? masking is app-layer
--   (`getBankAccountForReader`) ? `20260426220000_ops16_ops_settings_and_payment_columns.sql`.
-- Epic 16 / Story 16.12 / Phase 1: section 24 ? `driver_assignments` view (invoker, over
--   `chauffeur_assignments` RLS) ? `20260426231000_ops16_driver_assignments_view.sql`.
--
-- Roles exercised (Supabase):
--   - Session is superuser / postgres: RLS is bypassed for plain SELECTs below.
--   - Policies target table ACL role "authenticated" (JWT-present clients).
--   - Helpers: public.is_staff(uuid) ? profiles.role in (admin, dispatcher).
--   - Epic 11 E1: chauffeur booking visibility uses
--     booking_is_visible_to_chauffeur_via_trips(uuid) (SECURITY DEFINER; no recursion).
--
-- Ops-critical tables for this script (read paths / policy graph):
--   bookings, booking_trips, trips, experience_packages, profiles, ops_audit_log,
--   notifications (inventory spot-check), service_runs (often USING (true) ? still listed in epic).
--   Epic 12 / VST-14: customer_accounts, customer_account_members, booking_quotes
--   Epic 15 / 15C.1: comms_templates, comms_dispatch_rules (staff-only; section 18)
--   (+ public.can_dispatch_account_booking(uuid) guardrail,
--     public.account_ids_for_current_user() ? member RLS recursion fix).
--
-- Failure output: DO blocks RAISE EXCEPTION with prefix [smoke_rls] and fields
-- policy=, table=, role=, detail= for quick triage in CI or Dashboard.
-- =============================================================================

-- Transaction: entire script runs as one txn; final ROLLBACK discards section 12 fixtures.
begin;

-- 0) Banner (PostgreSQL-compatible ? not psql-only \echo)
do $banner$
begin
  raise notice '[smoke_rls] start: structural checks (see header for roles/tables)';
end
$banner$;

-- 1) RLS enabled on representative tables (deny-by-default for anon without policies)
select c.relname as table_name, c.relrowsecurity as rls_on
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles', 'bookings', 'booking_trips', 'tickets', 'trips', 'service_points', 'service_routes',
    'vehicle_trackings', 'chauffeur_assignments', 'chauffeur_schedules', 'ops_audit_log',
    'experience_packages',
    'customer_accounts', 'customer_account_members', 'booking_quotes',
    'comms_templates', 'comms_dispatch_rules', 'ops_alerts', 'ops_settings'
  )
  and c.relkind = 'r'
order by c.relname;
-- Expect rls_on = true for each.

-- 2) E1: recursion fix helper must exist (Epic 11 Theme A)
do $e1_helper$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'booking_is_visible_to_chauffeur_via_trips'
  ) then
    raise exception
      '[smoke_rls] FAIL table=n/a policy=n/a role=authenticated detail=E1 helper public.booking_is_visible_to_chauffeur_via_trips(uuid) missing ? apply migration 20260418210000_e1_rls_bookings_booking_trips_recursion_fix.sql';
  end if;
end
$e1_helper$;

-- 3) is_staff() definition uses admin + dispatcher only (not chauffeur)
select pg_get_functiondef(p.oid) as def
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'is_staff';
-- Expect body to reference roles admin and dispatcher only.

-- 4) profiles.role CHECK allows epic vocabulary only
select conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'public.profiles'::regclass
  and contype = 'c'
  and conname = 'profiles_role_check';
-- Expect: customer, chauffeur, dispatcher, admin

-- 5) Policy inventory (spot-check names exist after VST-5 / VST-8 / E1)
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in (
    'bookings', 'booking_trips', 'tickets', 'trips', 'chauffeur_schedules', 'vehicle_trackings',
    'ops_audit_log', 'notifications', 'experience_packages',
    'customer_accounts', 'customer_account_members', 'booking_quotes',
    'comms_templates', 'comms_dispatch_rules'
  )
order by tablename, policyname;
-- Expect on bookings: bookings_select; bookings_select_chauffeur_linked (E1: uses helper, not inline join);
-- on booking_trips: booking_trips_select; booking_trips_select_chauffeur; ?
-- on experience_packages: experience_packages_staff_all; public catalogue selects; ?
-- After VST-8: on ops_audit_log: ops_audit_log_chauffeur_insert (and ops_audit_log_staff_insert with actor_role).
-- After VST-9: on notifications: notifications_chauffeur_customer_insert (in addition to notifications_own).

-- 6) Assert critical policies present (actionable failures)
do $policy_bookings_chauffeur$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'bookings_select_chauffeur_linked'
      and cmd = 'SELECT'
  ) then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_select_chauffeur_linked role=authenticated detail=policy missing or renamed';
  end if;
end
$policy_bookings_chauffeur$;

do $policy_booking_trips$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_trips'
      and policyname = 'booking_trips_select'
      and cmd = 'SELECT'
  ) then
    raise exception
      '[smoke_rls] FAIL table=booking_trips policy=booking_trips_select role=authenticated detail=policy missing or renamed';
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_trips'
      and policyname = 'booking_trips_select_chauffeur'
      and cmd = 'SELECT'
  ) then
    raise exception
      '[smoke_rls] FAIL table=booking_trips policy=booking_trips_select_chauffeur role=authenticated detail=policy missing or renamed';
  end if;
end
$policy_booking_trips$;

do $policy_experience_staff$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'experience_packages'
      and policyname = 'experience_packages_staff_all'
  ) then
    raise exception
      '[smoke_rls] FAIL table=experience_packages policy=experience_packages_staff_all role=authenticated detail=policy missing or renamed';
  end if;
end
$policy_experience_staff$;

-- 7) Epic 12 / VST-14: dispatch guardrail + staff policies on new tables
do $vst14_can_dispatch$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'can_dispatch_account_booking'
  ) then
    raise exception
      '[smoke_rls] FAIL table=n/a policy=n/a role=authenticated detail=VST-14 helper public.can_dispatch_account_booking(uuid) missing ? apply migration 20260419120000_vst14_account_clients_and_quotes.sql';
  end if;
end
$vst14_can_dispatch$;

do $vst14_account_ids_for_current_user$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'account_ids_for_current_user'
  ) then
    raise exception
      '[smoke_rls] FAIL table=n/a policy=n/a role=authenticated detail=VST-14 helper public.account_ids_for_current_user() missing ? apply migration 20260420120000_vst14_customer_account_members_rls_recursion_fix.sql';
  end if;
end
$vst14_account_ids_for_current_user$;

do $vst14_customer_accounts_staff$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_accounts'
      and policyname = 'customer_accounts_staff_select'
      and cmd = 'SELECT'
  ) then
    raise exception
      '[smoke_rls] FAIL table=customer_accounts policy=customer_accounts_staff_select role=authenticated detail=policy missing or renamed';
  end if;
end
$vst14_customer_accounts_staff$;

do $vst14_customer_account_members_staff_insert$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_account_members'
      and policyname = 'customer_account_members_staff_insert'
      and cmd = 'INSERT'
  ) then
    raise exception
      '[smoke_rls] FAIL table=customer_account_members policy=customer_account_members_staff_insert role=authenticated detail=policy missing or renamed';
  end if;
end
$vst14_customer_account_members_staff_insert$;

do $vst14_booking_quotes_staff$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_quotes'
      and policyname = 'booking_quotes_staff_select'
      and cmd = 'SELECT'
  ) then
    raise exception
      '[smoke_rls] FAIL table=booking_quotes policy=booking_quotes_staff_select role=authenticated detail=policy missing or renamed';
  end if;
end
$vst14_booking_quotes_staff$;

-- 8) VST-14: no DELETE policy on booking_quotes (append-only / audit integrity)
do $vst14_booking_quotes_no_delete$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_quotes'
      and cmd = 'DELETE'
  ) then
    raise exception
      '[smoke_rls] FAIL table=booking_quotes policy=n/a role=authenticated detail=DELETE policy must not exist on booking_quotes (append-only audit trail)';
  end if;
end
$vst14_booking_quotes_no_delete$;

-- 9) VST-14: critical constraints + booking_quotes.expires_at
do $vst14_constraint_booking_trips_booking_id_key$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.booking_trips'::regclass
      and contype = 'u'
      and conname = 'booking_trips_booking_id_key'
  ) then
    raise exception
      '[smoke_rls] FAIL table=booking_trips policy=n/a role=n/a detail=constraint booking_trips_booking_id_key missing ? apply migration 20260419120000_vst14_account_clients_and_quotes.sql';
  end if;
end
$vst14_constraint_booking_trips_booking_id_key$;

do $vst14_constraint_bookings_status_check$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and contype = 'c'
      and conname = 'bookings_status_check'
  ) then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=n/a role=n/a detail=constraint bookings_status_check missing ? apply migration 20260419120000_vst14_account_clients_and_quotes.sql';
  end if;
end
$vst14_constraint_bookings_status_check$;

do $vst14_constraint_bookings_payment_status_check$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and contype = 'c'
      and conname = 'bookings_payment_status_check'
  ) then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=n/a role=n/a detail=constraint bookings_payment_status_check missing ? apply migration 20260419120000_vst14_account_clients_and_quotes.sql';
  end if;
end
$vst14_constraint_bookings_payment_status_check$;

do $vst14_constraint_bookings_account_linkage_check$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.bookings'::regclass
      and contype = 'c'
      and conname = 'bookings_account_linkage_check'
  ) then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=n/a role=n/a detail=constraint bookings_account_linkage_check missing ? apply migration 20260419120000_vst14_account_clients_and_quotes.sql';
  end if;
end
$vst14_constraint_bookings_account_linkage_check$;

do $vst14_booking_quotes_expires_at_column$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'booking_quotes'
      and column_name = 'expires_at'
  ) then
    raise exception
      '[smoke_rls] FAIL table=booking_quotes policy=n/a role=n/a detail=column booking_quotes.expires_at missing ? apply migration 20260419120000_vst14_account_clients_and_quotes.sql';
  end if;
end
$vst14_booking_quotes_expires_at_column$;

-- 10) VST-14 AC10: member + booking-owner SELECT policies
do $vst14_policy_customer_accounts_member_select$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_accounts'
      and policyname = 'customer_accounts_member_select'
      and cmd = 'SELECT'
  ) then
    raise exception
      '[smoke_rls] FAIL table=customer_accounts policy=customer_accounts_member_select role=authenticated detail=policy missing or renamed';
  end if;
end
$vst14_policy_customer_accounts_member_select$;

do $vst14_policy_customer_account_members_member_select$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customer_account_members'
      and policyname = 'customer_account_members_member_select'
      and cmd = 'SELECT'
  ) then
    raise exception
      '[smoke_rls] FAIL table=customer_account_members policy=customer_account_members_member_select role=authenticated detail=policy missing or renamed';
  end if;
end
$vst14_policy_customer_account_members_member_select$;

do $vst14_policy_booking_quotes_booking_owner_select$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_quotes'
      and policyname = 'booking_quotes_booking_owner_select'
      and cmd = 'SELECT'
  ) then
    raise exception
      '[smoke_rls] FAIL table=booking_quotes policy=booking_quotes_booking_owner_select role=authenticated detail=policy missing or renamed';
  end if;
end
$vst14_policy_booking_quotes_booking_owner_select$;

-- 11) VST-14: current-quote convenience view
do $vst14_view_booking_current_quote$
begin
  if not exists (
    select 1
    from information_schema.views
    where table_schema = 'public'
      and table_name = 'v_booking_current_quote'
  ) then
    raise exception
      '[smoke_rls] FAIL table=v_booking_current_quote policy=n/a role=n/a detail=view public.v_booking_current_quote missing ? apply migration 20260419120000_vst14_account_clients_and_quotes.sql';
  end if;
end
$vst14_view_booking_current_quote$;

-- 12) Epic 12 Story 12.8 ? Q3 account-linked bookings INSERT matrix (JWT + SET LOCAL ROLE)
--     Rolled back with the script-wide transaction (no persistent auth.users rows).
do $bookings_insert_q3$
declare
  v_inst uuid;
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_account uuid := gen_random_uuid();
  v_staff uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_booker uuid := gen_random_uuid();
  v_rider uuid := gen_random_uuid();
  v_stranger uuid := gen_random_uuid();
  v_use_email_confirmed boolean;
  v_fixtures_ok boolean := true;
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice '[smoke_rls] skip 12.8 Q3 matrix: auth schema not present';
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) into v_use_email_confirmed;

  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into v_inst;

  -- pgcrypto (crypt) is available on Supabase by default; do not CREATE EXTENSION here
  -- (not valid inside some transaction / DO contexts).

  -- Five auth.users + profiles (trigger) ? emails unique per run.
  begin
    if v_use_email_confirmed then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_staff, 'authenticated', 'authenticated',
         'smoke128-' || v_suffix || '-staff@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_admin, 'authenticated', 'authenticated',
         'smoke128-' || v_suffix || '-admin@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_booker, 'authenticated', 'authenticated',
         'smoke128-' || v_suffix || '-booker@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_rider, 'authenticated', 'authenticated',
         'smoke128-' || v_suffix || '-rider@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_stranger, 'authenticated', 'authenticated',
         'smoke128-' || v_suffix || '-stranger@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    else
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_staff, 'authenticated', 'authenticated',
         'smoke128-' || v_suffix || '-staff@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_admin, 'authenticated', 'authenticated',
         'smoke128-' || v_suffix || '-admin@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_booker, 'authenticated', 'authenticated',
         'smoke128-' || v_suffix || '-booker@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_rider, 'authenticated', 'authenticated',
         'smoke128-' || v_suffix || '-rider@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_stranger, 'authenticated', 'authenticated',
         'smoke128-' || v_suffix || '-stranger@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    end if;
  exception
    when others then
      v_fixtures_ok := false;
      raise notice
        '[smoke_rls] 12.8 Q3 auth.users fixture skipped: %',
        sqlerrm;
  end;

  if not v_fixtures_ok then
    if exists (
      select 1
      from pg_policy p
      join pg_class c on c.oid = p.polrelid
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = 'bookings'
        and p.polname = 'bookings_insert'
        and p.polcmd = 'a'
        and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') like '%customer_account_members%'
        and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') like '%admin%'
        and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') like '%booker%'
        and coalesce(pg_get_expr(p.polwithcheck, p.polrelid), '') like '%customer_account_id%'
    ) then
      raise notice '[smoke_rls] 12.8 Q3: policy definition check OK (behavioural matrix skipped)';
      return;
    end if;
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_insert role=authenticated detail=12.8 Q3 fixtures failed and policy definition check did not match expected bookings_insert WITH CHECK';
  end if;

  update public.profiles
  set role = 'dispatcher'
  where id = v_staff;

  insert into public.customer_accounts (id, name, slug, status)
  values (
    v_account,
    'smoke 12.8 Q3',
    'smoke-128-q3-' || v_suffix,
    'active'
  );

  insert into public.customer_account_members (account_id, email, profile_id, role)
  values
    (v_account, 'smoke128-' || v_suffix || '-admin@smoke.vestroo.invalid', v_admin, 'admin'),
    (v_account, 'smoke128-' || v_suffix || '-booker@smoke.vestroo.invalid', v_booker, 'booker'),
    (v_account, 'smoke128-' || v_suffix || '-rider@smoke.vestroo.invalid', v_rider, 'rider');

  -- Walk-in still allowed for a rider (customer_account_id null).
  perform set_config('request.jwt.claim.sub', v_rider::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  insert into public.bookings (
    customer_id, total_amount, client_type, customer_account_id,
    status, payment_status, booking_intent
  ) values (
    v_rider, 100, 'walk_in', null, 'pending', 'pending', 'point_to_point'
  );
  reset role;

  -- Staff: may insert account-linked booking for another customer_id.
  perform set_config('request.jwt.claim.sub', v_staff::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  insert into public.bookings (
    customer_id, total_amount, client_type, customer_account_id,
    status, payment_status, booking_intent
  ) values (
    v_stranger, 100, 'account_client', v_account, 'pending', 'pending', 'point_to_point'
  );
  reset role;

  -- Admin member.
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  set local role authenticated;
  insert into public.bookings (
    customer_id, total_amount, client_type, customer_account_id,
    status, payment_status, booking_intent
  ) values (
    v_admin, 100, 'account_client', v_account, 'pending', 'pending', 'point_to_point'
  );
  reset role;

  -- Booker member.
  perform set_config('request.jwt.claim.sub', v_booker::text, true);
  set local role authenticated;
  insert into public.bookings (
    customer_id, total_amount, client_type, customer_account_id,
    status, payment_status, booking_intent
  ) values (
    v_booker, 100, 'account_client', v_account, 'pending', 'pending', 'point_to_point'
  );
  reset role;

  -- Rider member: must be denied.
  begin
    perform set_config('request.jwt.claim.sub', v_rider::text, true);
    set local role authenticated;
    insert into public.bookings (
      customer_id, total_amount, client_type, customer_account_id,
      status, payment_status, booking_intent
    ) values (
      v_rider, 100, 'account_client', v_account, 'pending', 'pending', 'point_to_point'
    );
    reset role;
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_insert role=authenticated detail=Q3 rider must be denied for account-linked insert';
  exception
    when insufficient_privilege then
      reset role;
    when others then
      reset role;
      if sqlstate = '42501' or sqlerrm ilike '%row-level security%' then
        null;
      else
        raise;
      end if;
  end;

  -- Non-member: must be denied.
  begin
    perform set_config('request.jwt.claim.sub', v_stranger::text, true);
    set local role authenticated;
    insert into public.bookings (
      customer_id, total_amount, client_type, customer_account_id,
      status, payment_status, booking_intent
    ) values (
      v_stranger, 100, 'account_client', v_account, 'pending', 'pending', 'point_to_point'
    );
    reset role;
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_insert role=authenticated detail=Q3 non-member must be denied for account-linked insert';
  exception
    when insufficient_privilege then
      reset role;
    when others then
      reset role;
      if sqlstate = '42501' or sqlerrm ilike '%row-level security%' then
        null;
      else
        raise;
      end if;
  end;

  raise notice '[smoke_rls] 12.8 Q3 bookings INSERT matrix: OK';
end
$bookings_insert_q3$;

-- 13) Epic 12 Story 12.9 ? booking_quotes: staff INSERT, v_booking_current_quote read, DELETE denied (JWT matrix)
do $booking_quotes_129$
declare
  v_inst uuid;
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_staff uuid := gen_random_uuid();
  v_bid uuid := gen_random_uuid();
  v_qid uuid;
  v_deleted bigint;
  v_use_email_confirmed boolean;
  v_ok boolean := true;
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice '[smoke_rls] skip 12.9 booking_quotes matrix: auth schema not present';
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) into v_use_email_confirmed;

  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into v_inst;

  begin
    if v_use_email_confirmed then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        v_inst, v_staff, 'authenticated', 'authenticated',
        'smoke129-' || v_suffix || '-staff@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
      );
    else
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        v_inst, v_staff, 'authenticated', 'authenticated',
        'smoke129-' || v_suffix || '-staff@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
      );
    end if;
  exception
    when others then
      v_ok := false;
      raise notice '[smoke_rls] 12.9 auth.users fixture skipped: %', sqlerrm;
  end;

  if not v_ok then
    if exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'booking_quotes'
        and policyname = 'booking_quotes_staff_insert'
        and cmd = 'INSERT'
    ) and not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'booking_quotes'
        and cmd = 'DELETE'
    ) then
      raise notice '[smoke_rls] 12.9 booking_quotes: policy definition check OK (behavioural matrix skipped)';
      return;
    end if;
    raise exception
      '[smoke_rls] FAIL table=booking_quotes policy=booking_quotes_staff_insert role=n/a detail=12.9 fixtures failed and policy fallback did not match';
  end if;

  update public.profiles set role = 'dispatcher' where id = v_staff;

  insert into public.bookings (
    id, total_amount, status, payment_status, booking_intent, client_type
  ) values (
    v_bid, 42, 'pending', 'pending', 'point_to_point', 'walk_in'
  );

  perform set_config('request.jwt.claim.sub', v_staff::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  insert into public.booking_quotes (
    booking_id, version, total_zar, line_items, status, idempotency_key
  ) values (
    v_bid,
    1,
    42.00,
    '[]'::jsonb,
    'sent',
    'smoke129-bq-' || v_suffix
  )
  returning id into v_qid;

  reset role;

  if not exists (
    select 1 from public.v_booking_current_quote where booking_id = v_bid
  ) then
    raise exception
      '[smoke_rls] FAIL table=v_booking_current_quote policy=n/a role=n/a detail=expected row for sent quote';
  end if;

  -- With no DELETE policy, Postgres RLS denies deletes by making no rows visible to DELETE:
  -- the statement completes successfully with ROW_COUNT = 0 (no error is raised).
  perform set_config('request.jwt.claim.sub', v_staff::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  delete from public.booking_quotes where id = v_qid;
  get diagnostics v_deleted = row_count;
  reset role;
  if v_deleted <> 0 then
    raise exception
      '[smoke_rls] FAIL table=booking_quotes policy=n/a role=authenticated detail=DELETE must be denied (append-only)';
  end if;
  if not exists (select 1 from public.booking_quotes where id = v_qid) then
    raise exception
      '[smoke_rls] FAIL table=booking_quotes policy=n/a role=authenticated detail=quote row missing after DELETE attempt';
  end if;

  raise notice '[smoke_rls] 12.9 booking_quotes INSERT + v_booking_current_quote + DELETE deny: OK';
end
$booking_quotes_129$;

-- 14) Epic 13 Story 13.12 ? finance statuses on bookings: staff UPDATE + account member SELECT
do $epic1312_booking_finance_statuses$
declare
  v_inst uuid;
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_staff uuid := gen_random_uuid();
  v_booker uuid := gen_random_uuid();
  v_account uuid := gen_random_uuid();
  v_booking uuid := gen_random_uuid();
  v_use_email_confirmed boolean;
  v_ok boolean := true;
  v_row public.bookings%rowtype;
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice '[smoke_rls] skip 13.12 finance statuses: auth schema not present';
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) into v_use_email_confirmed;

  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into v_inst;

  begin
    if v_use_email_confirmed then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_staff, 'authenticated', 'authenticated',
         'smoke1312-' || v_suffix || '-staff@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_booker, 'authenticated', 'authenticated',
         'smoke1312-' || v_suffix || '-booker@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    else
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_staff, 'authenticated', 'authenticated',
         'smoke1312-' || v_suffix || '-staff@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_booker, 'authenticated', 'authenticated',
         'smoke1312-' || v_suffix || '-booker@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    end if;
  exception
    when others then
      v_ok := false;
      raise notice '[smoke_rls] 13.12 auth.users fixture skipped: %', sqlerrm;
  end;

  if not v_ok then
    raise notice '[smoke_rls] 13.12 finance statuses: behavioural matrix skipped (auth fixture)';
    return;
  end if;

  update public.profiles set role = 'dispatcher' where id = v_staff;

  insert into public.customer_accounts (id, name, slug, status)
  values (v_account, 'smoke 13.12 finance', 'smoke-1312-' || v_suffix, 'active');

  insert into public.customer_account_members (account_id, email, profile_id, role)
  values (
    v_account,
    'smoke1312-' || v_suffix || '-booker@smoke.vestroo.invalid',
    v_booker,
    'booker'
  );

  insert into public.bookings (
    id, customer_id, total_amount, client_type, customer_account_id,
    status, payment_status, booking_intent, payment_reference
  ) values (
    v_booking, v_booker, 100, 'account_client', v_account,
    'paid', 'paid', 'point_to_point', 'SMOKE1312-' || v_suffix
  );

  -- Staff: may advance finance statuses on behalf of ops invoicing hooks.
  perform set_config('request.jwt.claim.sub', v_staff::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  update public.bookings
  set status = 'ready_to_invoice'
  where id = v_booking;
  reset role;

  perform set_config('request.jwt.claim.sub', v_staff::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  update public.bookings
  set status = 'invoiced', external_invoice_ref = 'smoke-inv-' || v_suffix
  where id = v_booking;
  reset role;

  perform set_config('request.jwt.claim.sub', v_staff::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  update public.bookings
  set status = 'paid_invoice'
  where id = v_booking;
  reset role;

  -- Booker: may read own booking through customer_id membership path.
  perform set_config('request.jwt.claim.sub', v_booker::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  select * into v_row from public.bookings where id = v_booking;
  reset role;

  if v_row.id is distinct from v_booking or v_row.status is distinct from 'paid_invoice' then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_select role=authenticated detail=13.12 booker must read paid_invoice row';
  end if;

  raise notice '[smoke_rls] 13.12 bookings finance statuses (staff write + member read): OK';
end
$epic1312_booking_finance_statuses$;

-- 15) Epic 14 Story 14.1 ? ready_to_assign CHECK constraint + RLS on manual status writes.
--     Epic 16 / US-N2 dropped the legacy trigger; auto-transition assertions removed below.
do $epic141_ready_to_assign$
declare
  v_inst uuid;
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_staff uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_customer uuid := gen_random_uuid();
  v_account uuid := gen_random_uuid();
  v_walk_paid uuid := gen_random_uuid();
  v_acct_paid uuid := gen_random_uuid();
  v_rls_booking uuid := gen_random_uuid();
  v_staff_booking uuid := gen_random_uuid();
  v_walk_pay uuid := gen_random_uuid();
  v_use_email_confirmed boolean;
  v_ok boolean := true;
  v_status text;
  v_chk text;
begin
  select pg_get_constraintdef(c.oid) into v_chk
  from pg_constraint c
  where c.conrelid = 'public.bookings'::regclass
    and c.contype = 'c'
    and c.conname = 'bookings_status_check';

  if v_chk is null or v_chk not ilike '%ready_to_assign%' then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=n/a role=n/a detail=14.1 bookings_status_check must include ready_to_assign';
  end if;

  -- Epic 16 / US-N2: legacy `bookings_walk_in_paid_to_ready_to_assign` trigger was DROPPED.
  -- Assert it really is gone so reintroductions are caught by smoke before they ship.
  if exists (
    select 1 from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'bookings'
      and not t.tgisinternal
      and t.tgname in (
        'bookings_walk_in_paid_to_ready_to_assign',
        'ready_to_assign_walk_in_paid_trigger'
      )
  ) then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=n/a role=n/a detail=16.13 legacy walk-in paid trigger must be dropped (Epic 16 / US-N2)';
  end if;

  -- Walk-in paid: with the trigger dropped, status MUST stay awaiting_payment until
  -- markBookingPaymentReceived (US-N3) drives the explicit transition.
  insert into public.bookings (
    id, total_amount, client_type, customer_account_id,
    status, payment_status, booking_intent
  ) values (
    v_walk_paid, 80, 'walk_in', null,
    'awaiting_payment', 'pending', 'point_to_point'
  );
  update public.bookings
  set payment_status = 'paid'
  where id = v_walk_paid;
  select status into v_status from public.bookings where id = v_walk_paid;
  if v_status is distinct from 'awaiting_payment' then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=n/a role=postgres detail=16.13 walk-in paid must NOT auto-transition (trigger dropped); got %', v_status;
  end if;

  -- Account client: paid does not force ready_to_assign (still true post-trigger-drop).
  insert into public.customer_accounts (id, name, slug, status)
  values (v_account, 'smoke 14.1 acct', 'smoke-141-acct-' || v_suffix, 'active');

  insert into public.bookings (
    id, total_amount, client_type, customer_account_id,
    status, payment_status, booking_intent
  ) values (
    v_acct_paid, 90, 'account_client', v_account,
    'awaiting_payment', 'pending', 'point_to_point'
  );
  update public.bookings
  set payment_status = 'paid'
  where id = v_acct_paid;
  select status into v_status from public.bookings where id = v_acct_paid;
  if v_status is distinct from 'awaiting_payment' then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=n/a role=postgres detail=14.1 account paid must leave status unchanged got %', v_status;
  end if;

  -- RLS matrix (JWT + authenticated): reuse 13.12-style fixtures when auth present
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice '[smoke_rls] 14.1 RLS matrix skipped: auth schema not present';
    raise notice '[smoke_rls] 14.1 ready_to_assign CHECK (trigger dropped - Epic 16 / US-N2): OK';
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) into v_use_email_confirmed;

  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into v_inst;

  begin
    if v_use_email_confirmed then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_staff, 'authenticated', 'authenticated',
         'smoke141-' || v_suffix || '-staff@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_admin, 'authenticated', 'authenticated',
         'smoke141-' || v_suffix || '-admin@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_customer, 'authenticated', 'authenticated',
         'smoke141-' || v_suffix || '-cust@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    else
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_staff, 'authenticated', 'authenticated',
         'smoke141-' || v_suffix || '-staff@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_admin, 'authenticated', 'authenticated',
         'smoke141-' || v_suffix || '-admin@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_customer, 'authenticated', 'authenticated',
         'smoke141-' || v_suffix || '-cust@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    end if;
  exception
    when others then
      v_ok := false;
      raise notice '[smoke_rls] 14.1 auth.users fixture skipped: %', sqlerrm;
  end;

  if not v_ok then
    raise notice '[smoke_rls] 14.1 RLS matrix skipped (auth fixture)';
    raise notice '[smoke_rls] 14.1 ready_to_assign CHECK (trigger dropped - Epic 16 / US-N2): OK';
    return;
  end if;

  update public.profiles set role = 'dispatcher' where id = v_staff;
  update public.profiles set role = 'admin' where id = v_admin;
  update public.profiles set role = 'customer' where id = v_customer;

  insert into public.bookings (
    id, customer_id, total_amount, client_type, customer_account_id,
    status, payment_status, booking_intent
  ) values (
    v_rls_booking, v_customer, 55, 'walk_in', null,
    'awaiting_payment', 'pending', 'point_to_point'
  );

  insert into public.bookings (
    id, customer_id, total_amount, client_type, customer_account_id,
    status, payment_status, booking_intent
  ) values (
    v_staff_booking, v_customer, 66, 'walk_in', null,
    'awaiting_payment', 'pending', 'point_to_point'
  );

  insert into public.bookings (
    id, customer_id, total_amount, client_type, customer_account_id,
    status, payment_status, booking_intent
  ) values (
    v_walk_pay, v_customer, 77, 'walk_in', null,
    'awaiting_payment', 'pending', 'point_to_point'
  );

  -- Walk-in customer: payment_status pending?paid must still pass RLS WITH CHECK; with the
  -- Epic 16 trigger drop the row stays at `awaiting_payment` until ops marks payment.
  perform set_config('request.jwt.claim.sub', v_customer::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  update public.bookings
  set payment_status = 'paid'
  where id = v_walk_pay;
  reset role;

  select status into v_status from public.bookings where id = v_walk_pay;
  if v_status is distinct from 'awaiting_payment' then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_update role=authenticated detail=16.13 walk-in customer pay must NOT auto-transition got %', v_status;
  end if;

  -- Non-staff: must not set ready_to_assign directly
  begin
    perform set_config('request.jwt.claim.sub', v_customer::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    update public.bookings
    set status = 'ready_to_assign'
    where id = v_rls_booking;
    reset role;
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_update role=authenticated detail=14.1 customer must not set ready_to_assign';
  exception
    when insufficient_privilege then
      reset role;
    when others then
      reset role;
      if sqlstate = '42501' or sqlerrm ilike '%row-level security%' or sqlerrm ilike '%violates row-level security%' then
        null;
      else
        raise;
      end if;
  end;

  -- Staff (admin): may set ready_to_assign for manual ops
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;
  update public.bookings
  set status = 'ready_to_assign'
  where id = v_staff_booking;
  reset role;

  select status into v_status from public.bookings where id = v_staff_booking;
  if v_status is distinct from 'ready_to_assign' then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_update role=authenticated detail=14.1 admin must set ready_to_assign got %', v_status;
  end if;

  raise notice '[smoke_rls] 14.1 ready_to_assign CHECK + RLS matrix (trigger dropped - Epic 16 / US-N2): OK';
end
$epic141_ready_to_assign$;

-- 16) Epic 13 / Story 14.11 ? `sent` ? `expired` daily job RPC (scheduler is manual / pg_cron ? migration runbook)
do $epic1311_expire_fn$
begin
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'expire_sent_booking_quotes_past_due_v1'
  ) then
    raise exception
      '[smoke_rls] FAIL table=n/a policy=n/a role=n/a detail=public.expire_sent_booking_quotes_past_due_v1() missing ? apply 20260420210000_epic13_story1311_expire_sent_booking_quotes_daily_v1.sql';
  end if;
end
$epic1311_expire_fn$;

-- 17) Epic 15 / Story 15A.9 ? portal two-account SELECT isolation (JWT + authenticated)
--     Fixture model (A): one user U is customer_account_members for Account A only; Account B
--     has its own member row (different user) plus bookings/quotes. U must get zero rows for
--     B-scoped SELECTs; positive reads for A. RLS uses account_ids_for_current_user(), not
--     vestroo_active_account_id (app cookie ? see stories 15.1 / 15.4 / 15.7; E2E 15A.10).
do $epic15_159_portal_select_isolation$
declare
  v_inst uuid;
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_account_a uuid := gen_random_uuid();
  v_account_b uuid := gen_random_uuid();
  v_u uuid := gen_random_uuid();
  v_bonly uuid := gen_random_uuid();
  v_booking_a uuid := gen_random_uuid();
  v_booking_b uuid := gen_random_uuid();
  v_quote_a uuid;
  v_quote_b uuid;
  v_use_email_confirmed boolean;
  v_fixtures_ok boolean := true;
  v_cnt bigint;
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice '[smoke_rls] skip Epic 15 / 15A.9 portal isolation: auth schema not present';
    return;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname = 'bookings_select_account_member'
      and cmd = 'SELECT'
  )
  or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'booking_quotes'
      and policyname = 'booking_quotes_select_account_member'
      and cmd = 'SELECT'
  ) then
    raise exception
      '[smoke_rls] FAIL table=n/a policy=bookings_select_account_member|booking_quotes_select_account_member role=authenticated detail=Epic 15 portal SELECT policies missing ? apply 20260424200000_epic15_15a3_account_portal_bookings_select_rls.sql and 20260424210000_epic15_15a4_booking_quotes_account_member_select_rls.sql';
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) into v_use_email_confirmed;

  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into v_inst;

  begin
    if v_use_email_confirmed then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_u, 'authenticated', 'authenticated',
         'smoke159-' || v_suffix || '-u@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_bonly, 'authenticated', 'authenticated',
         'smoke159-' || v_suffix || '-bonly@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    else
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_u, 'authenticated', 'authenticated',
         'smoke159-' || v_suffix || '-u@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_bonly, 'authenticated', 'authenticated',
         'smoke159-' || v_suffix || '-bonly@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    end if;
  exception
    when others then
      v_fixtures_ok := false;
      raise notice '[smoke_rls] Epic 15 / 15A.9 auth.users fixture skipped: %', sqlerrm;
  end;

  if not v_fixtures_ok then
    raise notice '[smoke_rls] Epic 15 / 15A.9 portal isolation: behavioural matrix skipped (auth fixture)';
    return;
  end if;

  update public.profiles
  set role = 'customer'
  where id in (v_u, v_bonly);

  insert into public.customer_accounts (id, name, slug, status)
  values
    (v_account_a, 'smoke 15A.9 portal A', 'smoke-159-a-' || v_suffix, 'active'),
    (v_account_b, 'smoke 15A.9 portal B', 'smoke-159-b-' || v_suffix, 'active');

  insert into public.customer_account_members (account_id, email, profile_id, role)
  values
    (
      v_account_a,
      'smoke159-' || v_suffix || '-u@smoke.vestroo.invalid',
      v_u,
      'booker'
    ),
    (
      v_account_b,
      'smoke159-' || v_suffix || '-bonly@smoke.vestroo.invalid',
      v_bonly,
      'booker'
    );

  -- Bookings: customer_id is B-only member so U sees A booking only via account_member SELECT,
  -- not owner path (15A.3).
  insert into public.bookings (
    id, customer_id, total_amount, client_type, customer_account_id,
    status, payment_status, booking_intent
  )
  values
    (
      v_booking_a, v_bonly, 100, 'account_client', v_account_a,
      'pending', 'pending', 'point_to_point'
    ),
    (
      v_booking_b, v_bonly, 200, 'account_client', v_account_b,
      'pending', 'pending', 'point_to_point'
    );

  insert into public.booking_quotes (
    booking_id, version, total_zar, line_items, status, idempotency_key
  )
  values (
    v_booking_a,
    1,
    100.00,
    '[]'::jsonb,
    'sent',
    'smoke159-qa-' || v_suffix
  )
  returning id into v_quote_a;

  insert into public.booking_quotes (
    booking_id, version, total_zar, line_items, status, idempotency_key
  )
  values (
    v_booking_b,
    1,
    200.00,
    '[]'::jsonb,
    'sent',
    'smoke159-qb-' || v_suffix
  )
  returning id into v_quote_b;

  perform set_config('request.jwt.claim.sub', v_u::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  select count(*) into v_cnt from public.bookings where id = v_booking_b;
  if v_cnt <> 0 then
    reset role;
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_select_account_member role=authenticated detail=portal_isolation expected 0 rows for Account B booking';
  end if;

  select count(*) into v_cnt from public.booking_quotes where id = v_quote_b;
  if v_cnt <> 0 then
    reset role;
    raise exception
      '[smoke_rls] FAIL table=booking_quotes policy=booking_quotes_select_account_member role=authenticated detail=portal_isolation expected 0 rows for quote on Account B booking';
  end if;

  select count(*) into v_cnt
  from public.customer_account_members
  where account_id = v_account_b;
  if v_cnt <> 0 then
    reset role;
    raise exception
      '[smoke_rls] FAIL table=customer_account_members policy=customer_account_members_member_select role=authenticated detail=portal_isolation expected 0 rows for Account B members';
  end if;

  select count(*) into v_cnt from public.customer_accounts where id = v_account_b;
  if v_cnt <> 0 then
    reset role;
    raise exception
      '[smoke_rls] FAIL table=customer_accounts policy=customer_accounts_member_select role=authenticated detail=portal_isolation expected 0 rows for Account B';
  end if;

  select count(*) into v_cnt from public.bookings where id = v_booking_a;
  if v_cnt <> 1 then
    reset role;
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_select_account_member role=authenticated detail=portal_isolation positive control: expected 1 row for Account A booking';
  end if;

  select count(*) into v_cnt from public.booking_quotes where id = v_quote_a;
  if v_cnt <> 1 then
    reset role;
    raise exception
      '[smoke_rls] FAIL table=booking_quotes policy=booking_quotes_select_account_member role=authenticated detail=portal_isolation positive control: expected 1 row for Account A quote';
  end if;

  select count(*) into v_cnt
  from public.customer_account_members
  where account_id = v_account_a
    and profile_id = v_u;
  if v_cnt <> 1 then
    reset role;
    raise exception
      '[smoke_rls] FAIL table=customer_account_members policy=customer_account_members_member_select role=authenticated detail=portal_isolation positive control: expected U membership row on A';
  end if;

  select count(*) into v_cnt from public.customer_accounts where id = v_account_a;
  if v_cnt <> 1 then
    reset role;
    raise exception
      '[smoke_rls] FAIL table=customer_accounts policy=customer_accounts_member_select role=authenticated detail=portal_isolation positive control: expected Account A visible';
  end if;

  reset role;

  raise notice '[smoke_rls] Epic 15 / 15A.9 portal two-account SELECT isolation: OK';
end
$epic15_159_portal_select_isolation$;

-- 18) Epic 15 / 15C.1 ? comms registries: RLS on + staff policies (no portal/customer write path)
do $epic15_15c1_comms_rls$
declare
  v_cnt int;
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'comms_templates'
      and c.relkind = 'r'
      and c.relrowsecurity = true
  ) then
    raise exception '[smoke_rls] FAIL table=comms_templates detail=RLS must be enabled (Epic 15 / 15C.1)';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'comms_dispatch_rules'
      and c.relkind = 'r'
      and c.relrowsecurity = true
  ) then
    raise exception '[smoke_rls] FAIL table=comms_dispatch_rules detail=RLS must be enabled (Epic 15 / 15C.1)';
  end if;

  select count(*) into v_cnt
  from pg_policies
  where schemaname = 'public'
    and tablename = 'comms_templates';
  if v_cnt < 3 then
    raise exception
      '[smoke_rls] FAIL table=comms_templates detail=expected >=3 staff policies (got %)',
      v_cnt;
  end if;

  select count(*) into v_cnt
  from pg_policies
  where schemaname = 'public'
    and tablename = 'comms_dispatch_rules';
  if v_cnt < 3 then
    raise exception
      '[smoke_rls] FAIL table=comms_dispatch_rules detail=expected >=3 staff policies (got %)',
      v_cnt;
  end if;

  select count(*) into v_cnt
  from pg_policy p
  join pg_class c on c.oid = p.polrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('comms_templates', 'comms_dispatch_rules')
    and p.polcmd = 'd'::"char";
  if v_cnt <> 0 then
    raise exception
      '[smoke_rls] FAIL comms_* detail=15C.1 must not grant DELETE policies on comms registries (got %)',
      v_cnt;
  end if;

  raise notice '[smoke_rls] Epic 15 / 15C.1 comms_templates + comms_dispatch_rules: OK';
end
$epic15_15c1_comms_rls$;

-- 19) Epic 16 / Story 16.1 / US-K1 ? `service_runs` ? `tickets` recursion fix
--     Pre-fix the policy pair `service_runs_select_party` ? `tickets_chauffeur_run_select`
--     used inline cross-table EXISTS, so chauffeur SELECT on `service_runs` raised
--     SQLSTATE `42P17` (infinite recursion). Fix migration installs SECURITY DEFINER
--     helpers (`service_run_is_visible_to_party(uuid)`,
--     `ticket_is_visible_to_run_chauffeur(uuid)`).
--     This block authenticates as a fresh chauffeur fixture and asserts
--     `select count(*) from public.service_runs` does NOT raise `42P17`.
do $epic16_161_service_runs_no_recursion$
declare
  v_inst uuid;
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_chauffeur uuid := gen_random_uuid();
  v_use_email_confirmed boolean;
  v_fixtures_ok boolean := true;
  v_cnt bigint;
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice '[smoke_rls] skip 16.1 service_runs recursion: auth schema not present';
    return;
  end if;

  -- Helpers MUST exist post-fix; surface a clear actionable failure if missing.
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'service_run_is_visible_to_party'
  ) then
    raise exception
      '[smoke_rls] FAIL table=service_runs policy=service_runs_select_party role=authenticated detail=K1 helper public.service_run_is_visible_to_party(uuid) missing ? apply migration 20260426170000_ops16_service_runs_tickets_rls_helpers.sql';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'ticket_is_visible_to_run_chauffeur'
  ) then
    raise exception
      '[smoke_rls] FAIL table=tickets policy=tickets_chauffeur_run_select role=authenticated detail=K1 helper public.ticket_is_visible_to_run_chauffeur(uuid) missing ? apply migration 20260426170000_ops16_service_runs_tickets_rls_helpers.sql';
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) into v_use_email_confirmed;

  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into v_inst;

  begin
    if v_use_email_confirmed then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        v_inst, v_chauffeur, 'authenticated', 'authenticated',
        'smoke161-' || v_suffix || '-chauffeur@smoke.vestroo.invalid',
        crypt('x', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
      );
    else
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        v_inst, v_chauffeur, 'authenticated', 'authenticated',
        'smoke161-' || v_suffix || '-chauffeur@smoke.vestroo.invalid',
        crypt('x', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
      );
    end if;
  exception
    when others then
      v_fixtures_ok := false;
      raise notice '[smoke_rls] 16.1 auth.users fixture skipped: %', sqlerrm;
  end;

  if not v_fixtures_ok then
    -- Even without a JWT fixture, surface the structural facts: helpers exist
    -- (asserted above) and policies are recreated via those helpers (no inline
    -- cross-table EXISTS). That alone removes the recursion class.
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'service_runs'
        and policyname = 'service_runs_select_party'
        and cmd = 'SELECT'
    ) then
      raise exception
        '[smoke_rls] FAIL table=service_runs policy=service_runs_select_party role=authenticated detail=K1 expected policy recreated via service_run_is_visible_to_party helper';
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'tickets'
        and policyname = 'tickets_chauffeur_run_select'
        and cmd = 'SELECT'
    ) then
      raise exception
        '[smoke_rls] FAIL table=tickets policy=tickets_chauffeur_run_select role=authenticated detail=K1 expected policy recreated via ticket_is_visible_to_run_chauffeur helper';
    end if;
    raise notice '[smoke_rls] 16.1 service_runs recursion: behavioural matrix skipped (auth fixture); structural checks OK';
    return;
  end if;

  update public.profiles set role = 'chauffeur' where id = v_chauffeur;

  perform set_config('request.jwt.claim.sub', v_chauffeur::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  begin
    select count(*) into v_cnt from public.service_runs;
  exception
    when others then
      reset role;
      if sqlstate = '42P17' then
        raise exception
          '[smoke_rls] FAIL table=service_runs policy=service_runs_select_party role=authenticated detail=K1 SQLSTATE 42P17 infinite recursion ? apply 20260426170000_ops16_service_runs_tickets_rls_helpers.sql';
      else
        raise;
      end if;
  end;

  reset role;

  raise notice '[smoke_rls] 16.1 service_runs chauffeur SELECT (no 42P17): OK (% rows visible)', v_cnt;
end
$epic16_161_service_runs_no_recursion$;

-- 20) Epic 16 / Story 16.1 follow-up ? `trips` ? `booking_trips` recursion guard
--     Cycle: SELECT public.trips ? `trips_select_account_member` body queries
--     `booking_trips` ? Postgres evaluates booking_trips SELECT policies (OR
--     semantics) ? `booking_trips_select_chauffeur` body queries `public.trips`
--     ? re-enters trips RLS ? SQLSTATE 42P17. Same class as K1, unmasked once
--     the K1 service_runs/tickets fix shipped. Fix migration
--     `20260426180000_ops16_trips_booking_trips_rls_helpers.sql` installs
--     SECURITY DEFINER helpers (`booking_trip_is_visible_to_chauffeur(uuid)`,
--     `trip_is_visible_to_account_member(uuid)`,
--     `booking_trip_is_visible_to_account_member(uuid)`).
--     This block authenticates as a chauffeur fixture and an account-member
--     fixture in turn, and asserts `select count(*) from public.trips` AND
--     `select count(*) from public.booking_trips` do NOT raise `42P17`.
do $epic16_161_trips_booking_trips_no_recursion$
declare
  v_inst uuid;
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_chauffeur uuid := gen_random_uuid();
  v_member uuid := gen_random_uuid();
  v_account uuid := gen_random_uuid();
  v_booking uuid := gen_random_uuid();
  v_use_email_confirmed boolean;
  v_chauffeur_fixture_ok boolean := true;
  v_member_fixture_ok boolean := true;
  v_cnt_trips bigint;
  v_cnt_booking_trips bigint;
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice '[smoke_rls] skip 16.1 follow-up trips?booking_trips recursion: auth schema not present';
    return;
  end if;

  -- All three helpers MUST exist post-fix; surface a clear actionable failure if missing.
  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'booking_trip_is_visible_to_chauffeur'
  ) then
    raise exception
      '[smoke_rls] FAIL table=booking_trips policy=booking_trips_select_chauffeur role=authenticated detail=K1 follow-up helper public.booking_trip_is_visible_to_chauffeur(uuid) missing ? apply migration 20260426180000_ops16_trips_booking_trips_rls_helpers.sql';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'trip_is_visible_to_account_member'
  ) then
    raise exception
      '[smoke_rls] FAIL table=trips policy=trips_select_account_member role=authenticated detail=K1 follow-up helper public.trip_is_visible_to_account_member(uuid) missing ? apply migration 20260426180000_ops16_trips_booking_trips_rls_helpers.sql';
  end if;

  if not exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'booking_trip_is_visible_to_account_member'
  ) then
    raise exception
      '[smoke_rls] FAIL table=booking_trips policy=booking_trips_select_account_member role=authenticated detail=K1 follow-up helper public.booking_trip_is_visible_to_account_member(uuid) missing ? apply migration 20260426180000_ops16_trips_booking_trips_rls_helpers.sql';
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) into v_use_email_confirmed;

  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into v_inst;

  -- ----- 20a) Chauffeur path -------------------------------------------------
  begin
    if v_use_email_confirmed then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        v_inst, v_chauffeur, 'authenticated', 'authenticated',
        'smoke161fu-' || v_suffix || '-chauffeur@smoke.vestroo.invalid',
        crypt('x', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
      );
    else
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        v_inst, v_chauffeur, 'authenticated', 'authenticated',
        'smoke161fu-' || v_suffix || '-chauffeur@smoke.vestroo.invalid',
        crypt('x', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
      );
    end if;
  exception
    when others then
      v_chauffeur_fixture_ok := false;
      raise notice '[smoke_rls] 16.1 follow-up chauffeur auth.users fixture skipped: %', sqlerrm;
  end;

  if v_chauffeur_fixture_ok then
    update public.profiles set role = 'chauffeur' where id = v_chauffeur;

    perform set_config('request.jwt.claim.sub', v_chauffeur::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;

    begin
      select count(*) into v_cnt_trips from public.trips;
      select count(*) into v_cnt_booking_trips from public.booking_trips;
    exception
      when others then
        reset role;
        if sqlstate = '42P17' then
          raise exception
            '[smoke_rls] FAIL table=trips|booking_trips policy=trips_select_account_member|booking_trips_select_chauffeur role=authenticated detail=K1 follow-up SQLSTATE 42P17 infinite recursion ? apply migration 20260426180000_ops16_trips_booking_trips_rls_helpers.sql';
        else
          raise;
        end if;
    end;

    reset role;
    raise notice
      '[smoke_rls] 16.1 follow-up chauffeur SELECT (no 42P17): OK trips=% booking_trips=%',
      v_cnt_trips, v_cnt_booking_trips;
  else
    -- Even without a JWT fixture, surface the structural facts: helpers exist
    -- (asserted above) and the three policies are recreated via those helpers.
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'booking_trips'
        and policyname = 'booking_trips_select_chauffeur'
        and cmd = 'SELECT'
    ) then
      raise exception
        '[smoke_rls] FAIL table=booking_trips policy=booking_trips_select_chauffeur role=authenticated detail=K1 follow-up expected policy recreated via booking_trip_is_visible_to_chauffeur helper';
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'trips'
        and policyname = 'trips_select_account_member'
        and cmd = 'SELECT'
    ) then
      raise exception
        '[smoke_rls] FAIL table=trips policy=trips_select_account_member role=authenticated detail=K1 follow-up expected policy recreated via trip_is_visible_to_account_member helper';
    end if;
    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = 'booking_trips'
        and policyname = 'booking_trips_select_account_member'
        and cmd = 'SELECT'
    ) then
      raise exception
        '[smoke_rls] FAIL table=booking_trips policy=booking_trips_select_account_member role=authenticated detail=K1 follow-up expected policy recreated via booking_trip_is_visible_to_account_member helper';
    end if;
    raise notice '[smoke_rls] 16.1 follow-up chauffeur path: behavioural matrix skipped (auth fixture); structural checks OK';
  end if;

  -- ----- 20b) Account-member path -------------------------------------------
  begin
    if v_use_email_confirmed then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        v_inst, v_member, 'authenticated', 'authenticated',
        'smoke161fu-' || v_suffix || '-member@smoke.vestroo.invalid',
        crypt('x', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
      );
    else
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      ) values (
        v_inst, v_member, 'authenticated', 'authenticated',
        'smoke161fu-' || v_suffix || '-member@smoke.vestroo.invalid',
        crypt('x', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
      );
    end if;
  exception
    when others then
      v_member_fixture_ok := false;
      raise notice '[smoke_rls] 16.1 follow-up account-member auth.users fixture skipped: %', sqlerrm;
  end;

  if not v_member_fixture_ok then
    raise notice '[smoke_rls] 16.1 follow-up account-member path: behavioural matrix skipped (auth fixture)';
    return;
  end if;

  update public.profiles set role = 'customer' where id = v_member;

  insert into public.customer_accounts (id, name, slug, status)
  values (v_account, 'smoke 16.1-fu account', 'smoke-161fu-' || v_suffix, 'active');

  insert into public.customer_account_members (account_id, email, profile_id, role)
  values (
    v_account,
    'smoke161fu-' || v_suffix || '-member@smoke.vestroo.invalid',
    v_member,
    'booker'
  );

  insert into public.bookings (
    id, customer_id, total_amount, client_type, customer_account_id,
    status, payment_status, booking_intent
  ) values (
    v_booking, v_member, 100, 'account_client', v_account,
    'pending', 'pending', 'point_to_point'
  );

  perform set_config('request.jwt.claim.sub', v_member::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  begin
    select count(*) into v_cnt_trips from public.trips;
    select count(*) into v_cnt_booking_trips from public.booking_trips;
  exception
    when others then
      reset role;
      if sqlstate = '42P17' then
        raise exception
          '[smoke_rls] FAIL table=trips|booking_trips policy=trips_select_account_member|booking_trips_select_account_member role=authenticated detail=K1 follow-up SQLSTATE 42P17 infinite recursion ? apply migration 20260426180000_ops16_trips_booking_trips_rls_helpers.sql';
      else
        raise;
      end if;
  end;

  reset role;
  raise notice
    '[smoke_rls] 16.1 follow-up account-member SELECT (no 42P17): OK trips=% booking_trips=%',
    v_cnt_trips, v_cnt_booking_trips;
end
$epic16_161_trips_booking_trips_no_recursion$;

-- ---------------------------------------------------------------------------
-- Epic 16 Theme O / US-O2 ? 42P17 sweep on policy-bearing tables (lint complement).
-- Fails fast if SELECT 1 hits infinite recursion in RLS for any listed table.
-- See docs/adr/0006-rls-cross-table-helpers.md; scripts/lint-rls-policies.mjs.
-- ---------------------------------------------------------------------------
do $epic16_o2_rls_recursion_sweep$
declare
  tbl text;
begin
  for tbl in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename in (
        'profiles',
        'bookings',
        'booking_trips',
        'trips',
        'service_runs',
        'tickets',
        'chauffeur_assignments',
        'customer_accounts',
        'customer_account_members',
        'booking_quotes',
        'ops_audit_log',
        'ops_alerts',
        'ops_settings',
        'vehicle_trackings',
        'shared_itineraries',
        'service_run_manifest_entries',
        'vehicle_maintenance_records',
        'vehicle_fuel_logs'
      )
  loop
    begin
      execute format('select 1 from public.%I limit 1', tbl);
    exception
      when sqlstate '42P17' then
        raise exception
          '[smoke_rls] FAIL table=% policy=n/a role=n/a detail=Epic 16 US-O2 SQLSTATE 42P17 infinite recursion',
          tbl;
    end;
  end loop;
end
$epic16_o2_rls_recursion_sweep$;

-- 21) Epic 16 / Story 16.9 ? Theme B / US-B1: `bookings` availability-check columns + RLS
do $epic16_b1_availability$
declare
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_inst uuid;
  v_customer uuid := gen_random_uuid();
  v_chauffeur uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_cat uuid := gen_random_uuid();
  v_vehicle uuid := gen_random_uuid();
  v_schedule uuid := gen_random_uuid();
  v_trip uuid := gen_random_uuid();
  v_booking uuid := gen_random_uuid();
  v_use_email_confirmed boolean;
  v_sel_cnt bigint;
  v_upd_cnt bigint;
  v_at timestamptz;
  v_by uuid;
  v_chk jsonb;
  v_col text;
  v_attnum smallint;
begin
  -- Structural: columns
  if (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name in (
        'availability_checked_at',
        'availability_checked_by',
        'availability_check'
      )
  ) is distinct from 3 then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=n/a role=n/a detail=B1 expected three availability_* columns ? apply 20260426211520_ops16_availability_check_columns.sql';
  end if;

  -- Structural: partial index
  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'bookings'
      and indexname = 'idx_bookings_availability_checked'
  ) then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=n/a role=n/a detail=B1 idx_bookings_availability_checked missing ? apply 20260426211520_ops16_availability_check_columns.sql';
  end if;

  -- Structural: COMMENT ON COLUMN (via col_description)
  foreach v_col in array array['availability_checked_at', 'availability_checked_by', 'availability_check']
  loop
    select a.attnum
      into v_attnum
    from pg_catalog.pg_attribute a
    where a.attrelid = 'public.bookings'::regclass
      and a.attname = v_col
      and a.attnum > 0
      and not a.attisdropped;

    if v_attnum is null then
      raise exception
        '[smoke_rls] FAIL table=bookings policy=n/a role=n/a detail=B1 column % missing on bookings', v_col;
    end if;

    if col_description('public.bookings'::regclass, v_attnum) is null then
      raise exception
        '[smoke_rls] FAIL table=bookings policy=n/a role=n/a detail=B1 COMMENT ON COLUMN bookings.% missing', v_col;
    end if;
  end loop;

  -- No story-scoped new policy name on bookings (inherit `bookings_update` only)
  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bookings'
      and policyname ilike '%availability%'
  ) then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=n/a role=n/a detail=B1 unexpected bookings policy name containing availability ? US-B1 adds no policy';
  end if;

  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice '[smoke_rls] skip Epic 16 B1 behavioural: auth schema not present';
    raise notice '[smoke_rls] Epic 16 / Story 16.9 Theme B / US-B1 structural: OK';
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) into v_use_email_confirmed;

  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into v_inst;

  begin
    if v_use_email_confirmed then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_customer, 'authenticated', 'authenticated',
         'smoke169-' || v_suffix || '-cust@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_chauffeur, 'authenticated', 'authenticated',
         'smoke169-' || v_suffix || '-drv@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_admin, 'authenticated', 'authenticated',
         'smoke169-' || v_suffix || '-adm@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    else
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_customer, 'authenticated', 'authenticated',
         'smoke169-' || v_suffix || '-cust@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_chauffeur, 'authenticated', 'authenticated',
         'smoke169-' || v_suffix || '-drv@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_admin, 'authenticated', 'authenticated',
         'smoke169-' || v_suffix || '-adm@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    end if;
  exception
    when others then
      raise notice '[smoke_rls] Epic 16 B1 auth.users fixture skipped: %', sqlerrm;
      raise notice '[smoke_rls] Epic 16 / Story 16.9 Theme B / US-B1 structural: OK (behavioural skipped)';
      return;
  end;

  update public.profiles set role = 'customer' where id = v_customer;
  update public.profiles set role = 'chauffeur' where id = v_chauffeur;
  update public.profiles set role = 'admin' where id = v_admin;

  insert into public.vehicle_categories (id, name, description, number_of_seat)
  values (v_cat, 'smoke-b1-cat-' || v_suffix, 'smoke', 4);

  insert into public.vehicles (id, name, category_id, license_plate)
  values (v_vehicle, 'smoke-b1-veh-' || v_suffix, v_cat, 'SMK' || upper(left(v_suffix, 8)));

  insert into public.chauffeur_schedules (
    id, chauffeur_id, work_date, vehicle_id, status
  ) values (
    v_schedule, v_chauffeur, (current_date at time zone 'utc')::date, v_vehicle, 'not_started'
  );

  insert into public.trips (
    id,
    customer_id,
    chauffeur_id,
    time_start,
    time_end,
    time_start_estimate,
    time_end_estimate,
    vehicle_id,
    schedule_id,
    service_type,
    trip_coordinates,
    service_payload,
    amount,
    status
  ) values (
    v_trip,
    v_customer,
    v_chauffeur,
    null,
    null,
    now(),
    now() + interval '1 hour',
    v_vehicle,
    v_schedule,
    'charter',
    '[]'::jsonb,
    '{}'::jsonb,
    100,
    'assigned'
  );

  insert into public.bookings (
    id, customer_id, total_amount, client_type, customer_account_id,
    status, payment_status, booking_intent
  ) values (
    v_booking, v_customer, 88, 'walk_in', null,
    'triaged', 'pending', 'point_to_point'
  );

  insert into public.booking_trips (booking_id, trip_id, sort_order)
  values (v_booking, v_trip, 0);

  -- Chauffeur: may SELECT booking via `bookings_select_chauffeur_linked`
  perform set_config('request.jwt.claim.sub', v_chauffeur::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  select count(*) into v_sel_cnt from public.bookings where id = v_booking;
  if v_sel_cnt is distinct from 1 then
    reset role;
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_select_chauffeur_linked role=authenticated detail=B1 chauffeur must see linked booking (got %)', v_sel_cnt;
  end if;

  -- Chauffeur: must not persist availability-only UPDATE (not customer_id / not staff ? USING fails)
  update public.bookings
  set
    availability_checked_at = now(),
    availability_checked_by = v_chauffeur,
    availability_check = '{"attempt":"chauffeur"}'::jsonb
  where id = v_booking;
  get diagnostics v_upd_cnt = row_count;
  reset role;

  if v_upd_cnt is distinct from 0 then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_update role=authenticated detail=B1 chauffeur must not update availability columns (row_count=%)', v_upd_cnt;
  end if;

  select availability_checked_at, availability_checked_by
    into v_at, v_by
  from public.bookings
  where id = v_booking;

  if v_at is not null or v_by is not null then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_update role=authenticated detail=B1 availability columns must stay null after chauffeur UPDATE';
  end if;

  -- Staff positive control: existing `bookings_update` WITH CHECK allows staff to set columns
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  update public.bookings
  set
    availability_checked_at = now(),
    availability_checked_by = v_admin,
    availability_check = '{"ok":true,"detail":"smoke_b1"}'::jsonb
  where id = v_booking;
  get diagnostics v_upd_cnt = row_count;
  reset role;

  if v_upd_cnt is distinct from 1 then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_update role=authenticated detail=B1 staff must persist availability columns (row_count=%)', v_upd_cnt;
  end if;

  select availability_checked_at, availability_checked_by, availability_check
    into v_at, v_by, v_chk
  from public.bookings
  where id = v_booking;

  if v_at is null or v_by is distinct from v_admin or v_chk is null then
    raise exception
      '[smoke_rls] FAIL table=bookings policy=bookings_update role=authenticated detail=B1 staff UPDATE did not persist availability snapshot';
  end if;

  raise notice '[smoke_rls] Epic 16 / Story 16.9 Theme B / US-B1 availability columns + RLS: OK';
end
$epic16_b1_availability$;

-- 22) Epic 16 / Story 16.10 ? Theme G / US-G1: `ops_alerts` + RLS (Q28 v1 kinds)
do $epic16_g1_ops_alerts$
declare
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_alert uuid := gen_random_uuid();
  v_inst uuid;
  v_staff uuid := gen_random_uuid();
  v_customer uuid := gen_random_uuid();
  v_use_email_confirmed boolean;
  v_cnt bigint;
  v_ack_at timestamptz;
  v_ack_by uuid;
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'ops_alerts'
      and c.relkind = 'r'
  ) then
    raise exception
      '[smoke_rls] FAIL table=ops_alerts policy=n/a role=n/a detail=G1 table missing ? apply 20260426213503_ops16_ops_alerts_table.sql';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'ops_alerts'
      and indexname = 'idx_ops_alerts_open'
  )
  or not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'ops_alerts'
      and indexname = 'idx_ops_alerts_subject'
  ) then
    raise exception
      '[smoke_rls] FAIL table=ops_alerts policy=n/a role=n/a detail=G1 expected indexes idx_ops_alerts_open + idx_ops_alerts_subject';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ops_alerts'
      and policyname = 'ops_alerts_staff_select'
      and cmd = 'SELECT'
  )
  or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ops_alerts'
      and policyname = 'ops_alerts_staff_acknowledge'
      and cmd = 'UPDATE'
  ) then
    raise exception
      '[smoke_rls] FAIL table=ops_alerts policy=ops_alerts_staff_select|ops_alerts_staff_acknowledge role=authenticated detail=G1 expected staff policies';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ops_alerts'
      and cmd = 'INSERT'
  ) then
    raise exception
      '[smoke_rls] FAIL table=ops_alerts policy=n/a role=n/a detail=G1 no INSERT policy must exist on ops_alerts';
  end if;

  -- Superuser / bypass INSERT (matches service-role-only ingest; smoke session is postgres)
  insert into public.ops_alerts (
    id, kind, severity, subject_table, subject_id, payload
  ) values (
    v_alert,
    'delayed_trip',
    'high',
    'trips',
    gen_random_uuid(),
    '{"smoke":"g1"}'::jsonb
  );

  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice '[smoke_rls] skip Epic 16 G1 behavioural: auth schema not present';
    raise notice '[smoke_rls] Epic 16 / Story 16.10 Theme G / US-G1 structural: OK';
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) into v_use_email_confirmed;

  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into v_inst;

  begin
    if v_use_email_confirmed then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_staff, 'authenticated', 'authenticated',
         'smoke1610-' || v_suffix || '-staff@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_customer, 'authenticated', 'authenticated',
         'smoke1610-' || v_suffix || '-cust@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    else
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_staff, 'authenticated', 'authenticated',
         'smoke1610-' || v_suffix || '-staff@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_customer, 'authenticated', 'authenticated',
         'smoke1610-' || v_suffix || '-cust@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    end if;
  exception
    when others then
      raise notice '[smoke_rls] Epic 16 G1 auth.users fixture skipped: %', sqlerrm;
      raise notice '[smoke_rls] Epic 16 / Story 16.10 Theme G / US-G1 structural: OK (behavioural skipped)';
      return;
  end;

  update public.profiles set role = 'dispatcher' where id = v_staff;
  update public.profiles set role = 'customer' where id = v_customer;

  -- Staff: SELECT open row
  perform set_config('request.jwt.claim.sub', v_staff::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  select count(*) into v_cnt from public.ops_alerts where id = v_alert;
  if v_cnt is distinct from 1 then
    reset role;
    raise exception
      '[smoke_rls] FAIL table=ops_alerts policy=ops_alerts_staff_select role=authenticated detail=G1 staff must see alert (count=%)', v_cnt;
  end if;

  -- Staff: UPDATE acknowledge
  update public.ops_alerts
  set
    acknowledged_at = now(),
    acknowledged_by = v_staff
  where id = v_alert;
  get diagnostics v_cnt = row_count;
  if v_cnt is distinct from 1 then
    reset role;
    raise exception
      '[smoke_rls] FAIL table=ops_alerts policy=ops_alerts_staff_acknowledge role=authenticated detail=G1 acknowledge row_count=%', v_cnt;
  end if;

  reset role;

  select acknowledged_at, acknowledged_by
    into v_ack_at, v_ack_by
  from public.ops_alerts
  where id = v_alert;

  if v_ack_at is null or v_ack_by is distinct from v_staff then
    raise exception
      '[smoke_rls] FAIL table=ops_alerts policy=ops_alerts_staff_acknowledge role=authenticated detail=G1 acknowledge columns not persisted';
  end if;

  -- Customer: must not SELECT the row
  perform set_config('request.jwt.claim.sub', v_customer::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  select count(*) into v_cnt from public.ops_alerts where id = v_alert;
  reset role;

  if v_cnt is distinct from 0 then
    raise exception
      '[smoke_rls] FAIL table=ops_alerts policy=ops_alerts_staff_select role=authenticated detail=G1 customer must not read ops_alerts (count=%)', v_cnt;
  end if;

  -- Customer: must not INSERT (no policy ? RLS deny)
  begin
    perform set_config('request.jwt.claim.sub', v_customer::text, true);
    perform set_config('request.jwt.claim.role', 'authenticated', true);
    set local role authenticated;
    insert into public.ops_alerts (kind, severity, subject_table, subject_id, payload)
    values ('overdue_invoice', 'low', 'bookings', null, '{}'::jsonb);
    reset role;
    raise exception
      '[smoke_rls] FAIL table=ops_alerts policy=n/a role=authenticated detail=G1 customer INSERT must be denied';
  exception
    when insufficient_privilege then
      reset role;
    when others then
      reset role;
      if sqlstate = '42501' or sqlerrm ilike '%row-level security%' then
        null;
      else
        raise;
      end if;
  end;

  raise notice '[smoke_rls] Epic 16 / Story 16.10 Theme G / US-G1 ops_alerts + RLS: OK';
end
$epic16_g1_ops_alerts$;

-- 23) Epic 16 / Story 16.11 ? Theme N / US-N1: `ops_settings` + RLS (Q31 bank row; no DB masking)
do $epic16_n1_ops_settings$
declare
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_inst uuid;
  v_dispatcher uuid := gen_random_uuid();
  v_admin uuid := gen_random_uuid();
  v_use_email_confirmed boolean;
  v_cnt bigint;
  v_upd_cnt bigint;
  v_ts_before timestamptz;
  v_ts_after timestamptz;
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'ops_settings'
      and c.relkind = 'r'
  ) then
    raise exception
      '[smoke_rls] FAIL table=ops_settings policy=n/a role=n/a detail=N1 table missing ? apply 20260426220000_ops16_ops_settings_and_payment_columns.sql';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ops_settings'
      and policyname = 'ops_settings_staff_select'
      and cmd = 'SELECT'
  )
  or not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'ops_settings'
      and policyname = 'ops_settings_admin_update'
      and cmd = 'UPDATE'
  ) then
    raise exception
      '[smoke_rls] FAIL table=ops_settings policy=ops_settings_staff_select|ops_settings_admin_update role=authenticated detail=N1 expected policies';
  end if;

  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice '[smoke_rls] skip Epic 16 N1 behavioural: auth schema not present';
    raise notice '[smoke_rls] Epic 16 / Story 16.11 Theme N / US-N1 structural: OK';
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) into v_use_email_confirmed;

  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into v_inst;

  begin
    if v_use_email_confirmed then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_dispatcher, 'authenticated', 'authenticated',
         'smoke1611-' || v_suffix || '-dsp@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_admin, 'authenticated', 'authenticated',
         'smoke1611-' || v_suffix || '-adm@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    else
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_dispatcher, 'authenticated', 'authenticated',
         'smoke1611-' || v_suffix || '-dsp@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()),
        (v_inst, v_admin, 'authenticated', 'authenticated',
         'smoke1611-' || v_suffix || '-adm@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    end if;
  exception
    when others then
      raise notice '[smoke_rls] Epic 16 N1 auth.users fixture skipped: %', sqlerrm;
      raise notice '[smoke_rls] Epic 16 / Story 16.11 Theme N / US-N1 structural: OK (behavioural skipped)';
      return;
  end;

  update public.profiles set role = 'dispatcher' where id = v_dispatcher;
  update public.profiles set role = 'admin' where id = v_admin;

  -- Staff (dispatcher): may SELECT `bank_account` (RLS does not mask; app helper masks for dispatchers)
  perform set_config('request.jwt.claim.sub', v_dispatcher::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  select count(*) into v_cnt
  from public.ops_settings
  where key = 'bank_account';
  if v_cnt is distinct from 1 then
    reset role;
    raise exception
      '[smoke_rls] FAIL table=ops_settings policy=ops_settings_staff_select role=authenticated detail=N1 dispatcher must read bank_account row (count=%)', v_cnt;
  end if;

  -- Non-admin staff: UPDATE must not affect rows (USING on admin policy; RLS may surface as row_count=0, not 42501)
  update public.ops_settings
  set updated_at = now()
  where key = 'bank_account';
  get diagnostics v_upd_cnt = row_count;
  reset role;

  if v_upd_cnt is distinct from 0 then
    raise exception
      '[smoke_rls] FAIL table=ops_settings policy=ops_settings_admin_update role=authenticated detail=N1 dispatcher must not update ops_settings (row_count=%)', v_upd_cnt;
  end if;

  -- Admin: may UPDATE (WITH CHECK)
  select updated_at into v_ts_before
  from public.ops_settings
  where key = 'bank_account';

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  update public.ops_settings
  set updated_at = now(), updated_by = v_admin
  where key = 'bank_account';
  get diagnostics v_upd_cnt = row_count;
  reset role;

  if v_upd_cnt is distinct from 1 then
    raise exception
      '[smoke_rls] FAIL table=ops_settings policy=ops_settings_admin_update role=authenticated detail=N1 admin UPDATE row_count=%', v_upd_cnt;
  end if;

  select updated_at into v_ts_after
  from public.ops_settings
  where key = 'bank_account';

  if v_ts_after is not distinct from v_ts_before or v_ts_after is null then
    raise exception
      '[smoke_rls] FAIL table=ops_settings policy=ops_settings_admin_update role=authenticated detail=N1 admin UPDATE did not change updated_at';
  end if;

  raise notice '[smoke_rls] Epic 16 / Story 16.11 Theme N / US-N1 ops_settings + RLS: OK';
end
$epic16_n1_ops_settings$;

-- 24) Epic 16 / Story 16.12 ? Phase 1 `driver_assignments` read-only view (Q34)
do $epic16_p1_driver_assignments_view$
declare
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_inst uuid;
  v_dispatcher uuid := gen_random_uuid();
  v_use_email_confirmed boolean;
  v_cnt bigint;
begin
  if not exists (
    select 1
    from pg_views
    where schemaname = 'public'
      and viewname = 'driver_assignments'
  ) then
    raise exception
      '[smoke_rls] FAIL table=driver_assignments policy=n/a role=n/a detail=P1_DRIVER_ASSIGNMENTS_VIEW view missing ? apply 20260426231000_ops16_driver_assignments_view.sql';
  end if;

  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice '[smoke_rls] skip Epic 16.12 P1 driver_assignments view behavioural: auth schema not present';
    raise notice '[smoke_rls] Epic 16 / Story 16.12 Phase 1 driver_assignments view structural: OK';
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) into v_use_email_confirmed;

  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into v_inst;

  begin
    if v_use_email_confirmed then
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_dispatcher, 'authenticated', 'authenticated',
         'smoke1612-' || v_suffix || '-dsp@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    else
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at
      )
      values
        (v_inst, v_dispatcher, 'authenticated', 'authenticated',
         'smoke1612-' || v_suffix || '-dsp@smoke.vestroo.invalid', crypt('x', gen_salt('bf')), now(),
         '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now());
    end if;
  exception
    when others then
      raise notice '[smoke_rls] Epic 16.12 P1 auth.users fixture skipped: %', sqlerrm;
      raise notice '[smoke_rls] Epic 16 / Story 16.12 Phase 1 driver_assignments view structural: OK (behavioural skipped)';
      return;
  end;

  update public.profiles set role = 'dispatcher' where id = v_dispatcher;

  perform set_config('request.jwt.claim.sub', v_dispatcher::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  set local role authenticated;

  begin
    select count(*) into v_cnt from public.driver_assignments;
  exception
    when insufficient_privilege then
      reset role;
      raise exception
        '[smoke_rls] FAIL table=driver_assignments policy=underlying_chauffeur_assignments_rls role=authenticated detail=P1_DRIVER_ASSIGNMENTS_VIEW staff SELECT denied (insufficient_privilege)';
    when others then
      reset role;
      if sqlstate = '42501' or sqlerrm ilike '%row-level security%' then
        raise exception
          '[smoke_rls] FAIL table=driver_assignments policy=n/a role=authenticated detail=P1_DRIVER_ASSIGNMENTS_VIEW staff SELECT failed: %', sqlerrm;
      else
        raise;
      end if;
  end;

  reset role;

  if v_cnt is null then
    raise exception
      '[smoke_rls] FAIL table=driver_assignments policy=n/a role=authenticated detail=P1_DRIVER_ASSIGNMENTS_VIEW count(*) is null';
  end if;

  raise notice '[smoke_rls] Epic 16 / Story 16.12 Phase 1 driver_assignments view: OK';
end
$epic16_p1_driver_assignments_view$;

do $done$
begin
  raise notice '[smoke_rls] done: all assertions passed';
end
$done$;

rollback;
