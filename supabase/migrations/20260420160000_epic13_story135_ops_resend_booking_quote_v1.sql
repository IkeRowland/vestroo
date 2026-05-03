-- Epic 13 / Story 13.5 — Atomic re-send: new quote version + supersede prior + send + current_quote_id
-- in one transaction (SECURITY INVOKER → RLS applies).

create or replace function public.ops_resend_booking_quote_v1(
  p_prior_quote_id uuid
)
returns jsonb
language plpgsql
volatile
security invoker
set search_path = public
as $$
declare
  -- Use v_is_staff not v_staff: PL/pgSQL can treat "v_staff" as a relation name in IF/SQL.
  v_is_staff boolean;
  v_old public.booking_quotes%rowtype;
  v_booking_status text;
  v_max int;
  v_next_version int;
  v_new_id uuid;
  v_email text;
  v_attempt int := 0;
begin
  select coalesce(public.is_staff(auth.uid()), false) into v_is_staff;
  if not v_is_staff then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select * into v_old
  from public.booking_quotes
  where id = p_prior_quote_id
  for update;

  if v_old.id is null then
    return jsonb_build_object('ok', false, 'error', 'quote_not_found');
  end if;

  if v_old.status not in ('sent', 'accepted') then
    return jsonb_build_object('ok', false, 'error', 'invalid_quote_state');
  end if;

  v_email := lower(trim(v_old.sent_to_email));
  if v_email is null or v_email = '' then
    return jsonb_build_object('ok', false, 'error', 'invalid_email');
  end if;

  select b.status
    into v_booking_status
  from public.bookings b
  where b.id = v_old.booking_id
  for update;

  if v_booking_status is null then
    return jsonb_build_object('ok', false, 'error', 'booking_not_found');
  end if;

  if v_booking_status in ('cancelled', 'expired') then
    return jsonb_build_object('ok', false, 'error', 'booking_not_sendable');
  end if;

  v_new_id := null;

  while v_attempt < 12 loop
    v_attempt := v_attempt + 1;

    select coalesce(max(bq.version), 0)
      into v_max
    from public.booking_quotes bq
    where bq.booking_id = v_old.booking_id;

    v_next_version := v_max + 1;

    begin
      insert into public.booking_quotes (
        booking_id,
        version,
        total_zar,
        line_items,
        status,
        idempotency_key,
        expires_at
      )
      values (
        v_old.booking_id,
        v_next_version,
        v_old.total_zar,
        v_old.line_items,
        'draft',
        v_old.booking_id::text || ':' || v_next_version::text,
        v_old.expires_at
      )
      returning id into v_new_id;

      exit;
    exception
      when unique_violation then
        v_new_id := null;
    end;
  end loop;

  if v_new_id is null then
    return jsonb_build_object('ok', false, 'error', 'version_conflict');
  end if;

  update public.booking_quotes
  set
    status = 'superseded',
    superseded_by_quote_id = v_new_id,
    superseded_at = now()
  where id = p_prior_quote_id;

  update public.booking_quotes
  set
    status = 'sent',
    sent_at = now(),
    sent_to_email = v_email,
    sent_by = auth.uid()
  where id = v_new_id;

  update public.bookings
  set current_quote_id = v_new_id
  where id = v_old.booking_id;

  return jsonb_build_object(
    'ok', true,
    'new_quote_id', v_new_id,
    'new_version', v_next_version
  );
end;
$$;

comment on function public.ops_resend_booking_quote_v1(uuid) is
  'Epic 13 / 13.5: staff-only; copies line_items/total_zar from prior sent/accepted quote, '
  'inserts new version, marks prior superseded, sends new quote, sets bookings.current_quote_id — atomic.';

revoke all on function public.ops_resend_booking_quote_v1(uuid) from public;
grant execute on function public.ops_resend_booking_quote_v1(uuid) to authenticated;
