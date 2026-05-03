-- Mock account client "Netflix" + member Nia Rowland (ayketech@gmail.com) for `/account` portal testing.
-- Idempotent. Does NOT run automatically with `supabase db push` — apply manually when you need the fixture.
--
-- Apply (pick one):
--   • Supabase Dashboard → SQL Editor → paste and run
--   • psql:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/seed/netflix-mock-portal.sql
--
-- Sign-in (only if this script created the auth user — if ayketech@gmail.com already existed, use that password):
--   URL:   /account/login
--   Email: ayketech@gmail.com
--   Pass:  VestrooDev-Netflix1!
--
-- Skips auth inserts when `auth.instances` is missing. Still upserts `customer_accounts` and may
-- link `customer_account_members` from an existing `profiles` row for that email.

do $seed_netflix_mock$
declare
  v_account_id uuid;
  v_user_id uuid := 'b2b00002-0002-4002-8002-000000000002'::uuid;
  v_inst uuid;
  v_use_email_confirmed boolean;
  v_email constant text := 'ayketech@gmail.com';
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice 'mock Netflix seed: auth schema missing — skip';
    return;
  end if;

  insert into public.customer_accounts (id, name, slug, status)
  values (
    'b2b00001-0001-4001-8001-000000000001'::uuid,
    'Netflix',
    'mock-netflix',
    'active'
  )
  on conflict (slug) do update
    set name = excluded.name,
        status = excluded.status,
        updated_at = now();

  select c.id
  into v_account_id
  from public.customer_accounts c
  where c.slug = 'mock-netflix'
  limit 1;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) into v_use_email_confirmed;

  select coalesce(
    (select id from auth.instances limit 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) into v_inst;

  if v_inst = '00000000-0000-0000-0000-000000000000'::uuid then
    raise notice 'mock Netflix seed: no auth.instance — linking member row only if a profile already exists for %', v_email;
    insert into public.customer_account_members (
      account_id,
      email,
      profile_id,
      full_name,
      role,
      invited_at,
      accepted_at
    )
    select
      v_account_id,
      lower(v_email),
      p.id,
      'Nia Rowland',
      'booker',
      now(),
      now()
    from public.profiles p
    where lower(p.email) = lower(v_email)
    limit 1
    on conflict (account_id, email) do update
      set profile_id = excluded.profile_id,
          full_name = excluded.full_name,
          role = excluded.role,
          accepted_at = excluded.accepted_at;
    return;
  end if;

  select u.id
  into v_user_id
  from auth.users u
  where lower(u.email) = lower(v_email)
  limit 1;

  if v_user_id is null then
    begin
      if v_use_email_confirmed then
        insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) values (
          v_inst, v_user_id, 'authenticated', 'authenticated', v_email,
          crypt('VestrooDev-Netflix1!', gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', 'Nia Rowland'),
          now(), now()
        );
      else
        insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password, confirmed_at,
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) values (
          v_inst, v_user_id, 'authenticated', 'authenticated', v_email,
          crypt('VestrooDev-Netflix1!', gen_salt('bf')), now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', 'Nia Rowland'),
          now(), now()
        );
      end if;
    exception
      when unique_violation then
        select u.id into v_user_id from auth.users u where lower(u.email) = lower(v_email) limit 1;
    end;
  end if;

  if v_user_id is null then
    raise notice 'mock Netflix seed: could not resolve auth user for %', v_email;
    return;
  end if;

  if not exists (
    select 1 from auth.identities i where i.user_id = v_user_id and i.provider = 'email'
  ) then
    begin
      insert into auth.identities (
        id,
        user_id,
        provider_id,
        provider,
        identity_data,
        created_at,
        updated_at
      ) values (
        gen_random_uuid(),
        v_user_id,
        v_user_id::text,
        'email',
        jsonb_build_object('sub', v_user_id::text, 'email', v_email),
        now(),
        now()
      );
    exception
      when others then
        raise notice 'mock Netflix seed: auth.identities insert skipped: %', sqlerrm;
    end;
  end if;

  update public.profiles
  set
    full_name = 'Nia Rowland',
    email = lower(v_email),
    role = 'customer'
  where id = v_user_id;

  insert into public.customer_account_members (
    account_id,
    email,
    profile_id,
    full_name,
    role,
    invited_at,
    accepted_at
  ) values (
    v_account_id,
    lower(v_email),
    v_user_id,
    'Nia Rowland',
    'booker',
    now(),
    now()
  )
  on conflict (account_id, email) do update
    set profile_id = excluded.profile_id,
        full_name = excluded.full_name,
        role = excluded.role,
        accepted_at = excluded.accepted_at;
end
$seed_netflix_mock$;
