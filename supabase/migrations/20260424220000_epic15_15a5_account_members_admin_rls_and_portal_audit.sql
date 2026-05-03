-- Epic 15 / Story 15A.5 — portal account admins may manage customer_account_members on their account.
-- Adds SECURITY DEFINER admin check + INSERT/UPDATE/DELETE policies (RLS second line of defence).
-- Extends ops_audit_log.actor_role with `account_portal` and an insert policy for auditable portal mutations.

-- ---------------------------------------------------------------------------
-- 1) Helper: accepted account admin (avoids recursion; bypasses RLS on members)
-- ---------------------------------------------------------------------------

create or replace function public.is_customer_account_admin(p_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.customer_account_members m
    where m.account_id = p_account_id
      and m.profile_id = auth.uid()
      and m.role = 'admin'
      and m.accepted_at is not null
  );
$$;

comment on function public.is_customer_account_admin(uuid) is
  'Epic 15 / 15A.5: true when auth.uid() is an accepted admin on the given customer_accounts.id. '
  'SECURITY DEFINER reads membership without re-entering customer_account_members RLS.';

revoke all on function public.is_customer_account_admin(uuid) from public;
grant execute on function public.is_customer_account_admin(uuid) to authenticated;
grant execute on function public.is_customer_account_admin(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 2) customer_account_members — portal admin write policies (staff policies unchanged)
-- ---------------------------------------------------------------------------

create policy customer_account_members_portal_admin_insert
  on public.customer_account_members
  for insert
  to authenticated
  with check (public.is_customer_account_admin(account_id));

create policy customer_account_members_portal_admin_update
  on public.customer_account_members
  for update
  to authenticated
  using (public.is_customer_account_admin(account_id))
  with check (public.is_customer_account_admin(account_id));

create policy customer_account_members_portal_admin_delete
  on public.customer_account_members
  for delete
  to authenticated
  using (public.is_customer_account_admin(account_id));

-- ---------------------------------------------------------------------------
-- 3) ops_audit_log — actor_role + authenticated portal insert (whitelist actions)
-- ---------------------------------------------------------------------------

alter table public.ops_audit_log
  drop constraint if exists ops_audit_log_actor_role_check;

alter table public.ops_audit_log
  add constraint ops_audit_log_actor_role_check
  check (actor_role in ('dispatcher', 'admin', 'chauffeur', 'customer', 'account_portal'));

comment on column public.ops_audit_log.actor_role is
  'Who performed the action: dispatcher, admin, chauffeur (field), customer (Epic 14 quote-link), '
  'or account_portal (Epic 15 / logged-in customer account portal admin).';

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
      'account_member_removed'
    )
    and entity = 'customer_account_members'
  );
