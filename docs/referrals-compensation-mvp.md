# Referrals & compensation (MVP notes)

Shipped in ops referrer tracking: `referrers` table, `bookings.referrer_id`, `trips.referrer_id` (copied on trip assignment).

## Recommended next steps (not in MVP)

1. **Commission rules** — Store per-referrer `commission_rate` (already on row) or tiered rules in a `referrer_commission_rules` table; compute owed amount from `bookings.total_amount` or paid quote total when `status = completed`.
2. **Payout workflow** — Monthly batch: export referred completed trips → finance approval → mark `referrer_payouts` paid; tie to Xero/manual EFT.
3. **Eligibility** — Only `active` referrers assignable on create; block edits after trip is `completed` unless admin.
4. **Attribution window** — If referrers share links later, add `referrer_attribution` tokens; MVP is ops-selected only.
