-- SH.9.5: service-role checkout + PayFast webhook paths for patterned / capacity bookings.
-- See docs/adr/0005-patterned-checkout-sh9-5.md — does not duplicate INT.8.3 signing (webhook only).
--
-- HISTORICAL ANNOTATION — Epic 16 / Theme N (US-N2 / Q31): the PayFast checkout-provider
-- integration referenced above has been physically removed; patterned-checkout payment
-- provider work is deferred per `docs/epic-9.md` § SH.9.5. The function bodies below remain
-- in place as the SH.9.5 capacity reservation contract is unchanged; only the upstream
-- caller (`processPayment`) has been removed and will be re-introduced in a future story.

-- ---------------------------------------------------------------------------
-- reserve_service_run_capacity_for_booking_checkout
-- Called with service_role after bookings row exists (processPayment).
-- Uses bookings.customer_id as tickets.passenger_id; rejects guest (null customer_id).
-- ---------------------------------------------------------------------------
create or replace function public.reserve_service_run_capacity_for_booking_checkout(
  p_booking_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_run public.service_runs;
  v_used integer;
  v_existing uuid;
  v_hold_until timestamptz;
  v_meta jsonb;
  v_service_run_id uuid;
  v_from_point_id uuid;
  v_to_point_id uuid;
  v_seats integer;
  v_idempotency_key text;
  v_hold_ttl_seconds integer := 3600;
begin
  if p_booking_id is null then
    raise exception 'invalid_booking_id' using errcode = 'P0001';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if v_booking.booking_intent is distinct from 'corporate_pattern' then
    raise exception 'booking_not_corporate_pattern' using errcode = 'P0001';
  end if;

  if v_booking.customer_id is null then
    raise exception 'corporate_pattern_requires_authenticated_customer'
      using errcode = 'P0001',
        hint = 'Guest web checkout is not supported for patterned capacity in this MVP; sign in or use staff-assisted booking.';
  end if;

  v_meta := coalesce(v_booking.booking_metadata, '{}'::jsonb);

  begin
    v_service_run_id := (v_meta->>'service_run_id')::uuid;
    v_from_point_id := (v_meta->>'from_point_id')::uuid;
    v_to_point_id := (v_meta->>'to_point_id')::uuid;
    v_seats := (v_meta->>'seats')::integer;
    v_idempotency_key := nullif(trim(v_meta->>'idempotency_key'), '');
  exception
    when others then
      raise exception 'invalid_patterned_booking_metadata' using errcode = 'P0001';
  end;

  if v_service_run_id is null or v_from_point_id is null or v_to_point_id is null then
    raise exception 'invalid_patterned_booking_metadata' using errcode = 'P0001';
  end if;

  if v_seats is null or v_seats < 1 then
    raise exception 'invalid_seat_count' using errcode = 'P0001';
  end if;

  -- Idempotency: same run + idempotency key
  if v_idempotency_key is not null then
    select t.id into v_existing
    from public.tickets t
    where t.service_run_id = v_service_run_id
      and t.idempotency_key = v_idempotency_key;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  -- Natural key dedupe: same booking + run + segment while hold/confirmed
  select t.id into v_existing
  from public.tickets t
  where t.booking_id = p_booking_id
    and t.service_run_id = v_service_run_id
    and t.from_point_id = v_from_point_id
    and t.to_point_id = v_to_point_id
    and t.ticket_inventory_state in ('hold', 'confirmed');
  if v_existing is not null then
    return v_existing;
  end if;

  select * into v_run from public.service_runs where id = v_service_run_id for update;
  if not found then
    raise exception 'service_run_not_found' using errcode = 'P0001';
  end if;

  if v_idempotency_key is not null then
    select t.id into v_existing
    from public.tickets t
    where t.service_run_id = v_service_run_id
      and t.idempotency_key = v_idempotency_key;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  select t.id into v_existing
  from public.tickets t
  where t.booking_id = p_booking_id
    and t.service_run_id = v_service_run_id
    and t.from_point_id = v_from_point_id
    and t.to_point_id = v_to_point_id
    and t.ticket_inventory_state in ('hold', 'confirmed');
  if v_existing is not null then
    return v_existing;
  end if;

  v_used := public.service_run_reserved_seat_count(v_service_run_id);
  if v_used + v_seats > v_run.passenger_capacity then
    raise exception 'capacity_exceeded' using errcode = 'P0001';
  end if;

  v_hold_until := now() + (interval '1 second' * v_hold_ttl_seconds);

  insert into public.tickets (
    service_route_id,
    service_run_id,
    from_point_id,
    to_point_id,
    number_of_seats,
    fare,
    boarding_time,
    status,
    passenger_id,
    booking_id,
    hold_expires_at,
    idempotency_key,
    ticket_inventory_state
  )
  values (
    v_run.service_route_id,
    v_service_run_id,
    v_from_point_id,
    v_to_point_id,
    v_seats,
    coalesce(v_booking.total_amount, 0)::double precision,
    coalesce(v_booking.trip_date, v_booking.pickup_datetime, now()),
    'pending',
    v_booking.customer_id,
    p_booking_id,
    v_hold_until,
    v_idempotency_key,
    'hold'
  )
  returning id into v_existing;

  return v_existing;
end;
$$;

comment on function public.reserve_service_run_capacity_for_booking_checkout(uuid) is
  'SH.9.5: service_role — reserve run capacity after booking row exists (authenticated customer only).';

-- ---------------------------------------------------------------------------
-- confirm_ticket_holds_for_paid_booking — webhook after payment_status = paid
-- ---------------------------------------------------------------------------
create or replace function public.confirm_ticket_holds_for_paid_booking(
  p_booking_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_count integer;
begin
  if p_booking_id is null then
    raise exception 'invalid_booking_id' using errcode = 'P0001';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if v_booking.booking_intent is distinct from 'corporate_pattern' then
    return 0;
  end if;

  if v_booking.payment_status is distinct from 'paid' then
    raise exception 'booking_not_paid_for_confirm' using errcode = 'P0001';
  end if;

  update public.tickets
  set ticket_inventory_state = 'confirmed',
      hold_expires_at = null
  where booking_id = p_booking_id
    and ticket_inventory_state = 'hold'
    and (hold_expires_at is null or hold_expires_at > now());

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.confirm_ticket_holds_for_paid_booking(uuid) is
  'SH.9.5: service_role — confirm holds for paid patterned booking (idempotent).';

-- ---------------------------------------------------------------------------
-- release_ticket_holds_for_failed_booking — FAILED / CANCELLED ITN
-- ---------------------------------------------------------------------------
create or replace function public.release_ticket_holds_for_failed_booking(
  p_booking_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking public.bookings;
  v_count integer;
begin
  if p_booking_id is null then
    raise exception 'invalid_booking_id' using errcode = 'P0001';
  end if;

  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found' using errcode = 'P0001';
  end if;

  if v_booking.booking_intent is distinct from 'corporate_pattern' then
    return 0;
  end if;

  if v_booking.payment_status = 'paid' then
    raise exception 'cannot_release_holds_for_paid_booking' using errcode = 'P0001';
  end if;

  update public.tickets
  set ticket_inventory_state = 'released',
      hold_expires_at = null
  where booking_id = p_booking_id
    and ticket_inventory_state = 'hold';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

comment on function public.release_ticket_holds_for_failed_booking(uuid) is
  'SH.9.5: service_role — release holds when payment did not complete (idempotent).';

revoke all on function public.reserve_service_run_capacity_for_booking_checkout(uuid) from public;
revoke all on function public.confirm_ticket_holds_for_paid_booking(uuid) from public;
revoke all on function public.release_ticket_holds_for_failed_booking(uuid) from public;

grant execute on function public.reserve_service_run_capacity_for_booking_checkout(uuid) to service_role;
grant execute on function public.confirm_ticket_holds_for_paid_booking(uuid) to service_role;
grant execute on function public.release_ticket_holds_for_failed_booking(uuid) to service_role;
