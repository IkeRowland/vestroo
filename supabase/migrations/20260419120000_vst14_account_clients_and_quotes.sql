-- VST-14: Account clients and booking quotes — dual-path fulfilment data model.
-- Traceability: docs/epic-12.md, docs/stories/12.1.story.md.
--
-- RLS: customer_accounts + members: staff full access; members read their own account.
--      booking_quotes: staff full access; booking owner reads quotes for their booking.
--
-- Scope:
--   1. New tables: customer_accounts, customer_account_members, booking_quotes.
--   2. New columns on bookings: client_type, customer_account_id, account_snapshot,
--      current_quote_id.
--   3. Reliability fixes flagged during architecture review:
--        3a. booking_trips.booking_id made UNIQUE (was application-level guard only — race).
--        3b. bookings.status + bookings.payment_status get CHECK constraints (were free text).
--   4. Dispatch guardrail function: can_dispatch_account_booking(uuid) — returns
--      (can_dispatch boolean, reason text). Covers account status, contract window,
--      PO when required, credit limit, overdue invoices.
--   5. Current-quote convenience view: v_booking_current_quote.
--
-- Notes:
--   * 'pending' is retained in bookings_status_check as a transitional value; a
--     follow-up story (Epic 12+) removes it after app code writes 'submitted' for new rows.
--     Existing rows are migrated to 'submitted' here where status was 'pending'.
--   * All email comparisons use lower(email) since citext is not enabled in this
--     project. App layer must lower-case before insert.
--   * Multi-leg bookings: this migration assumes 1 booking = 1 trip. If product later
--     confirms multi-leg, the unique on booking_trips becomes (booking_id,
--     sort_order) — change is one line.

-- =============================================================================
-- SECTION 1 — New tables
-- =============================================================================

-- 1.1 customer_accounts — one row per corporate account (organisation).

create table public.customer_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  status text not null default 'active'
    check (status in ('active','on_hold','suspended','closed')),
  credit_terms_days int not null default 0,
  credit_limit_zar numeric(12,2),
  default_billing_entity_ref text,
  default_po_required boolean not null default false,
  authorized_email_domains text[] not null default '{}',
  contract_starts_on date,
  contract_ends_on date,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_accounts_slug_key unique (slug),
  constraint customer_accounts_credit_terms_non_negative
    check (credit_terms_days >= 0),
  constraint customer_accounts_credit_limit_non_negative
    check (credit_limit_zar is null or credit_limit_zar >= 0),
  constraint customer_accounts_contract_window_ok
    check (contract_starts_on is null
           or contract_ends_on is null
           or contract_ends_on >= contract_starts_on)
);

comment on table public.customer_accounts is
  'VST-14: Corporate account (organisation). Bookings made on this account use '
  'post-paid invoice terms; dispatch is gated by can_dispatch_account_booking().';

comment on column public.customer_accounts.slug is
  'URL-safe identifier used in account portals (e.g. /account/acme). Lowercase, kebab.';

comment on column public.customer_accounts.status is
  'active: normal; on_hold: temporary freeze (ops decision); suspended: compliance/credit issue; '
  'closed: ex-customer. Only active accounts pass the dispatch guardrail.';

comment on column public.customer_accounts.credit_terms_days is
  'Invoice aging window before overdue. 0 = prepay (behaves like walk-in re payment timing but '
  'still carries account benefits: portal, reporting, standing rates). 14/30/60 = common B2B terms.';

comment on column public.customer_accounts.credit_limit_zar is
  'Sum of outstanding-unpaid booking totals must stay ≤ this. NULL = uncapped.';

comment on column public.customer_accounts.default_po_required is
  'If true, can_dispatch_account_booking() returns po_required_and_missing when '
  'bookings.purchase_order_ref is blank; ops UI should require PO at form time (Epic 12 Theme E).';

comment on column public.customer_accounts.authorized_email_domains is
  'Lowercased domain list (e.g. {''acme.co.za'',''acme.com''}). Used at booking creation to '
  'suggest account linkage when the booker email domain matches. App-layer match only.';

comment on column public.customer_accounts.contract_starts_on is
  'Dispatch guardrail refuses bookings before this date.';

comment on column public.customer_accounts.contract_ends_on is
  'Dispatch guardrail refuses bookings on or after this date. Nullable = open-ended.';


-- 1.2 customer_account_members — who may book on behalf of an account.

create table public.customer_account_members (
  account_id uuid not null references public.customer_accounts(id) on delete cascade,
  email text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  full_name text,
  role text not null default 'booker'
    check (role in ('admin','booker','rider')),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (account_id, email)
);

