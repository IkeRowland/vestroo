-- Epic 13 / Story 13.7 — Persist optional `booking_quotes.rendered_html` with send; idempotent backfill when HTML was missing.
-- DROP required: PG does not allow CREATE OR REPLACE when changing the signature (added parameter).

drop function if exists public.ops_send_booking_quote_v1(uuid, text);

create function public.ops_send_booking_quote_v1(
  p_quote_id uuid,
  p_sent_to_email text,
  p_rendered_html text default null
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  v_is_staff boolean;
  v_booking_id uuid;
  v_quote_status text;
  v_booking_status text;
  v_email text;
  v_rendered text;
begin
  select coalesce(public.is_staff(auth.uid()), false) into v_is_staff;
  if not v_is_staff then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select bq.booking_id, bq.status
    into v_booking_id, v_quote_status
  from public.booking_quotes bq
  where bq.id = p_quote_id
  for update;

  if v_booking_id is null then
    return jsonb_build_object('ok', false, 'error', 'quote_not_found');
  end if;

  v_rendered := null;
  if p_rendered_html is not null and trim(p_rendered_html) <> '' then
    v_rendered := trim(p_rendered_html);
  end if;

  if v_quote_status = 'sent' then
    update public.bookings b
      set current_quote_id = p_quote_id
      where b.id = v_booking_id
        and b.current_quote_id is distinct from p_quote_id;

    if v_rendered is not null then
      update public.booking_quotes bq
        set rendered_html = v_rendered
        where bq.id = p_quote_id
          and bq.rendered_html is null;
    end if;

    return jsonb_build_object('ok', true, 'idempotent', true);
  end if;

  v_email := lower(trim(p_sent_to_email));
  if v_email is null or v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  select b.status
    into v_booking_status
  from public.bookings b
  where b.id = v_booking_id
  for update;

  if v_booking_status in ('cancelled', 'expired') then
    return jsonb_build_object('ok', false, 'error', 'booking_not_sendable');
  end if;

  if v_quote_status is distinct from 'draft' then
    return jsonb_build_object('ok', false, 'error', 'invalid_quote_state');
  end if;

  update public.booking_quotes
  set
    status = 'sent',
    sent_at = now(),
    sent_to_email = v_email,
    sent_by = auth.uid(),
    rendered_html = coalesce(v_rendered, rendered_html)
  where id = p_quote_id;

  update public.bookings
  set current_quote_id = p_quote_id
  where id = v_booking_id;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.ops_send_booking_quote_v1(uuid, text, text) is
  'Epic 13: staff-only (is_staff); idempotent when quote already sent (optional rendered_html backfill); '
  'draft→sent stores optional rendered_html; updates current_quote_id atomically with quote send.';

revoke all on function public.ops_send_booking_quote_v1(uuid, text, text) from public;
grant execute on function public.ops_send_booking_quote_v1(uuid, text, text) to authenticated;
