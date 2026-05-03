-- Story 18.8 / FE.18.7 — portal org admins may set `customer_accounts.default_billing_entity_ref`
-- without granting broad UPDATE on `customer_accounts` to members (staff policies unchanged).

create or replace function public.set_customer_account_default_billing_entity(
  p_account_id uuid,
  p_default_billing_entity_ref text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_ref text;
  v_updated int;
begin
  if v_uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated');
  end if;

  if not exists (
    select 1
    from public.customer_account_members m
    where m.account_id = p_account_id
      and m.profile_id = v_uid
      and m.role = 'admin'
      and m.accepted_at is not null
  ) then
    return jsonb_build_object('ok', false, 'reason', 'forbidden');
  end if;

  v_ref := nullif(trim(p_default_billing_entity_ref), '');
  if v_ref is not null and length(v_ref) > 200 then
    return jsonb_build_object('ok', false, 'reason', 'ref_too_long');
  end if;

  update public.customer_accounts ca
  set
    default_billing_entity_ref = v_ref,
    updated_at = now()
  where ca.id = p_account_id;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

comment on function public.set_customer_account_default_billing_entity(uuid, text) is
  'Story 18.8: accepted org admin may update default_billing_entity_ref for their customer_accounts row; '
  'SECURITY DEFINER; empty string clears to NULL.';

revoke all on function public.set_customer_account_default_billing_entity(uuid, text) from public;
grant execute on function public.set_customer_account_default_billing_entity(uuid, text) to authenticated;
grant execute on function public.set_customer_account_default_billing_entity(uuid, text) to service_role;
