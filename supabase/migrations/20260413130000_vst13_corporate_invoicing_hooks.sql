-- VST-13: Minimal corporate invoicing hooks (flags + references only; no full billing party dump).

alter table public.bookings
  add column if not exists invoice_requested boolean not null default false,
  add column if not exists purchase_order_ref text,
  add column if not exists billing_entity_ref text;

comment on column public.bookings.invoice_requested is
  'Corporate / B2B: customer requested an invoice (MVP flag; no PDF generation).';

comment on column public.bookings.purchase_order_ref is
  'Optional PO or cost-centre reference; keep short — PII minimisation (VST-13).';

comment on column public.bookings.billing_entity_ref is
  'Optional internal or contract reference (e.g. org code); not a full VAT/legal payload.';
