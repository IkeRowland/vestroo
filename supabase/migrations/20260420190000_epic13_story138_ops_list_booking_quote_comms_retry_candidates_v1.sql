-- Epic 13 / Story 13.8 — Staff-only list of booking quotes needing trip-confirmation comms recovery
-- (retry queue). See story Progress Notes for predicate + strike counting.

create or replace function public.ops_list_booking_quote_comms_retry_candidates_v1()
returns table (
	quote_id uuid,
	booking_id uuid,
	sent_to_email text,
	quote_version integer,
	failure_strike_count integer,
	last_email_send_failed_at timestamptz,
	last_email_sent_at timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
	select
		bq.id as quote_id,
		bq.booking_id,
		bq.sent_to_email,
		bq.version as quote_version,
		coalesce(fail_cnt.c, 0)::integer as failure_strike_count,
		fa.last_fail as last_email_send_failed_at,
		ls.last_sent as last_email_sent_at
	from public.booking_quotes bq
	left join lateral (
		select max(o.created_at) as last_sent
		from public.ops_audit_log o
		where o.entity = 'booking_quotes'
			and o.entity_id = bq.id
			and o.action = 'email_sent'
	) ls on true
	left join lateral (
		select max(o.created_at) as last_fail
		from public.ops_audit_log o
		where o.entity = 'booking_quotes'
			and o.entity_id = bq.id
			and o.action = 'email_send_failed'
	) fa on true
	left join lateral (
		select max(o.created_at) as last_abandon
		from public.ops_audit_log o
		where o.entity = 'booking_quotes'
			and o.entity_id = bq.id
			and o.action = 'email_retry_abandoned'
	) ab on true
	left join lateral (
		select count(*)::bigint as c
		from public.ops_audit_log o
		where o.entity = 'booking_quotes'
			and o.entity_id = bq.id
			and o.action = 'email_send_failed'
			and o.created_at > coalesce(ls.last_sent, '-infinity'::timestamptz)
	) fail_cnt on true
	where public.is_staff(auth.uid())
		and bq.status = 'sent'
		and coalesce(ab.last_abandon, '-infinity'::timestamptz)
			<= coalesce(fa.last_fail, '-infinity'::timestamptz)
		and (
			bq.rendered_html is null
			or coalesce(fa.last_fail, '-infinity'::timestamptz)
				> coalesce(ls.last_sent, '-infinity'::timestamptz)
		);
$$;

comment on function public.ops_list_booking_quote_comms_retry_candidates_v1() is
	'Epic 13 / 13.8: staff-only; booking_quotes.status=sent comms-retry candidates per US-C2 '
	'(missing rendered_html OR last email_send_failed newer than last email_sent), excluding rows '
	'cleared by email_retry_abandoned after the last failure.';

revoke all on function public.ops_list_booking_quote_comms_retry_candidates_v1() from public;
grant execute on function public.ops_list_booking_quote_comms_retry_candidates_v1() to authenticated;
