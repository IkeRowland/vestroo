-- Epic 14 / Story 14.4 — `ops_audit_log.actor_id` is NOT NULL (FK → profiles → auth.users).
-- Seed a fixed auth user + profile for anonymous quote-link reject audit rows, and allow
-- `actor_role = 'customer'` on ops_audit_log for this path.

-- ---------------------------------------------------------------------------
-- 1) ops_audit_log.actor_role — allow 'customer' for public quote-link audits
-- ---------------------------------------------------------------------------

alter table public.ops_audit_log
  drop constraint if exists ops_audit_log_actor_role_check;

alter table public.ops_audit_log
  add constraint ops_audit_log_actor_role_check
  check (actor_role in ('dispatcher', 'admin', 'chauffeur', 'customer'));

comment on column public.ops_audit_log.actor_role is
  'Who performed the action: dispatcher, admin, chauffeur (field), or customer (Epic 14 quote-link public flows).';

-- ---------------------------------------------------------------------------
-- 2) Fixed auth user + profile for quote-link system audit (no login use case)
-- ---------------------------------------------------------------------------

do $seed_quote_link_audit_actor$
declare
  v_id uuid := 'f0000000-0000-4000-8000-0000000000a1';
  v_inst uuid;
  v_use_email_confirmed boolean;
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
    raise notice 'epic14.4 quote-link audit actor: auth schema missing — skip seed';
    return;
  end if;

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
    raise notice 'epic14.4 quote-link audit actor: no auth.instance — skip seed';
    return;
  end if;

  if exists (select 1 from auth.users where id = v_id) then
    return;
  end if;

  if v_use_email_confirmed then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      v_inst, v_id, 'authenticated', 'authenticated',
      'quote-link-system@vestroo.internal', crypt('x', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
  else
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      v_inst, v_id, 'authenticated', 'authenticated',
      'quote-link-system@vestroo.internal', crypt('x', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
    );
  end if;

  -- `on_auth_user_created` creates public.profiles row; ensure display name if trigger missing.
  update public.profiles
  set full_name = 'Quote link (system)', role = 'customer'
  where id = v_id;
end
$seed_quote_link_audit_actor$;