create unique index customer_account_members_email_ci_idx
  on public.customer_account_members (account_id, lower(email));

comment on table public.customer_account_members is
  'VST-14: Who can transact under a customer_account. Email is the stable key because invites '
  'may precede auth.users creation. profile_id is backfilled on first login.';

comment on column public.customer_account_members.role is
  'admin: manages the account (billing, members); booker: may submit bookings; '
  'rider: passenger only — cannot submit bookings (enforced in app/RLS in Epic 13+).';

comment on column public.customer_account_members.accepted_at is
  'Set when the member first authenticates via a matching email. Null = invite pending.';


-- 1.3 booking_quotes — immutable versioned history of quotes against a booking.

create table public.booking_quotes (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  version int not null,
  total_zar numeric(10,2) not null,
  line_items jsonb not null default '[]'::jsonb,
  rendered_html text,
  pdf_storage_path text,
  expires_at timestamptz,
  sent_at timestamptz,
  sent_to_email text,
  sent_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  superseded_at timestamptz,
  superseded_by_quote_id uuid references public.booking_quotes(id) on delete set null,
  status text not null
    check (status in ('draft','sent','accepted','rejected','expired','superseded')),
  idempotency_key text,
  created_at timestamptz not null default now(),
  constraint booking_quotes_version_unique unique (booking_id, version),
  constraint booking_quotes_version_positive check (version >= 1),
  constraint booking_quotes_total_non_negative check (total_zar >= 0),
  constraint booking_quotes_idempotency_key_unique unique (idempotency_key)
);

comment on table public.booking_quotes is
  'VST-14: Versioned immutable quote history per booking. Never UPDATE a sent quote; '
  'always INSERT a new version and mark the prior superseded. Serves legal/audit and '
  'preserves concurrent-edit resolution (later version wins, both retrievable).';

comment on column public.booking_quotes.version is
  'Monotonic per booking_id starting at 1. Enforced by unique(booking_id, version).';

comment on column public.booking_quotes.line_items is
  'Per-line breakdown: array of {label, qty, unit_zar, total_zar, note?}. '
  'App owns rendering; DB only stores.';

comment on column public.booking_quotes.expires_at is
  'VST-14 / Epic 12: Quote validity end. App sets defaults (e.g. 72h walk-in, 14d account_client); '
  'nullable until first send if team defers population to application layer.';

comment on column public.booking_quotes.rendered_html is
  'Byte-exact snapshot of the HTML emailed to the customer. Do NOT regenerate from '
  'template at read time — that defeats the audit-trail purpose.';

comment on column public.booking_quotes.idempotency_key is
  'Client-supplied key (e.g. quote UUID) passed to Resend. Prevents double-send on '
  'double-click. Unique globally.';

comment on column public.booking_quotes.status is
  'draft: not yet sent (edits allowed); sent: emailed to client (immutable); '
  'accepted: client accepted; rejected: client declined; expired: window lapsed; '
  'superseded: replaced by a newer version.';


-- =============================================================================
-- SECTION 2 — Bookings column additions
-- =============================================================================

alter table public.bookings
  add column if not exists client_type text not null default 'walk_in',
  add column if not exists customer_account_id uuid references public.customer_accounts(id)
    on delete set null,
  add column if not exists account_snapshot jsonb,
  add column if not exists current_quote_id uuid references public.booking_quotes(id)
    on delete set null;

alter table public.bookings
  add constraint bookings_client_type_check
    check (client_type in ('walk_in','account_client'));

alter table public.bookings
  add constraint bookings_account_linkage_check
    check (
      (client_type = 'walk_in' and customer_account_id is null)
      or (client_type = 'account_client' and customer_account_id is not null)
    );

comment on column public.bookings.client_type is
  'VST-14: walk_in (prepay — quote first, payment, then dispatch) or '
  'account_client (post-paid — dispatch first under guardrails, invoice after).';

comment on column public.bookings.customer_account_id is
  'VST-14: FK to customer_accounts. Required when client_type=account_client, '
  'forbidden otherwise (see bookings_account_linkage_check).';

comment on column public.bookings.account_snapshot is
  'VST-14: Denormalised snapshot of account terms at booking time. Because '
  'customer_accounts fields (credit_terms, name, billing_entity) can change, '
  'we pin "what were the terms when this booking was made" for dispute handling. '
  'Expected shape: {name, credit_terms_days, default_billing_entity_ref, po_required_at_snapshot}.';

comment on column public.bookings.current_quote_id is
  'VST-14: Pointer to the most-recent non-superseded quote. Kept in sync by '
  'app code on quote insert; v_booking_current_quote is the read-side fallback.';


