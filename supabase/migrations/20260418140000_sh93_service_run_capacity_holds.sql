-- SH.9.3: transactional per-run capacity, holds on `public.tickets`, RPCs with row locks.
-- ADR: docs/adr/0003-service-run-capacity-holds-sh9-3.md · ADR 0002: tickets = inventory mechanics.

-- ---------------------------------------------------------------------------
-- Declared capacity per operational run (per-departure dimension; AC4).
-- ---------------------------------------------------------------------------
alter table public.service_runs
  add column if not exists passenger_capacity integer not null default 14
  constraint service_runs_passenger_capacity_check check (passenger_capacity >= 0);

comment on column public.service_runs.passenger_capacity is
  'SH.9.3: maximum passengers for this run instance; enforced by reserve_service_run_capacity.';

-- ---------------------------------------------------------------------------
-- Hold / inventory columns on tickets (extend existing table per story guidance).
-- ---------------------------------------------------------------------------
alter table public.tickets
  add column if not exists booking_id uuid references public.bookings (id) on delete set null;

alter table public.tickets
  add column if not exists hold_expires_at timestamptz;

alter table public.tickets
  add column if not exists idempotency_key text;

alter table public.tickets
  add column if not exists ticket_inventory_state text not null default 'legacy'
  constraint tickets_ticket_inventory_state_check check (
    ticket_inventory_state in (
      'legacy',
      'hold',
      'confirmed',
      'released',
      'expired',
      'cancelled'
    )
  );

comment on column public.tickets.booking_id is
  'SH.9.3: optional link to web booking when the hold/ticket is part of a booking flow.';
comment on column public.tickets.hold_expires_at is
  'SH.9.3: wall-clock expiry for ticket_inventory_state = hold; null for non-holds.';
comment on column public.tickets.idempotency_key is
  'SH.9.3: client-supplied key; unique per service_run_id when set (idempotent reserve).';
comment on column public.tickets.ticket_inventory_state is
  'SH.9.3: inventory lifecycle. legacy = pre–SH.9.3 rows (excluded from capacity sum).';

create unique index if not exists idx_tickets_idempotency_per_run
  on public.tickets (service_run_id, idempotency_key)
  where idempotency_key is not null;

create unique index if not exists idx_tickets_booking_run_segment_active
  on public.tickets (booking_id, service_run_id, from_point_id, to_point_id)
  where booking_id is not null
    and ticket_inventory_state in ('hold', 'confirmed');

-- ---------------------------------------------------------------------------
-- Transition guard: invalid inventory state changes rejected at DB layer (AC5).
-- ---------------------------------------------------------------------------
create or replace function public.tickets_inventory_transition_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if old.ticket_inventory_state is not distinct from new.ticket_inventory_state then
    return new;
  end if;

  if old.ticket_inventory_state = 'legacy' then
    return new;
  end if;

  if old.ticket_inventory_state in ('released', 'expired', 'cancelled') then
    raise exception 'ticket_inventory_terminal_state'
      using errcode = 'P0001',
        hint = 'Released, expired, and cancelled tickets cannot change inventory state.';
  end if;

  if old.ticket_inventory_state = 'hold' then
    if new.ticket_inventory_state in ('confirmed', 'released', 'expired', 'cancelled') then
      return new;
    end if;
    raise exception 'ticket_inventory_invalid_from_hold'
      using errcode = 'P0001',
        hint = 'From hold: only confirmed, released, expired, or cancelled.';
  end if;

  if old.ticket_inventory_state = 'confirmed' then
    if new.ticket_inventory_state = 'cancelled' then
      return new;
    end if;
    raise exception 'ticket_inventory_invalid_from_confirmed'
      using errcode = 'P0001',
        hint = 'From confirmed: only cancelled.';
  end if;

  raise exception 'ticket_inventory_unhandled_transition' using errcode = 'P0001';
end;
$$;

drop trigger if exists tickets_inventory_transition_guard on public.tickets;
create trigger tickets_inventory_transition_guard
  before update of ticket_inventory_state on public.tickets
  for each row execute function public.tickets_inventory_transition_guard();

