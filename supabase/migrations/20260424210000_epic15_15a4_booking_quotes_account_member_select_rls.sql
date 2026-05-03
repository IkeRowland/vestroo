-- Epic 15 / Story 15A.4 — Account portal: members can SELECT `booking_quotes` for
-- account-linked bookings they belong to (aligns with `bookings_select_account_member` from 15A.3).
--
-- Baseline policies remain: staff + booking owner (`customer_id`); this ORs in account scope.

-- rls-lint-ok: Epic 16 Q35 terminal policy; bookings EXISTS uses SECURITY DEFINER account_ids_for_current_user(); reviewed
create policy booking_quotes_select_account_member
  on public.booking_quotes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_quotes.booking_id
        and b.customer_account_id is not null
        and b.customer_account_id in (select public.account_ids_for_current_user())
    )
  );

comment on policy booking_quotes_select_account_member on public.booking_quotes is
  'Epic 15 15A.4: account members may read quotes for bookings on their customer_accounts.';
