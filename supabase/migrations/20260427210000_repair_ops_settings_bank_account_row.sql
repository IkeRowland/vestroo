-- Idempotent repair: some hosted DBs recorded `ops16_ops_settings_and_payment_columns` without
-- retaining the seeded `bank_account` row (empty `ops_settings`). Re-assert the N1 seed.

insert into public.ops_settings (key, value)
values (
  'bank_account',
  '{
    "bank_name": "",
    "account_holder": "",
    "account_number": "",
    "branch_code": "",
    "reference_format": "VST-{booking_ref}"
  }'::jsonb
)
on conflict (key) do nothing;
