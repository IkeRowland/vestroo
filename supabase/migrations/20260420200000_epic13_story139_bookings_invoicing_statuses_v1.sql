-- Epic 13 / Story 13.9 — invoicing queue hooks: extend bookings.status CHECK,
-- add external_invoice_ref for mark-invoiced (13.10).

alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
    check (status in (
      'pending',
      'submitted','triaged',
      'quote_sent','quote_accepted','quote_rejected',
      'awaiting_payment','paid',
      'assigned','in_progress','completed',
      'cancelled','expired',
      'ready_to_invoice','invoiced','paid_invoice'
    ));

comment on constraint bookings_status_check on public.bookings is
  'VST-14 + Epic 13.9: booking lifecycle including invoicing states '
  'ready_to_invoice, invoiced, paid_invoice. See docs/epic-12.md / epic-13.md.';

alter table public.bookings
  add column if not exists external_invoice_ref text;

comment on column public.bookings.external_invoice_ref is
  'Epic 13: external finance-system invoice id/reference; populated on Mark invoiced (13.10).';
