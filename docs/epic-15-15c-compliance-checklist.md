# Epic 15C — comms matrix PR / release checklist (15C.8)

Short POPIA / CAN-SPAM–oriented review for **comms matrix** and preference-centre work. Tick when verified for the release (or N/A with note).

**Survey (Story 15.26):** `docs/compliance/` is not used in this repo; this file lives at **`docs/epic-15-15c-compliance-checklist.md`**.

| Ref | Check |
| --- | --- |
| Q23 | [ ] **Template copy / body** (subjects, HTML) only ship via product change control (e.g. PR) — not edited in **ops** matrix UI. **Dispatch rules and active flags** are managed in **`/ops/comms`**. |
| Q24 | [ ] **Per-member** preference centre at **`/account/preferences`**; categories align with **informational** / **marketing** / **transactional**; member understands scope (organisation + membership) per story copy. |
| **§6 transactional bypass** | [ ] **Transaction-class** `CommsEventKey`s (e.g. **`payment_received`**, **`invoice_due_reminder`**) are classified **transactional**; matrix dispatch **does not** suppress them when the member’s **marketing** toggle is off (see **`comms-event-category`**, tests in **15.26**). |
| **List-Unsubscribe** | [ ] For **non-transactional** (informational) emails that carry portal deep-links, **List-Unsubscribe** / one-click flow matches **`15.24`** and **`list-unsubscribe-headers`**. **Transactional** sends do not add marketing **List-Unsubscribe** inappropriately. |
| **Preference URL + `?category=`** | [ ] Unsubscribe and “manage preferences” links resolve to **`/account/preferences`** with a valid **`?category=`** (`informational` \| `marketing` \| `transactional`) and unknown values are ignored server-side. |
| **15.24 footers / unsubscribe** | [ ] Compliance footers, preference links, and copy meet **`15.24`** (footers, category mapping, consent language). |
| **15.25 cron idempotency** | [ ] **Invoice due reminder** job: same **phase** + same **day** + same **booking** does not emit duplicate **same-day** sends without an intentional product change; **`ops_audit_log`** can evidence dedupe when automation actor is set. |

---

## Sign-off

- Reviewer: ____________________
- Date: ____________________
