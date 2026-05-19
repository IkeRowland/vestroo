-- Charter-first ops: stop fan-out on `service_runs` via Realtime (no app subscribers).
alter publication supabase_realtime drop table public.service_runs;
