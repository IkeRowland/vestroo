-- Epic 16 §3 Phase 1 — `public.driver_assignments` read-only view over `public.chauffeur_assignments`.
-- NOT Theme L / US-L2 (role-display). Traceability: docs/stories/16.12.story.md; docs/epic-16.md Q34.
--
-- PostgreSQL: project targets **15+** (Supabase managed: 17.x). `security_invoker = true` (PG 15+)
-- ensures row visibility is evaluated with the invoker's privileges; underlying
-- `chauffeur_assignments` RLS applies as for a direct `SELECT` (no new policies on the view).
-- `security_barrier` is not used — not required for this simple passthrough.
--
-- Q34: physical table remains `chauffeur_assignments` until Epic 17; writes stay on the base table.

create or replace view public.driver_assignments
  with (security_invoker = true)
as
select
  ca.id,
  ca.chauffeur_id,
  ca.service_route_id,
  ca.vehicle_id,
  ca.start_time,
  ca.end_time,
  ca.trip_number,
  ca.status,
  ca.checkin_time,
  ca.checkout_time,
  ca.is_late,
  ca.is_early_checkout,
  ca.current_passengers,
  ca.total_passengers,
  ca.current_point_id,
  ca.completed_point_ids,
  ca.created_at,
  ca.updated_at,
  ca.chauffeur_id as driver_id
from public.chauffeur_assignments ca;

comment on view public.driver_assignments is
  'Epic 16 Phase 1 (Q34): read-only facade over public.chauffeur_assignments; driver_id mirrors chauffeur_id for reporting/SQL ergonomy. Writes remain on the base table until docs/epic-17.md physical rename.';

grant select on public.driver_assignments to authenticated;
grant select on public.driver_assignments to service_role;