-- ---------------------------------------------------------------------------
-- Capacity sum: confirmed seats + non-expired holds (AC3–AC4).
-- ---------------------------------------------------------------------------
create or replace function public.service_run_reserved_seat_count(p_service_run_id uuid)
returns integer
language sql
volatile
set search_path = public
as $$
  select coalesce(sum(t.number_of_seats), 0)::integer
  from public.tickets t
  where t.service_run_id = p_service_run_id
    and (
      t.ticket_inventory_state = 'confirmed'
      or (
        t.ticket_inventory_state = 'hold'
        and t.hold_expires_at is not null
        and t.hold_expires_at > now()
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- reserve_service_run_capacity: lock run, check, insert — one DB round-trip (AC3–AC4, AC6).
-- ---------------------------------------------------------------------------
create or replace function public.reserve_service_run_capacity(
  p_service_run_id uuid,
  p_passenger_id uuid,
  p_seats integer,
  p_from_point_id uuid,
  p_to_point_id uuid,
  p_idempotency_key text default null,
  p_booking_id uuid default null,
  p_fare double precision default 0,
  p_boarding_time timestamptz default now(),
  p_hold_ttl_seconds integer default 900
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_run public.service_runs;
  v_used integer;
  v_existing uuid;
  v_hold_until timestamptz;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  if p_seats is null or p_seats < 1 then
    raise exception 'invalid_seat_count' using errcode = 'P0001';
  end if;

  if not (public.is_staff(v_uid) or p_passenger_id = v_uid) then
    raise exception 'forbidden_passenger' using errcode = 'P0001';
  end if;

  if p_hold_ttl_seconds is null or p_hold_ttl_seconds < 60 or p_hold_ttl_seconds > 86400 then
    raise exception 'invalid_hold_ttl' using errcode = 'P0001';
  end if;

  -- Idempotency: return existing ticket for same run + idempotency key (AC6).
  if p_idempotency_key is not null then
    select t.id into v_existing
    from public.tickets t
    where t.service_run_id = p_service_run_id
      and t.idempotency_key = p_idempotency_key;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  -- Natural key dedupe: same booking + run + segment while hold/confirmed is active (AC6).
  if p_booking_id is not null then
    select t.id into v_existing
    from public.tickets t
    where t.booking_id = p_booking_id
      and t.service_run_id = p_service_run_id
      and t.from_point_id = p_from_point_id
      and t.to_point_id = p_to_point_id
      and t.ticket_inventory_state in ('hold', 'confirmed');
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  select * into v_run from public.service_runs where id = p_service_run_id for update;
  if not found then
    raise exception 'service_run_not_found' using errcode = 'P0001';
  end if;

  -- Re-check idempotency after lock (race with concurrent identical request).
  if p_idempotency_key is not null then
    select t.id into v_existing
    from public.tickets t
    where t.service_run_id = p_service_run_id
      and t.idempotency_key = p_idempotency_key;
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  if p_booking_id is not null then
    select t.id into v_existing
    from public.tickets t
    where t.booking_id = p_booking_id
      and t.service_run_id = p_service_run_id
      and t.from_point_id = p_from_point_id
      and t.to_point_id = p_to_point_id
      and t.ticket_inventory_state in ('hold', 'confirmed');
    if v_existing is not null then
      return v_existing;
    end if;
  end if;

  v_used := public.service_run_reserved_seat_count(p_service_run_id);
  if v_used + p_seats > v_run.passenger_capacity then
    raise exception 'capacity_exceeded' using errcode = 'P0001';
  end if;

  v_hold_until := now() + (interval '1 second' * p_hold_ttl_seconds);

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
    p_service_run_id,
    p_from_point_id,
    p_to_point_id,
    p_seats,
    p_fare,
    p_boarding_time,
    'pending',
    p_passenger_id,
    p_booking_id,
    v_hold_until,
    p_idempotency_key,
    'hold'
  )
  returning id into v_existing;

  return v_existing;
end;
$$;

-- ---------------------------------------------------------------------------
-- release / confirm / cancel / expire (AC5).
-- ---------------------------------------------------------------------------
create or replace function public.release_service_run_ticket_hold(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_passenger uuid;
  v_n integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select t.passenger_id into v_passenger
  from public.tickets t
  where t.id = p_ticket_id
  for update;
  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0001';
  end if;

  if not (public.is_staff(v_uid) or v_passenger = v_uid) then
    raise exception 'forbidden_ticket_release' using errcode = 'P0001';
  end if;

  update public.tickets
  set ticket_inventory_state = 'released',
      hold_expires_at = null
  where id = p_ticket_id
    and ticket_inventory_state = 'hold';

  get diagnostics v_n = row_count;
  if v_n <> 1 then
    raise exception 'ticket_not_active_hold' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.cancel_service_run_ticket_hold(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_passenger uuid;
  v_n integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select t.passenger_id into v_passenger
  from public.tickets t
  where t.id = p_ticket_id
  for update;
  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0001';
  end if;

  if not (public.is_staff(v_uid) or v_passenger = v_uid) then
    raise exception 'forbidden_ticket_cancel' using errcode = 'P0001';
  end if;

  update public.tickets
  set ticket_inventory_state = 'cancelled',
      hold_expires_at = null
  where id = p_ticket_id
    and ticket_inventory_state = 'hold';

  get diagnostics v_n = row_count;
  if v_n <> 1 then
    raise exception 'ticket_not_active_hold' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.confirm_service_run_ticket_hold(p_ticket_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_passenger uuid;
  v_state text;
  v_exp timestamptz;
  v_n integer;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;

  select t.passenger_id, t.ticket_inventory_state, t.hold_expires_at
  into v_passenger, v_state, v_exp
  from public.tickets t
  where t.id = p_ticket_id
  for update;
  if not found then
    raise exception 'ticket_not_found' using errcode = 'P0001';
  end if;

  if not (public.is_staff(v_uid) or v_passenger = v_uid) then
    raise exception 'forbidden_ticket_confirm' using errcode = 'P0001';
  end if;

  if v_state <> 'hold' then
    raise exception 'ticket_not_hold' using errcode = 'P0001';
  end if;

  if v_exp is not null and v_exp <= now() then
    raise exception 'hold_expired' using errcode = 'P0001';
  end if;

  update public.tickets
  set ticket_inventory_state = 'confirmed',
      hold_expires_at = null
  where id = p_ticket_id
    and ticket_inventory_state = 'hold';

  get diagnostics v_n = row_count;
  if v_n <> 1 then
    raise exception 'ticket_confirm_failed' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.expire_outdated_service_run_holds()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.tickets
  set ticket_inventory_state = 'expired',
      hold_expires_at = null
  where ticket_inventory_state = 'hold'
    and hold_expires_at is not null
    and hold_expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.reserve_service_run_capacity(
  uuid, uuid, integer, uuid, uuid, text, uuid, double precision, timestamptz, integer
) from public;

revoke all on function public.release_service_run_ticket_hold(uuid) from public;

revoke all on function public.confirm_service_run_ticket_hold(uuid) from public;

revoke all on function public.cancel_service_run_ticket_hold(uuid) from public;

revoke all on function public.expire_outdated_service_run_holds() from public;

revoke all on function public.service_run_reserved_seat_count(uuid) from public;

grant execute on function public.reserve_service_run_capacity(
  uuid, uuid, integer, uuid, uuid, text, uuid, double precision, timestamptz, integer
) to authenticated;

grant execute on function public.release_service_run_ticket_hold(uuid) to authenticated;

grant execute on function public.confirm_service_run_ticket_hold(uuid) to authenticated;

grant execute on function public.cancel_service_run_ticket_hold(uuid) to authenticated;

grant execute on function public.expire_outdated_service_run_holds() to authenticated;

grant execute on function public.service_run_reserved_seat_count(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS: chauffeur may read tickets for runs they are assigned to (AC8).
-- ---------------------------------------------------------------------------
create policy tickets_chauffeur_run_select on public.tickets
  for select to authenticated
  using (
    exists (
      select 1
      from public.service_runs sr
      where sr.id = service_run_id
        and sr.chauffeur_id is not null
        and sr.chauffeur_id = auth.uid()
    )
  );
