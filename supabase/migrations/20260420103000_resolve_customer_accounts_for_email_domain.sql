-- Epic 12 / Story 12.5 — domain-scoped account lookup for Q6 (no full-table exposure to anon).
-- Called only from server actions via service role.

create or replace function public.resolve_customer_accounts_for_email_domain(p_domain text)
returns table (
  id uuid,
  name text,
  credit_terms_days integer,
  default_billing_entity_ref text,
  default_po_required boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ca.id,
    ca.name,
    ca.credit_terms_days,
    ca.default_billing_entity_ref,
    ca.default_po_required
  from public.customer_accounts ca
  where ca.status = 'active'
    and exists (
      select 1
      from unnest(ca.authorized_email_domains) as dom(domain)
      where lower(trim(dom.domain)) = lower(trim(p_domain))
    );
$$;

comment on function public.resolve_customer_accounts_for_email_domain(text) is
  'Story 12.5: returns active accounts whose authorized_email_domains match p_domain (case-insensitive). '
  'SECURITY DEFINER; intended for service-role server actions only — not for direct anon REST exposure.';

revoke all on function public.resolve_customer_accounts_for_email_domain(text) from public;
grant execute on function public.resolve_customer_accounts_for_email_domain(text) to service_role;
