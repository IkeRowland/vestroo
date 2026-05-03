-- Epic 15 / Story 15A.6 — invite email token metadata + SECURITY DEFINER accept RPC (RLS-safe for invitees).

alter table public.customer_account_members
  add column if not exists invite_token_jti uuid,
  add column if not exists invite_expires_at timestamptz,
  add column if not exists invite_email_last_sent_at timestamptz;

comment on column public.customer_account_members.invite_token_jti is
  '15A.6: Opaque invite wave id; must match signed invite token. Rotated on each outbound invite / resend.';
comment on column public.customer_account_members.invite_expires_at is
  '15A.6: Server-side invite acceptance not-after time; aligned with signed token exp.';
comment on column public.customer_account_members.invite_email_last_sent_at is
  '15A.6: Last successful Resend attempt (or skipped_test_mode) for UX / soft resend cooldown.';

-- ---------------------------------------------------------------------------
-- Invitee self-accept (pending row only; email must match auth.users.email)
-- ---------------------------------------------------------------------------

create or replace function public.accept_customer_account_invite(
  p_account_id uuid,
  p_email text,
  p_jti uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user_email text;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  select u.email into v_user_email
  from auth.users u
  where u.id = v_uid;

  if v_user_email is null or length(trim(v_user_email)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'email_missing');
  end if;

  if lower(trim(v_user_email)) <> lower(trim(p_email)) then
    return jsonb_build_object('ok', false, 'reason', 'email_mismatch');
  end if;

  if exists (
    select 1
    from public.customer_account_members cam
    where cam.account_id = p_account_id
      and lower(cam.email) = lower(trim(p_email))
      and cam.profile_id = v_uid
      and cam.accepted_at is not null
  ) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  update public.customer_account_members cam
  set
    profile_id = v_uid,
    accepted_at = now()
  where cam.account_id = p_account_id
    and lower(cam.email) = lower(trim(p_email))
    and cam.accepted_at is null
    and cam.profile_id is null
    and cam.invite_token_jti = p_jti
    and cam.invite_expires_at is not null
    and cam.invite_expires_at > now();

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_or_expired');
  end if;

  return jsonb_build_object('ok', true, 'already', false);
end;
$$;

comment on function public.accept_customer_account_invite(uuid, text, uuid) is
  '15A.6: Links auth.uid() to a pending customer_account_members row when JWT email matches invite email '
  'and invite_token_jti / invite_expires_at are valid. Idempotent when already accepted by same user.';

revoke all on function public.accept_customer_account_invite(uuid, text, uuid) from public;
grant execute on function public.accept_customer_account_invite(uuid, text, uuid) to authenticated;
grant execute on function public.accept_customer_account_invite(uuid, text, uuid) to service_role;
