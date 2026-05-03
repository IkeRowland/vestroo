-- Epic 12 Story 12.8 — Bookings INSERT RLS gate for account-linked rows (Theme E / US-E2, Q3).
--
-- Product rule: only staff (public.is_staff) or customer_account_members with
-- role IN ('admin','booker') for the target customer_account_id may insert rows
-- where customer_account_id IS NOT NULL. Riders and non-members are denied.
--
-- Baseline policy (20260406103000_vestroo_profile_roles_chauffeur_columns_rls.sql):
--   bookings_insert WITH CHECK (customer_id = auth.uid() OR public.is_staff(auth.uid()))
--
-- This migration tightens the WITH CHECK by AND-ing an account gate when
-- customer_account_id IS NOT NULL, without changing walk-in behaviour
-- (customer_account_id IS NULL).
--
-- Recursion: EXISTS on customer_account_members does not reference bookings;
-- member SELECT policies use public.account_ids_for_current_user() (SECURITY DEFINER).

drop policy if exists bookings_insert on public.bookings;

-- rls-lint-ok: Epic 16 Q35 terminal policy; customer_account_members EXISTS reviewed (migration header notes no bookings recursion)
create policy bookings_insert on public.bookings
  for insert
  to authenticated
  with check (
    (customer_id = auth.uid() or public.is_staff(auth.uid()))
    and (
      customer_account_id is null
      or public.is_staff(auth.uid())
      or exists (
        select 1
        from public.customer_account_members m
        where m.account_id = customer_account_id
          and m.profile_id = auth.uid()
          and m.role in ('admin', 'booker')
      )
    )
  );

comment on policy bookings_insert on public.bookings is
  'Epic 12 Q3: walk-in unchanged (customer_account_id IS NULL). '
  'Account-linked rows require staff or account member role admin/booker.';