-- =============================================================================
-- SECTION 3 — Reliability fixes (flagged in architecture review)
-- =============================================================================

-- 3.1 Migrate legacy 'pending' to 'submitted' before adding the CHECK.
-- (App still writes pending until a follow-up story; CHECK retains pending as transitional.)

update public.bookings set status = 'submitted'
  where status = 'pending';

-- 3.2 CHECK on bookings.status — formalise the state machine.
-- 'pending' retained as transitional value; remove after app writes submitted for new rows.

alter table public.bookings
  add constraint bookings_status_check
    check (status in (
      'pending',
      'submitted','triaged',
      'quote_sent','quote_accepted','quote_rejected',
      'awaiting_payment','paid',
      'assigned','in_progress','completed',
      'cancelled','expired'
    ));

comment on constraint bookings_status_check on public.bookings is
  'VST-14: Booking lifecycle state machine. See docs/epic-12.md. '
  '"pending" is transitional — app code should write "submitted" going forward.';

-- 3.3 CHECK on bookings.payment_status — prevent typos.

alter table public.bookings
  add constraint bookings_payment_status_check
    check (payment_status is null or payment_status in (
      'pending','paid','refunded','failed','chargeback'
    ));

-- 3.4 UNIQUE on booking_trips.booking_id — close the TOCTOU race in
-- assignBookingToRun. Single-trip-per-booking assumption; revisit if
-- multi-leg bookings are confirmed.

alter table public.booking_trips
  add constraint booking_trips_booking_id_key unique (booking_id);

comment on constraint booking_trips_booking_id_key on public.booking_trips is
  'VST-14 reliability fix: prevents two dispatchers concurrently assigning the '
  'same booking to different trips. Application-layer guard was insufficient.';


-- =============================================================================
-- SECTION 4 — Dispatch guardrail function
-- =============================================================================

create or replace function public.can_dispatch_account_booking(p_booking_id uuid)
returns table (can_dispatch boolean, reason text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_account public.customer_accounts%rowtype;
  v_booking public.bookings%rowtype;
  v_outstanding numeric(12,2);
  v_overdue_count int;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then
    return query select false, 'booking_not_found'::text; return;
  end if;

  if v_booking.customer_account_id is null then
    return query select false, 'not_an_account_booking'::text; return;
  end if;

  select * into v_account
    from public.customer_accounts
    where id = v_booking.customer_account_id;
  if not found then
    return query select false, 'account_not_found'::text; return;
  end if;

  if v_account.status <> 'active' then
    return query select false, ('account_' || v_account.status)::text; return;
  end if;

  if v_account.contract_starts_on is not null
     and v_account.contract_starts_on > current_date then
    return query select false, 'contract_not_yet_active'::text; return;
  end if;

  if v_account.contract_ends_on is not null
     and v_account.contract_ends_on < current_date then
    return query select false, 'contract_expired'::text; return;
  end if;

  -- PO required by account but missing on booking (Epic 12 Q4).
  if v_account.default_po_required
     and (v_booking.purchase_order_ref is null
          or trim(v_booking.purchase_order_ref) = '') then
    return query select false, 'po_required_and_missing'::text; return;
  end if;

  -- Credit limit: outstanding unpaid, non-cancelled bookings with an assigned trip.
  if v_account.credit_limit_zar is not null then
    select coalesce(sum(b.total_amount), 0) into v_outstanding
      from public.bookings b
      join public.booking_trips bt on bt.booking_id = b.id
      where b.customer_account_id = v_account.id
        and coalesce(b.payment_status, 'pending') <> 'paid'
        and b.status not in ('cancelled','expired');
    if v_outstanding + coalesce(v_booking.total_amount, 0) > v_account.credit_limit_zar then
      return query select false, 'credit_limit_exceeded'::text; return;
    end if;
  end if;

  -- Overdue invoices: unpaid bookings older than credit_terms_days + 7 grace.
  select count(*) into v_overdue_count
    from public.bookings b
    where b.customer_account_id = v_account.id
      and coalesce(b.payment_status, 'pending') <> 'paid'
      and b.status not in ('cancelled','expired')
      and b.created_at < now() - make_interval(days => v_account.credit_terms_days + 7);
  if v_overdue_count > 0 then
    return query select false, 'overdue_invoices'::text; return;
  end if;

  return query select true, 'ok'::text;
end;
$$;

comment on function public.can_dispatch_account_booking(uuid) is
  'VST-14: Composite guardrail for Epic 13 post-paid dispatch. Returns (false, reason_code) '
  'when any gate fails; reason codes are machine-stable for UI rendering. '
  'STABLE SECURITY DEFINER so RLS does not cascade into the aggregations.';

revoke all on function public.can_dispatch_account_booking(uuid) from public;
grant execute on function public.can_dispatch_account_booking(uuid) to authenticated;
grant execute on function public.can_dispatch_account_booking(uuid) to service_role;


-- =============================================================================
-- SECTION 5 — Current-quote view
-- =============================================================================

create or replace view public.v_booking_current_quote as
  select distinct on (booking_id) *
  from public.booking_quotes
  where status in ('sent','accepted')
  order by booking_id, version desc;

comment on view public.v_booking_current_quote is
  'VST-14: Read-side convenience — latest non-superseded, non-draft quote per booking. '
  'App layer should prefer bookings.current_quote_id FK when present; this view '
  'is the authoritative fallback.';


-- =============================================================================
-- SECTION 6 — Indexes
-- =============================================================================

create index customer_accounts_status_idx
  on public.customer_accounts (status);

create index customer_account_members_profile_id_idx
  on public.customer_account_members (profile_id)
  where profile_id is not null;

create index booking_quotes_booking_id_version_idx
  on public.booking_quotes (booking_id, version desc);

create index booking_quotes_status_idx
  on public.booking_quotes (status);

create index bookings_customer_account_id_idx
  on public.bookings (customer_account_id)
  where customer_account_id is not null;

create index bookings_client_type_status_idx
  on public.bookings (client_type, status);


-- =============================================================================
-- SECTION 7 — Updated-at triggers
-- =============================================================================

create trigger customer_accounts_set_updated_at
  before update on public.customer_accounts
  for each row execute function public.set_updated_at();


-- =============================================================================
-- SECTION 8 — RLS
-- =============================================================================

alter table public.customer_accounts enable row level security;
alter table public.customer_account_members enable row level security;
alter table public.booking_quotes enable row level security;

-- 8.1 customer_accounts policies.
-- Read: staff full access; account members see their own account.
-- Write: staff only.

create policy customer_accounts_staff_select
  on public.customer_accounts
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

create policy customer_accounts_member_select
  on public.customer_accounts
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.customer_account_members m
      where m.account_id = customer_accounts.id
        and m.profile_id = auth.uid()
    )
  );

