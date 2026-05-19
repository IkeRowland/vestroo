# Story VST-13: Integrations and payments



## Status: Done



**Dependencies:** **[VST-5](vst-5.story.md)** / **[VST-6](vst-6.story.md)** MUST be **stable** for **bookings**, **`processPayment`**, **`createBooking`**, **server-side quote reconciliation** (**`reconcileBookingQuote`** / **`src/lib/booking-quote-reconcile.ts`**), and **`docs/data-models.md`** payment fields (**`payment_reference`**, **`trans_id`**, **`payment_status`**, **`payment_timestamp`**, booking **`status`** lifecycle). **[VST-3](vst-3.story.md)** — secrets **only** in environment / provider dashboards; extend **`docs/environment-vars.md`** per ACs (**no** secrets in git or client bundles). **[VST-12](vst-12.story.md)** — **sub-processor** and **data-flow** narrative MAY **cross-link** from the new integrations doc; **corporate invoicing hooks** MUST keep **PII minimal** (reference / flags, not full billing contact dumps unless justified). **Note:** **PayFast** integration and **`POST /api/payfast/webhook`** (**`src/app/api/payfast/webhook/route.ts`**) **already exist** per **`docs/front-end-api-interaction.md`** — this story **hardens**, **documents**, and **extends** them; **do not** re-specify the whole gateway from scratch unless a **documented gap** requires it. **Epic 8 follow-on:** reference **Momo / PayOS** vs PayFast mapping lives in **[`docs/integrations-and-payments.md` § INT.8.3](../integrations-and-payments.md#int-8-3)** (**[Story 8.3](8.3.story.md)**). **INT.8.4** scheduled jobs / **`@Cron`** inventory: **[`integrations-and-payments.md` § INT.8.4](../integrations-and-payments.md#int-8-4)** (**[Story 8.4](8.4.story.md)**). **INT.8.5** **`share/`** / secrets patterns: **[`integrations-and-payments.md` § INT.8.5](../integrations-and-payments.md#int-8-5)** (**[Story 8.5](8.5.story.md)**). **INT.8.6** outbound HTTP / **timeouts** / **retries** / **idempotency** matrix: **[`integrations-and-payments.md` § INT.8.6](../integrations-and-payments.md#int-8-6)** (**[Story 8.6](8.6.story.md)**).



## Story



- As a **product engineer** (and **operations / finance stakeholders** reviewing corporate flows)

- I want **maps** (autocomplete, routing), **South Africa–suitable payments** (including **sandbox** and **failed-payment recovery**), and **corporate invoicing hooks** — all with **per-environment provider config** and **idempotent webhooks**

- so that **customers complete checkout reliably**, **staging E2E** stays trustworthy, and **corporate billing** can attach to bookings **without** building a full accounting stack



## Epic traceability (source)



**From `docs/epic-4.md` — VST-13:** The platform MUST integrate **maps** (autocomplete, routes), **payments** or deposits suitable for the **SA market**, and **invoicing hooks** for corporate, with **provider-specific config per environment** and **idempotent webhooks**. **Test payments** MUST work in **sandbox** with a **failed-payment recovery** path. Track detail in **`docs/stories/vst-13.story.md`**.



**Terminology alignment (folded from epic Domain vocabulary):**



1. **Booking** = customer commitment; **payment** rows use **`payment_reference`** (**`VST-*`**) for customer-facing lookup; **`trans_id`** holds the **gateway** transaction id (**PayFast** today).

2. Prefer **corporate pattern** / **contracted service** language for B2B; **invoicing hooks** = **schema flags + metadata + ops visibility** — not **ERP** or **full ledger**.

3. **Maps** = **Places / Autocomplete** and **Directions** (or equivalent routing) as **documented contracts**; avoid implying **tactical** routing intelligence beyond documented provider capabilities.



**Out of scope (for this slice):** Full **Xero / Sage / QuickBooks** (or similar) **sync**; **cryptocurrency** payments; **multi-currency** beyond **documented ZAR** defaults; **Apple Pay / Google Pay** unless a **trivial** add-on to the existing gateway (explicitly justify or defer); **replacing** **legal** merchant agreements, **PCI** attestation, or **PayFast** commercial terms — engineering delivers **integration** and **runbooks** only.



## Acceptance Criteria (ACs)



1. **Integrations design doc:** Add **`docs/integrations-and-payments.md`** (name fixed unless rename is justified in the PR and reflected here) describing: **integration matrix** (maps, PayFast, email/SMS stubs as **consumers** only, future invoicing export); **per-environment** expectations (**dev / staging / production**); **webhook** lifecycle (**notify** URL, signature, **idempotency** rules); **failed / cancelled** PayFast outcomes and **customer recovery** (align with **`docs/local-development.md`** and **`docs/staging-and-promotion.md`** sandbox notes and epic **VST-6** PayFast sandbox E2E intent). Cross-link **`docs/data-models.md`**, **`docs/environment-vars.md`**, **`docs/front-end-api-interaction.md`**, **`src/lib/maps.ts`**, **`src/actions/processPayment.ts`**, **`src/app/api/payfast/webhook/route.ts`**, and **`src/lib/pricing-env.ts`** where relevant.



2. **Environment variable matrix (documentation):** Extend **`docs/environment-vars.md`** with a **concise matrix** of **integration-related** variables grouped by **dev**, **staging**, and **production** (placeholders in **`.env.example`** only; **values** live in host/Supabase dashboards). Include **PayFast** (**merchant id, key, passphrase, sandbox flag** or equivalent names already in repo), **maps** keys if introduced or if **client loader** keys are split from **server** secrets, **Resend**/email if touched, and any **invoicing hook** toggles. State explicitly which vars are **`NEXT_PUBLIC_*`** (should be **none** for secrets) vs **server-only**.



3. **Maps provider contract:** Document and implement **one** coherent approach in code + doc: **Google** Places Autocomplete / Directions **vs** **Mapbox** (or **hybrid**) — **justify** choice, **server-only** usage for **Distance Matrix**–class calls if added, and **browser** surface for autocomplete per existing **`Permissions-Policy`** in **`next.config.ts`** (**`geolocation=(self)`** alignment). **`src/lib/maps.ts`** today covers **deep links** and **`PlaceResult`** typing — extend or reference **booking** autocomplete/routing **call sites** so the doc is **grounded in file paths**. **No** API keys exposed to **untrusted** client bundles unless **industry-standard** restricted **public** keys are documented with **HTTP referrer** / domain restrictions.



4. **Webhook idempotency and duplicate `notify`:** Document expected **PayFast** retry behaviour. **Audit** **`src/app/api/payfast/webhook/route.ts`**: ensure **duplicate** **`COMPLETE`** notifications do **not** cause **duplicate side effects** (e.g. **multiple** confirmation emails, **incorrect** status transitions). **Implement** gaps if found (e.g. **dedupe** by **`pf_payment_id`** / **`trans_id`**, or **“email already sent”** guard). **Return `200`** for benign duplicates so PayFast does not **indefinitely** retry.



5. **Signature verification:** **`verifyPayFastWebhookSignature`** (**`src/lib/payfast`**) MUST remain the **single** verification path for **`POST /api/payfast/webhook`**. Add **Vitest** coverage **or** a **documented manual QA checklist** in **`docs/integrations-and-payments.md`** (pick **both** if cheap): **valid signature**, **tampered payload**, **missing signature**, **wrong passphrase**.



6. **Failed / cancelled payment paths:** Ensure **`FAILED`** / **`CANCELLED`** (and any other PayFast statuses the handler supports) leave **`bookings`** in a **consistent** state (**`docs/data-models.md`** alignment: e.g. **`payment_status`**, **`status`**). Document **customer-visible** behaviour: **return URL**, **confirmation** page, and **how** the user **retries** (**new** `processPayment` / booking vs **reuse** — align with existing note in **`docs/front-end-api-interaction.md`** on **idempotency**). Add **minimal UX copy** or **wizard** step messaging so users are not stranded after sandbox **cancel**.



7. **Sandbox E2E and recovery:** **`docs/local-development.md`** and **`docs/staging-and-promotion.md`** MUST describe **PayFast sandbox** card / flow pointers and **how** to simulate **failure** and **recover** (search by **`payment_reference`**, restart booking, ops visibility if any). No requirement to automate full Playwright here (**VST-14**); this AC is **documented** + **smoke-verified** behaviour.



8. **Corporate invoicing hooks (schema + docs):** Add **minimal** persistence for **corporate invoicing intent** — e.g. **nullable columns** on **`bookings`** (**`invoice_requested`**, **`purchase_order_ref`**, **`billing_entity_ref`**) **or** **`booking_metadata`** keys with **Zod** typing — **choose one** approach, **justify** in **`docs/integrations-and-payments.md`** and **`docs/data-models.md`**. **PII minimisation:** store **references** and **flags**, not **full** VAT / legal party records unless already on the booking.



9. **Ops / staff visibility (optional stub):** If schema lands in AC8, add a **small** **`/ops/*`** panel or **flag** on an existing booking view (**staff-gated** via **`src/lib/ops-auth.ts`**) **or** a **stub Server Action** that **only** staff can call — **document** as MVP. **No** PDF invoice generation required.



10. **Data model doc:** Update **`docs/data-models.md`** — epic row / **bookings** section for **payment** fields **and** new **invoicing hook** fields; note **PayFast** as current **gateway** for **`trans_id`**.



11. **Developer index and API doc:** Link **`docs/integrations-and-payments.md`** from **`docs/index.md`**. Update **`docs/front-end-api-interaction.md`** for any **new** Server Actions, **webhook** idempotency notes, **maps** usage boundaries, and **corporate** fields **without** duplicating the full PayFast spec.



12. **Automated tests:** Add or extend **Vitest** tests following **`src/actions/__tests__/`** and **`src/lib/__tests__/`** patterns for: **payfast** signature helper (if not covered), **webhook** handler branches (**mock** `Request` / `formData` as per repo conventions), and/or **maps** pure functions if new logic is added. **`npm run test`** MUST pass.



13. **Client bundle hygiene:** Grep / review that **no** **`PAYFAST_*`**, **service role**, or **unrestricted** maps **server** secrets appear in **`NEXT_PUBLIC_*`** or **client-imported** modules. Document **findings** (even if “no change”) in the PR description or **integrations** doc § **Security**.



14. **VST-12 cross-link:** In **`docs/integrations-and-payments.md`**, add a **short** subsection on **sub-processors** / **payment provider** data flows and **link** **`docs/compliance-and-safety.md`** — **do not** duplicate VST-12 **DSR** procedures.



15. **Epic traceability:** After implementation, **`docs/epic-4.md`** bullet **VST-13** MUST remain **consistent** with this story; resolve conflicts in **epic** or **this file** explicitly.



## Tasks / Subtasks



- [x] **Task 1 — AC1:** Author **`docs/integrations-and-payments.md`** (matrix, env overview, webhook + recovery, cross-links). (AC: #1)



- [x] **Task 2 — AC2:** Update **`docs/environment-vars.md`** (+ **`.env.example`** placeholders only if new vars). (AC: #2)



- [x] **Task 3 — AC3:** Implement **maps** contract (doc + code touchpoints); align **`next.config.ts`** **Permissions-Policy** notes in docs if maps domains change. (AC: #3)



- [x] **Task 4 — AC4:** Harden **`src/app/api/payfast/webhook/route.ts`** for **duplicate notify** / **idempotent** side effects; document behaviour. (AC: #4)



- [x] **Task 5 — AC5:** **Vitest** and/or **manual checklist** for **signature verification** paths. (AC: #5)



- [x] **Task 6 — AC6:** Verify **FAILED/CANCELLED** DB state + **customer recovery** UX/messaging in booking/payment flow. (AC: #6)



- [x] **Task 7 — AC7:** Update **`docs/local-development.md`** + **`docs/staging-and-promotion.md`** for **sandbox** + **failure recovery**. (AC: #7)



- [x] **Task 8 — AC8:** Migration + types for **corporate invoicing hooks** (columns or **`booking_metadata`**). (AC: #8)



- [x] **Task 9 — AC9:** Optional **`/ops/*`** or **Server Action** stub for staff **invoice** flags. (AC: #9)



- [x] **Task 10 — AC10:** Update **`docs/data-models.md`**. (AC: #10)



- [x] **Task 11 — AC11:** Update **`docs/index.md`** and **`docs/front-end-api-interaction.md`**. (AC: #11)



- [x] **Task 12 — AC12:** Add/extend **Vitest** per patterns; **`npm run test`** green. (AC: #12)



- [x] **Task 13 — AC13:** **Client/server secret** audit; document. (AC: #13)



- [x] **Task 14 — AC14:** **VST-12** cross-link in integrations doc. (AC: #14)



- [x] **Task 15 — AC15:** Re-read **`docs/epic-4.md` VST-13**; align epic if needed. (AC: #15)



## Dev Technical Guidance



- **Prerequisites:** Read **`src/actions/processPayment.ts`** (reconcile → PayFast params), **`src/lib/payfast.ts`** (signing / verification), **`src/app/api/payfast/webhook/route.ts`**, **`docs/front-end-api-interaction.md`** § PayFast, **`src/lib/maps.ts`**, **`src/lib/pricing-env.ts`**, **`src/lib/booking-quote-reconcile.ts`**, **`docs/data-models.md`** (**bookings** / payments).

- **Quote reconciliation:** Never trust client **`quoteAmount`**; **`processPayment`** already aligns totals — **do not** bypass **`reconcileBookingQuote`** when extending payment or corporate fields.

- **Webhooks:** Route Handler must stay **fast** and **idempotent**; **email** via **`sendBookingConfirmation`** should not **double-send** on provider retries.

- **Maps:** If adding **Places**/**Directions**, follow **VST-3** header story — **`Permissions-Policy`** in **`next.config.ts`** must match **actual** embed/autocomplete usage.

- **Ops:** Reuse **`src/lib/ops-auth.ts`** / **`is_staff`** patterns from **`src/actions/opsDispatch.ts`** for any ops-visible invoicing flags.

- **Compliance:** **`docs/compliance-and-safety.md`** owns **retention** and **DSR** depth; VST-13 only **references** payment **sub-processor** context.

- **Testing:** **`vitest.config.ts`**; mock **Next** `Request` for webhook tests if **no** existing pattern — check **`src/app/api`** tests or **`src/lib/__tests__`**.



## Story Progress Notes



### Agent Model Used: Dev Agent (2026-04-07)



### Completion Notes List



- **`docs/integrations-and-payments.md`** added (matrix, webhook idempotency, maps Google contract, security audit, VST-12 cross-link, manual QA table).

- **Maps:** `GOOGLE_MAPS_SERVER_KEY` for server Distance Matrix; `getGoogleMapsServerApiKey()` in `src/lib/maps.ts`; `calculateQuote` + `reconcileBookingQuote` updated; `NEXT_PUBLIC_GOOGLE_MAPS_KEY` remains Places-only in `AddressAutocomplete`.

- **PayFast:** `PAYFAST_MERCHANT_ID` (server); `processPayment` returns `payfastProcessBaseUrl`; removed `NEXT_PUBLIC_PAYFAST_*` from app code; webhook uses conditional update + early **paid** return; **FAILED/CANCELLED** does not downgrade **paid**.

- **Corporate hooks:** migration `20260413130000_vst13_corporate_invoicing_hooks.sql`, Zod on `booking-schemas`, `processPayment` + `createBooking`, `updateBookingInvoicingHooksAction`, **`/ops/invoicing`**.

- **Tests:** `payfast-signature.test.ts`, `webhook/__tests__/route.test.ts`, `maps-server-key.test.ts`; `calculateQuote` tests env updated.

- **Quality gate:** **`CONTRIBUTING.md`** / **`docs/local-development.md`** list **lint / test / build** and PayFast/maps placeholders (no in-repo GitHub Actions workflow).

- **`npm run test`**, **`npm run lint`**, **`npm run build`** passed locally.



### Story DoD Checklist Report (summary)



- AC1–AC15 addressed via docs + code + migration + tests; epic **VST-13** bullet unchanged (already matched story).

- DoD: tests green; no new npm dependencies; secrets documented server-only.



### Change Log



| Date | Change |

|------|--------|

| 2026-04-07 | Initial **Draft**: **VST-13 Integrations and payments** from **`docs/epic-4.md`**; dependencies **VST-5** / **VST-6**, **VST-3**, **VST-12**; PayFast/webhook **extend-not-rewrite** note; **15 ACs** (integrations doc, env matrix docs, maps contract + Permissions-Policy, webhook idempotency + duplicate notify, signature tests/checklist, failed/cancel paths + recovery UX, sandbox docs, corporate invoicing hooks, optional ops stub, data-models, index + API docs, Vitest, client secret hygiene, VST-12 cross-link, epic consistency); **15 tasks** mapped to ACs; **Dev Technical Guidance** (`processPayment`, `payfast`, webhook, maps, reconcile, ops-auth, compliance handoff). |

| 2026-04-07 | **Implemented:** integrations doc, env + `.env.example`, Google maps server/browser split, PayFast webhook idempotency + env hygiene, corporate columns + ops stub + tests, story **Review**. |

