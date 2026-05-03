-- Epic 15 / Theme E — **15C.5**: per-member **`comms_preferences` jsonb** on **`customer_account_members`**
-- + SECURITY DEFINER RPC for portal self-service updates (avoids broad member UPDATE RLS on the whole row).
-- Extends **`ops_audit_log`** portal insert whitelist with **`account_comms_preferences_updated`**.

-- ---------------------------------------------------------------------------
-- 1) Column — jsonb shape (app-enforced): { "informational": bool, "marketing": bool, "transactional": bool }
-- ---------------------------------------------------------------------------

alter table public.customer_account_members
  add column if not exists comms_preferences jsonb;

comment on column public.customer_account_members.comms_preferences is
  'Epic 15 / 15C.5 (US-B3, Q24): per **accepted** member email preferences for outbound comms categories. '
  'Canonical keys: informational, marketing, transactional (booleans). Defaults when null: informational=true, '
  'marketing=false, transactional=true (transactional must stay true when persisted). '
  'Portal updates via **public.set_member_comms_preferences** only.';

-- ---------------------------------------------------------------------------
-- 2) RPC — authenticated member updates **only** their row for the given account
-- ---------------------------------------------------------------------------

create or replace function public.set_member_comms_preferences(
  p_account_id uuid,
  p_prefs jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_before jsonb;
  v_member_email text;
  v_inf boolean;
  v_mkt boolean;
  v_txn boolean;
  v_norm jsonb;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  end if;

  if p_prefs is null or jsonb_typeof(p_prefs) <> 'object' then
    return jsonb_build_object('ok', false, 'reason', 'invalid_shape');
  end if;

  if not (p_prefs ? 'informational' and p_prefs ? 'marketing' and p_prefs ? 'transactional') then
    return jsonb_build_object('ok', false, 'reason', 'missing_keys');
  end if;

  if jsonb_typeof(p_prefs->'informational') <> 'boolean'
     or jsonb_typeof(p_prefs->'marketing') <> 'boolean'
     or jsonb_typeof(p_prefs->'transactional') <> 'boolean'
  then
    return jsonb_build_object('ok', false, 'reason', 'type_error');
  end if;

  v_inf := (p_prefs#>>'{informational}')::boolean;
  v_mkt := (p_prefs#>>'{marketing}')::boolean;
  v_txn := (p_prefs#>>'{transactional}')::boolean;

  if not v_txn then
    return jsonb_build_object('ok', false, 'reason', 'transactional_locked');
  end if;

  select cam.comms_preferences, cam.email
    into v_before, v_member_email
  from public.customer_account_members cam
  where cam.account_id = p_account_id
    and cam.profile_id = v_uid
    and cam.accepted_at is not null
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  v_norm := jsonb_build_object(
    'informational', v_inf,
    'marketing', v_mkt,
    'transactional', true
  );

  update public.customer_account_members cam
  set comms_preferences = v_norm
  where cam.account_id = p_account_id
    and cam.profile_id = v_uid
    and cam.accepted_at is not null;

  return jsonb_build_object(
    'ok', true,
    'member_email', v_member_email,
    'before', coalesce(v_before, 'null'::jsonb),
    'after', v_norm
  );
end;
$$;

comment on function public.set_member_comms_preferences(uuid, jsonb) is
  'Epic 15 / 15C.5: portal member (auth.uid() = profile_id) updates **comms_preferences** for one account_id. '
  'Validates transactional=true; returns before/after jsonb for client-side ops_audit_log.';

revoke all on function public.set_member_comms_preferences(uuid, jsonb) from public;
grant execute on function public.set_member_comms_preferences(uuid, jsonb) to authenticated;
grant execute on function public.set_member_comms_preferences(uuid, jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 3) ops_audit_log — extend portal insert whitelist (15A.5 policy)
-- ---------------------------------------------------------------------------

drop policy if exists ops_audit_log_account_portal_insert on public.ops_audit_log;

create policy ops_audit_log_account_portal_insert
  on public.ops_audit_log
  for insert
  to authenticated
  with check (
    actor_id = auth.uid()
    and actor_role = 'account_portal'
    and action in (
      'account_member_invited',
      'account_member_role_changed',
      'account_member_removed',
      'account_comms_preferences_updated'
    )
    and entity = 'customer_account_members'
  );
