# Epic 12 — Client-type inference (Q6) and `booking_metadata.client_type_source`

This addendum documents **Story 12.5** behaviour: public booking flows (**`/book` PayFast wizard**, **`trip_request`**) resolve **active** `customer_accounts` rows **only by the booker’s email domain**, with **explicit** user confirmation — **never** silent auto-link from domain alone.

**Normative epic context:** [`docs/epic-12.md`](epic-12.md) (Theme D, **Q6**). **Security:** resolution uses the server-only RPC **`resolve_customer_accounts_for_email_domain(p_domain text)`** (service role); responses contain **only** accounts whose **`authorized_email_domains`** match the normalized domain (case-insensitive). There is **no** API that returns the full `customer_accounts` catalogue to anonymous clients.

## `booking_metadata.client_type_source`

| Value | When it applies | `client_type` / `customer_account_id` |
| ----- | ---------------- | -------------------------------------- |
| **`no_match`** | The email domain did not match any **active** account domain (probe returned zero rows). | `walk_in`, `customer_account_id` **null** |
| **`user_confirmed_domain_match`** | The booker confirmed **Yes** and (if needed) picked an account; server verified the id against domain-scoped candidates. | `account_client`, non-null **`customer_account_id`**, **`account_snapshot`** populated |
| **`user_declined_domain_match`** | The booker chose **No, personal booking**, dismissed the dialog (**Esc** / click outside), or equivalent decline. | `walk_in`, `customer_account_id` **null** |
| **`ops_manual`** | Staff **Identify client** on **`/ops/bookings`** (**Story 12.6**): link, create+link, or revert to walk-in (unpaid only). | Set by `identifyClientForBookingAction` after successful mutation |

## `account_snapshot`

When **`user_confirmed_domain_match`**, **`bookings.account_snapshot`** stores an as-booked JSON snapshot (name, credit terms, billing entity ref, PO flag) from the matched **`customer_accounts`** row at insert time — see **`bookings_account_linkage_check`** and VST-14 comments in migrations.

## Implementation references

- Public Q6 UI: `src/features/booking/components/BookingAccountDomainGate.tsx`, `ContactDetailsForm.tsx`, `TripRequestBookingShell.tsx`
- Ops identify-client (**12.6**): `src/features/ops/components/IdentifyClientDialog.tsx`, `src/actions/opsIdentifyClient.ts` (`searchCustomerAccountsForOps`, `identifyClientForBookingAction`)
- Server: `src/actions/booking-client-type-enrich.ts`, `src/actions/resolveAccountsByEmailDomain.ts`, `src/actions/loadDomainCandidatesForCustomerEmail.ts`
- RPC: `supabase/migrations/20260420103000_resolve_customer_accounts_for_email_domain.sql`
