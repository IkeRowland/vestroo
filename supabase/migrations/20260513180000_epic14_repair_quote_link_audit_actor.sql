-- Epic 14.4 repair — `ops_audit_log.actor_id` FK → `public.profiles(id)`.
-- Original seed (`20260421120000_epic14_story144_quote_reject_audit_actor_v1.sql`) could skip when
-- `auth.instances` was empty, or return early when `auth.users` existed without a `profiles` row
-- (trigger failure / partial run). Public quote accept/reject then fails FK on audit insert.

-- ---------------------------------------------------------------------------
-- 1) Data repair: auth user exists but profile missing
-- ---------------------------------------------------------------------------

insert into public.profiles (id, full_name, email, phone, role)
select
  u.id,
  'Quote link (system)',
  'quote-link-system@vestroo.internal',
  '',
  'customer'
from auth.users u
where u.id = 'f0000000-0000-4000-8000-0000000000a1'
  and not exists (
    select 1 from public.profiles p where p.id = 'f0000000-0000-4000-8000-0000000000a1'
  );

-- ---------------------------------------------------------------------------
-- 2) RPC: idempotent ensure fixed quote-link audit actor (called from server with service_role)
-- ---------------------------------------------------------------------------

create or replace function public.ensure_quote_link_audit_actor()
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $fn$
declare
  v_id uuid := 'f0000000-0000-4000-8000-0000000000a1';
  v_inst uuid;
  v_use_email_confirmed boolean;
begin
  if exists (select 1 from public.profiles where id = v_id) then
    return v_id;
  end if;

  if exists (select 1 from auth.users where id = v_id) then
    insert into public.profiles (id, full_name, email, phone, role)
    values (
      v_id,
      'Quote link (system)',
      'quote-link-system@vestroo.internal',
      '',
      'customer'
    )
    on conflict (id) do update
      set full_name = excluded.full_name,
          email = excluded.email,
          role = excluded.role;
    return v_id;
  end if;

  select coalesce(
    (select id from auth.instances limit 1),
    (select instance_id from auth.users order by created_at asc limit 1)
  )
  into v_inst;

  if v_inst is null then
    raise exception 'ensure_quote_link_audit_actor: cannot resolve auth.instance_id (no instances and no users)';
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  )
  into v_use_email_confirmed;

  if v_use_email_confirmed then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      v_inst, v_id, 'authenticated', 'authenticated',
      'quote-link-system@vestroo.internal', crypt('x', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    )
    on conflict (id) do nothing;
  else
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      v_inst, v_id, 'authenticated', 'authenticated',
      'quote-link-system@vestroo.internal', crypt('x', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    )
    on conflict (id) do nothing;
  end if;

  insert into public.profiles (id, full_name, email, phone, role)
  values (
    v_id,
    'Quote link (system)',
    'quote-link-system@vestroo.internal',
    '',
    'customer'
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        role = excluded.role;

  return v_id;
end;
$fn$;

comment on function public.ensure_quote_link_audit_actor() is
  'Epic 14.4 repair: ensures auth.users + public.profiles exist for quote-link ops_audit_log FK (walk-in accept/reject).';

revoke all on function public.ensure_quote_link_audit_actor() from public;
grant execute on function public.ensure_quote_link_audit_actor() to service_role;
