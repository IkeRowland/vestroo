-- RLS smoke / structural checks (run as postgres or in Dashboard SQL after migrations are applied to the hosted or target database).
-- These assertions do not impersonate JWT roles; they verify deny-by-default posture and helpers.
-- For per-role behaviour, use the manual steps in docs/local-development.md (RLS smoke tests).

-- 1) RLS enabled on representative tables (deny-by-default for anon without policies)
select c.relname as table_name, c.relrowsecurity as rls_on
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles', 'bookings', 'tickets', 'trips', 'service_points', 'service_routes',
    'vehicle_trackings', 'chauffeur_assignments', 'chauffeur_schedules', 'ops_audit_log'
  )
  and c.relkind = 'r'
order by c.relname;
-- Expect rls_on = true for each.

-- 2) is_staff() definition uses admin + dispatcher only (not chauffeur)
select pg_get_functiondef(p.oid) as def
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'is_staff';
-- Expect body to reference roles admin and dispatcher only.

-- 3) profiles.role CHECK allows epic vocabulary only
select conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'public.profiles'::regclass
  and contype = 'c'
  and conname = 'profiles_role_check';
-- Expect: customer, chauffeur, dispatcher, admin

-- 4) Policy inventory (spot-check names exist after VST-5 renames)
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public'
  and tablename in (
    'bookings', 'tickets', 'trips', 'chauffeur_schedules', 'vehicle_trackings', 'ops_audit_log', 'notifications'
  )
order by tablename, policyname;
-- After VST-8 migration, expect on bookings: bookings_select_chauffeur_linked;
-- on booking_trips: booking_trips_select_chauffeur;
-- on ops_audit_log: ops_audit_log_chauffeur_insert (and updated ops_audit_log_staff_insert with actor_role).
-- After VST-9 migration, expect on notifications: notifications_chauffeur_customer_insert (in addition to notifications_own).