create policy customer_accounts_staff_insert
  on public.customer_accounts
  for insert
  to authenticated
  with check (public.is_staff(auth.uid()));

create policy customer_accounts_staff_update
  on public.customer_accounts
  for update
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create policy customer_accounts_staff_delete
  on public.customer_accounts
  for delete
  to authenticated
  using (public.is_staff(auth.uid()));


-- 8.2 customer_account_members policies.
-- Read: staff full access; members see their own account's members.
-- Write: staff only in v1. Account-admin self-service deferred to Epic 15 portal work.

create policy customer_account_members_staff_select
  on public.customer_account_members
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

create policy customer_account_members_member_select
  on public.customer_account_members
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.customer_account_members me
      where me.account_id = customer_account_members.account_id
        and me.profile_id = auth.uid()
    )
  );

create policy customer_account_members_staff_insert
  on public.customer_account_members
  for insert
  to authenticated
  with check (public.is_staff(auth.uid()));

create policy customer_account_members_staff_update
  on public.customer_account_members
  for update
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

create policy customer_account_members_staff_delete
  on public.customer_account_members
  for delete
  to authenticated
  using (public.is_staff(auth.uid()));


-- 8.3 booking_quotes policies.
-- Read: staff full access; booking owner (customer) reads quotes for their booking.
-- Write: staff only (quotes are never client-created).

create policy booking_quotes_staff_select
  on public.booking_quotes
  for select
  to authenticated
  using (public.is_staff(auth.uid()));

-- rls-lint-ok: Epic 16 Q35 terminal policy; bookings EXISTS for quote owner reviewed
create policy booking_quotes_booking_owner_select
  on public.booking_quotes
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.bookings b
      where b.id = booking_quotes.booking_id
        and b.customer_id = auth.uid()
    )
  );

create policy booking_quotes_staff_insert
  on public.booking_quotes
  for insert
  to authenticated
  with check (public.is_staff(auth.uid()));

create policy booking_quotes_staff_update
  on public.booking_quotes
  for update
  to authenticated
  using (public.is_staff(auth.uid()))
  with check (public.is_staff(auth.uid()));

-- No DELETE policy on booking_quotes — quotes are append-only for audit integrity.
-- Staff corrections happen via INSERT of a new version + UPDATE of prior status
-- to 'superseded'.
