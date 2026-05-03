-- Epic 13 / Story 13.11 — US-E1: Daily `sent` → `expired` for past-due `expires_at`.
-- Does not modify `bookings.current_quote_id`. Skips `expires_at IS NULL`.
--
-- Scheduler: `pg_cron` is NOT auto-enabled here (`CREATE EXTENSION` + `cron.schedule` require
-- hosted Supabase / superuser). After enabling **pg_cron** on the project, run § Runbook below.
-- Alternative: Supabase **Scheduled Edge Function** or Dashboard trigger calling
-- `select public.expire_sent_booking_quotes_past_due_v1();` with **service_role** daily 02:15 UTC.
--
-- Manual verification (SQL editor as postgres or via service role):
--   1. Ensure a row exists: `status = 'sent'`, `expires_at` in the past, `expires_at` not null.
--   2. `select public.expire_sent_booking_quotes_past_due_v1();`
--   3. Expect JSON `ok: true`, `transitioned_count` ≥ 1; row now `expired`; second run same day → 0 transitioned.
--   4. `select * from public.booking_quotes_expiry_job_runs order by run_at desc limit 5;` (staff UI: table + RLS).

-- =============================================================================
-- 1 — Ops-visible run log (avoid ops_audit_log: actor_id NOT NULL, no system profile)
-- =============================================================================

create table public.booking_quotes_expiry_job_runs (
  id uuid primary key default gen_random_uuid(),
  run_at timestamptz not null default now(),
  transitioned_count int not null,
  examined_count int not null default 0,
  job_version text
);

comment on table public.booking_quotes_expiry_job_runs is
  'Epic 13 / 13.11: one row per expiry job execution. Writes only from '
  'expire_sent_booking_quotes_past_due_v1(). Staff may SELECT (RLS); use for last-N run history.';

create index booking_quotes_expiry_job_runs_run_at_idx
  on public.booking_quotes_expiry_job_runs (run_at desc);

alter table public.booking_quotes_expiry_job_runs enable row level security;

-- Staff read-only; inserts from SECURITY DEFINER (bypass RLS as definer).
create policy booking_quotes_expiry_job_runs_staff_select
  on public.booking_quotes_expiry_job_runs
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

-- =============================================================================
-- 2 — Expiry RPC
-- =============================================================================

create or replace function public.expire_sent_booking_quotes_past_due_v1()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_examined int := 0;
  v_transitioned int := 0;
begin
  select count(*)::int
    into v_examined
  from public.booking_quotes
  where status = 'sent'
    and expires_at is not null
    and expires_at < now();

  update public.booking_quotes
  set status = 'expired'
  where status = 'sent'
    and expires_at is not null
    and expires_at < now();

  get diagnostics v_transitioned = row_count;

  insert into public.booking_quotes_expiry_job_runs (
    transitioned_count,
    examined_count,
    job_version
  ) values (
    v_transitioned,
    v_examined,
    'v1'
  );

  return jsonb_build_object(
    'ok', true,
    'transitioned_count', v_transitioned,
    'examined_count', v_examined
  );
end;
$$;

comment on function public.expire_sent_booking_quotes_past_due_v1() is
  'Epic 13 / 13.11: set booking_quotes to expired when sent and expires_at < now() (UTC timestamptz). '
  'Idempotent for already-expired rows. GRANT service_role (+ cron superuser).';

revoke all on function public.expire_sent_booking_quotes_past_due_v1() from public;
grant execute on function public.expire_sent_booking_quotes_past_due_v1() to service_role;

-- =============================================================================
-- Runbook: pg_cron — daily 02:15 UTC (minute 15, hour 2)
-- Enable extension: Supabase Dashboard → Database → Extensions → **pg_cron**
-- Then in SQL Editor (postgres role):
--
-- do $$
-- declare
--   jid bigint;
-- begin
--   select j.jobid into jid
--   from cron.job j
--   where j.jobname = 'vestroo_expire_sent_booking_quotes_v1'
--   limit 1;
--   if jid is not null then
--     perform cron.unschedule(jid);
--   end if;
-- end $$;
--
-- select cron.schedule(
--   'vestroo_expire_sent_booking_quotes_v1',
--   '15 2 * * *',
--   $$select public.expire_sent_booking_quotes_past_due_v1();$$
-- );
-- =============================================================================
