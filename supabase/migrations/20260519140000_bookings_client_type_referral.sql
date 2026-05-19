-- Ops referrer bookings: distinct client_type from walk_in (Story 17.22 follow-up).

alter table public.bookings
  drop constraint if exists bookings_client_type_check;

alter table public.bookings
  add constraint bookings_client_type_check
    check (client_type in ('walk_in', 'account_client', 'referral'));

alter table public.bookings
  drop constraint if exists bookings_account_linkage_check;

alter table public.bookings
  add constraint bookings_account_linkage_check
    check (
      (
        client_type in ('walk_in', 'referral')
        and customer_account_id is null
      )
      or (
        client_type = 'account_client'
        and customer_account_id is not null
      )
    );

comment on column public.bookings.client_type is
  'walk_in (prepay), account_client (post-paid corporate), or referral (ops booking with referrer_id).';

-- Align historical rows that already have a referrer but were stored as walk_in.
update public.bookings
set client_type = 'referral'
where referrer_id is not null
  and client_type = 'walk_in';
