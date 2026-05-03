-- Users who confirm email and log in without revisiting /account/signup?token=… never run
-- accept_customer_account_invite(p_account_id, p_email, p_jti). Link pending rows that match
-- auth.users.email when the invite is still valid (same predicates except JWT jti proof).

create or replace function public.accept_pending_customer_account_invites_for_current_user()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user_email text;
  v_count int := 0;
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

  with updated as (
    update public.customer_account_members cam
    set
      profile_id = v_uid,
      accepted_at = now()
    where lower(cam.email) = lower(trim(v_user_email))
      and cam.profile_id is null
      and cam.accepted_at is null
      and cam.invite_expires_at is not null
      and cam.invite_expires_at > now()
    returning 1
  )
  select count(*)::int into v_count from updated;

  return jsonb_build_object('ok', true, 'accepted', v_count);
end;
$$;

comment on function public.accept_pending_customer_account_invites_for_current_user() is
  '15A.6+: Links auth.uid() to pending customer_account_members rows for the same email when '
  'invites are not expired — for users who authenticated without reopening the signed invite URL.';

revoke all on function public.accept_pending_customer_account_invites_for_current_user() from public;
grant execute on function public.accept_pending_customer_account_invites_for_current_user() to authenticated;
grant execute on function public.accept_pending_customer_account_invites_for_current_user() to service_role;
