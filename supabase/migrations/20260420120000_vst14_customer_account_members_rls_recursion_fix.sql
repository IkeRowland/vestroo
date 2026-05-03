-- Epic 12 / VST-14: eliminate infinite recursion on SELECT for customer_account_members.
--
-- Root cause: policy `customer_account_members_member_select` used EXISTS over
-- `customer_account_members` while evaluating RLS on the same table. PostgreSQL
-- re-entered member policies for the subquery rows → "infinite recursion detected
-- in policy for relation customer_account_members".
--
-- `customer_accounts_member_select` used the same EXISTS pattern and could trigger
-- the same recursion when evaluated (e.g. alongside staff policies on embeds).
--
-- Fix: STABLE SECURITY DEFINER function reads membership rows with definer rights
-- (table owner bypasses RLS) so policy bodies do not re-enter member RLS.

create or replace function public.account_ids_for_current_user()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select cam.account_id
  from public.customer_account_members cam
  where cam.profile_id = auth.uid();
$$;

comment on function public.account_ids_for_current_user() is
  'VST-14 RLS helper: account_ids the current user belongs to (profile_id = auth.uid()). '
  'SECURITY DEFINER avoids re-evaluating customer_account_members RLS from policies (recursion break).';

revoke all on function public.account_ids_for_current_user() from public;
grant execute on function public.account_ids_for_current_user() to authenticated;
grant execute on function public.account_ids_for_current_user() to service_role;

drop policy if exists customer_accounts_member_select on public.customer_accounts;

create policy customer_accounts_member_select
  on public.customer_accounts
  for select
  to authenticated
  using (
    id in (select public.account_ids_for_current_user())
  );

drop policy if exists customer_account_members_member_select on public.customer_account_members;

create policy customer_account_members_member_select
  on public.customer_account_members
  for select
  to authenticated
  using (
    account_id in (select public.account_ids_for_current_user())
  );
