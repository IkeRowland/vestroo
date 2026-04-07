# Story VST-12: Compliance and safety



## Status: Done



**Dependencies:** **[VST-5](vst-5.story.md)** MUST be **complete and stable** for **schema**, **RLS**, **`profiles`**, **`bookings`**, **`vehicles`**, **`chauffeurs`**, and **driver linkage** as described in **`docs/data-models.md`**. **[VST-7](vst-7.story.md)** MUST be **available** for **`/ops/*`**, staff-gated Server Actions (**`src/actions/opsDispatch.ts`**), **`public.ops_audit_log`**, and **`docs/ops-console.md`** patterns. **[VST-8](vst-8.story.md)** establishes **field POPIA boundaries** — this story MUST **align** compliance docs and RLS with **`docs/field-tools.md`** and **`src/lib/field-customer-contact.ts`** (chauffeurs MUST **not** gain **incident** or **compliance document** admin). **[VST-9](vst-9.story.md)** and **`docs/realtime-and-notifications.md`** **defer** full **compliance** UIs and **retention/export** to **VST-12** — this story **implements** those deferred hooks where agreed. **[VST-11](vst-11.story.md)** and **`docs/close-protection-engagements.md`** **defer** **retention** / **export-delete** specifics for **close protection** to **VST-12** — this story MUST **integrate** (cross-link, shared audit/retention classes) and MUST **not duplicate** CP engagement lifecycle rules already owned by VST-11. **[VST-3](vst-3.story.md)** (**`SECURITY.md`**, **`docs/operational-guidelines.md`**) is **awareness-only** baseline — VST-12 **extends** the repo with **compliance artefacts** (tables, ops surfaces, engineering checklist) without replacing coordinated disclosure or dependency hygiene docs.



## Story



- As a **compliance-aware administrator** (and **operations staff** where ACs grant read/write on incidents and fleet documents)

- I want **South Africa–aware** handling of **personal information**, **incident** logging, **vehicle** and **chauffeur** **document** tracking with **expiry**, **retention** policy hooks, and **admin** **export/delete** flows backed by **audit** records

- so that the platform supports a **POPIA-oriented engineering checklist** (with **legal sign-off outside engineering**), **early policy hooks** can ship **before** full automation, and **staff** can **review** compliance posture without exposing compliance tables to **customers** or **chauffeurs**



## Epic traceability (source)



**From `docs/epic-4.md` — VST-12:** The platform MUST support South Africa–aware handling of personal information, **incident** logging, **vehicle** and **chauffeur** document tracking, **retention**, and **export/delete** flows where applicable, with **audit** tables and **admin** compliance views. Practices MUST map to a **POPIA-oriented checklist** (**legal sign-off outside engineering**). Track detail in **`docs/stories/vst-12.story.md`**.



**Terminology alignment (folded from epic Domain vocabulary):**



1. Prefer **incident** (operational / privacy / safety event log) and **compliance document** (licence, insurance, PDP, clearance **metadata** — not the legal advice) over informal shorthand (“ticket”, “file”) in schema and UI.

2. **Vehicle** and **chauffeur** remain **core domain** entities; compliance rows **reference** them via FKs — they do **not** replace **`vehicles`** / **`chauffeurs`** lifecycle tables from VST-5.

3. **Close protection engagement** rules stay **owned by VST-11**; VST-12 adds **retention / export / incident** hooks that **apply** where product policy says so, **without** redefining engagement **status** or **coordination_notes** semantics.



**Out of scope (for this slice):** Full **legal** review workflow inside the app; **DPO** self-service portal; **automated** ICO-style **breach notification** to regulators; **ISO 27001** certification evidence pack; **native** mobile **compliance** apps; **replacing** or **authoring** **privacy policy** PDFs or **data processing agreements**; **warranty** that engineering checklist satisfies POPIA (checklist is **orientation** only pending **legal** sign-off).



## Acceptance Criteria (ACs)



1. **Compliance design doc:** Add **`docs/compliance-and-safety.md`** (name fixed unless a rename is explicitly justified in the PR and reflected here) describing: **South Africa / POPIA-oriented** **engineering** practices (minimisation, purpose limitation **as implemented in code**), an **engineering checklist** mappable to POPIA themes (**not** legal sign-off — same **tone** as **`docs/realtime-and-notifications.md`** § *Legal and product boundary* and **`docs/stories/vst-9.story.md`** **out of scope** notes); **incident** logging **purposes** and **who** may create/view; **document** tracking (types, expiry, storage); **retention classes** and **purge** strategy (**documentation-first**); **data subject request (DSR)** **export** / **delete** **boundaries**; cross-links to **`docs/data-models.md`**, **`docs/ops-console.md`**, **`docs/field-tools.md`**, **`docs/close-protection-engagements.md`** (VST-11 **handoff** — **integrate**, do **not** duplicate CP engagement rules), and **`docs/realtime-and-notifications.md`**. State **policy hooks early** even when **UI** is **MVP** or **stubbed**.



2. **Schema — incidents:** Introduce a dedicated table (e.g. **`public.compliance_incidents`** or **`public.operational_incidents`** — **final name** documented in migration **`COMMENT ON`** and the design doc) with at minimum: **`id`** (uuid PK), **`severity`** or **`category`** (constrained text / enum), **`summary`** (text), **`occurred_at`** (timestamptz), **`reported_by`** (FK → **`profiles`** / **`auth.users`** per repo convention), **`related_booking_id`** (nullable FK → **`bookings`**), **`metadata`** (jsonb, **PII-conscious** — document what MUST NOT be stored raw), **`created_at`**, **`updated_at`**. **Indexes** as needed for ops listing (e.g. **`occurred_at` DESC**).



3. **Schema — compliance documents:** Implement **vehicle** and **chauffeur** **document** tracking **either** as **two** tables (**e.g.** **`vehicle_compliance_documents`**, **`chauffeur_compliance_documents`**) **or** one **polymorphic** **`compliance_documents`** with **`entity_type`** + discriminated FKs — **choose one** approach, **justify** in **`docs/compliance-and-safety.md`** and **`docs/data-models.md`**. Each row MUST support at minimum: **`document_type`** (constrained), **`expiry_date`** (nullable date), **storage reference** (**Supabase Storage** object id / bucket + path **or** documented external URL pattern — **no** secrets in client), **`vehicle_id`** and/or **`chauffeur_id`** per chosen model, **`created_at`**, **`updated_at`**, optional **`notes`** (staff-only semantics).



4. **RLS:** Enable **RLS** on **all new** compliance tables. **`anon`**, **`authenticated`** **customers**, and **`chauffeur`** profiles MUST have **no** direct **`SELECT`/`INSERT`/`UPDATE`/`DELETE`** on these tables. **`dispatcher`** and **`admin`** (via **`is_staff()`** or equivalent) MUST be able to **manage** incidents and compliance documents per product rules; if **admin-only** mutations are required for **subset** operations, document and enforce in **Server Actions** (see AC7–AC8). Policies MUST be **named** and **reviewed** in the migration PR per **`docs/staging-and-promotion.md`**.



5. **Retention:** Document **retention classes** (e.g. **operational**, **financial**, **compliance_document**, **cp_engagement_related**) in **`docs/compliance-and-safety.md`**. Add **schema columns** on **agreed** tables (incidents, document rows, and/or **`bookings`** / **`profiles`** stubs) such as **`retention_class`** and/or **`retention_until`** **where** the design doc specifies — **full scheduled purge automation** (cron, Edge Functions) MAY be **deferred** if explicitly noted as **post-MVP**; MVP MUST still ship **documented policy** + **optional stub** (e.g. SQL view or commented cron sketch) **without** blocking merge.



6. **Audit logging:** **Every** **DSR export** and **DSR delete/anonymise** (AC7–AC8) MUST write an **immutable-audit-style** row to **`public.ops_audit_log`** **or** a new **`public.compliance_audit_log`** — **justify the choice** in the design doc (single stream vs separation for **ISO-readiness** / noise reduction). **Material** incident and compliance-document **mutations** SHOULD also be auditable (**ops_audit_log** preferred for consistency with VST-7 unless **compliance_audit_log** is introduced with clear scope).



7. **DSR export (admin-only):** Implement **admin**-only Server Actions (using **`src/lib/ops-auth.ts`**, enforcing **`ProfileRole`** **`admin`** — not merely **`is_staff`**) that produce a **minimal JSON** export for a **data subject** scoped by **`profile` id** and/or **verified email** (exact scope documented in **`docs/compliance-and-safety.md`** and **`docs/front-end-api-interaction.md`**). Inputs/outputs MUST use **Zod**; **no** unchecked **`any`**. **Service role** usage MUST follow existing server-only patterns (**never** browser exposure).



8. **DSR delete / anonymise (admin-only):** Implement **admin**-only Server Actions for **soft delete** and/or **anonymisation** of **customer-scoped** data per documented **pattern** (e.g. flag on **`profiles`**, redact **`bookings`** contact fields — **exact** approach in design doc). **Hard delete** of **referential** rows MAY be **out of MVP** if documented; **must not** violate FK integrity without a **migration plan**. **Zod**-validated inputs; **audit** per AC6.



9. **Ops UI (MVP):** Add a staff route under **`src/app/(ops)/`** — **`/ops/compliance`** **or** **`/ops/admin/compliance`** (pick one, align with existing layout and **`docs/ops-console.md`**) — surfacing at minimum: **recent incidents** (list), **compliance documents nearing expiry** (filter within **N** days, **N** documented), and a **stub** **export request** flow **or** single-step **MVP** **trigger** wired to AC7 (clear **UX** labelling: **staff-only**, **audit**).



10. **VST-11 integration:** In **`docs/compliance-and-safety.md`** (and **`docs/data-models.md`**), explicitly state how **close protection engagements** (**`public.close_protection_engagements`**) **inherit** **retention** / **export** rules — **reference** **`docs/close-protection-engagements.md`**; **do not** redefine **engagement** **status** or **coordination_notes** access rules (remain VST-11).



11. **Types:** Extend **`src/types/database.types.ts`** (hand-maintained) with **new table** row shapes, **status/category** unions aligned with migrations, and any **DSR** payload types used by Server Actions.



12. **Data model doc:** Update **`docs/data-models.md`** with **new tables**, **RLS summary**, **retention** column notes, and **epic** mapping row for **Compliance and safety** (from “Not present” / stub to **delivered** when implemented).



13. **Index and API docs:** Link **`docs/compliance-and-safety.md`** from **`docs/index.md`** (Developer onboarding). Update **`docs/front-end-api-interaction.md`** with **Server Action** names, **`admin` vs `is_staff`** expectations, and **DSR** **scope** notes.



14. **Tests:** Add **Vitest** coverage for **Zod** schemas and **authorisation** branches (**admin** vs **dispatcher** vs **non-staff** as applicable), following patterns under **`src/actions/__tests__/`**. **`npm run test`** MUST pass in CI.



15. **Sitemap / public surface:** **No** public routes for compliance consoles; **`src/app/sitemap.ts`** MUST **not** list **`/ops/*`** URLs. If **marketing** or **legal** copy is touched, keep changes **minimal** and **accurate** — **no** claim of **legal compliance** beyond **engineering** posture.



16. **Epic traceability:** After implementation, **`docs/epic-4.md`** bullet **VST-12** MUST remain **consistent** with this story and **`docs/compliance-and-safety.md`**; resolve conflicts in **epic** or **this file** explicitly.



## Tasks / Subtasks



- [x] **Task 1 — AC1:** Author **`docs/compliance-and-safety.md`** (POPIA-oriented **engineering** checklist, legal boundary, incidents, documents, retention, DSR, cross-links, VST-11 integrate). (AC: #1)



- [x] **Task 2 — AC2:** Add migration for **incidents** table + constraints, indexes, comments. (AC: #2)



- [x] **Task 3 — AC3:** Add migration(s) for **compliance document** model (split or polymorphic) + storage reference fields. (AC: #3)



- [x] **Task 4 — AC4:** Implement **RLS** on new tables; verify **customer** and **chauffeur** denial; staff policies. (AC: #4)



- [x] **Task 5 — AC5:** Add **retention** columns per design doc; document **purge** policy + optional **stub**; note automation deferral if applicable. (AC: #5)



- [x] **Task 6 — AC6:** Implement **audit** writes for DSR and key mutations; document **ops_audit_log** vs **`compliance_audit_log`** choice. (AC: #6)



- [x] **Task 7 — AC7:** Implement **admin**-only **DSR export** Server Action(s) + **Zod**. (AC: #7)



- [x] **Task 8 — AC8:** Implement **admin**-only **DSR delete/anonymise** Server Action(s) + **Zod** + documented pattern. (AC: #8)



- [x] **Task 9 — AC9:** Ship **MVP `/ops/.../compliance`** UI + nav consistent with **`(ops)`** layout. (AC: #9)



- [x] **Task 10 — AC10:** Document **VST-11** **CP** linkage in compliance + data-models (**no** duplicate engagement rules). (AC: #10)



- [x] **Task 11 — AC11:** Update **`src/types/database.types.ts`** for new types. (AC: #11)



- [x] **Task 12 — AC12:** Update **`docs/data-models.md`**. (AC: #12)



- [x] **Task 13 — AC13:** Update **`docs/index.md`** and **`docs/front-end-api-interaction.md`**. (AC: #13)



- [x] **Task 14 — AC14:** Add **Vitest** tests; confirm **`npm run test`**. (AC: #14)



- [x] **Task 15 — AC15:** Verify **sitemap** / public routes exclude ops compliance URLs. (AC: #15)



- [x] **Task 16 — AC16:** Re-read **`docs/epic-4.md` VST-12**; align epic text with delivered behaviour. (AC: #16)



## Dev Technical Guidance



- **Prerequisites:** Read **`docs/data-models.md`**, **`docs/ops-console.md`**, **`src/lib/ops-auth.ts`** (**`ProfileRole`**, **`is_staff`**), **`public.ops_audit_log`** migrations, **`docs/close-protection-engagements.md`**, **`docs/field-tools.md`**, and **`src/lib/field-customer-contact.ts`** before schema/action work.

- **Policy hooks early:** Prefer **documented extension points** (e.g. retention columns, audit events, stub **export** UI) so later stories can add **cron** / **queues** without redesigning FKs.

- **Server Actions:** Follow **`src/actions/opsDispatch.ts`** / **`src/actions/opsCloseProtection.ts`** for **staff JWT** patterns; **elevate** to **`admin`** checks for **DSR** per AC7–AC8 — **do not** expose compliance tables via **customer** or **chauffeur** clients.

- **Storage:** Use **Supabase Storage** with **server-side** signed access patterns where needed; **never** put **service role** keys in client bundles.

- **RLS:** Customers **must** rely on **Server Actions** for any future “my data” features; this story’s MVP may be **admin-only** DSR — still **deny** direct table access.

- **Testing:** **`vitest.config.ts`**; mirror **`src/actions/__tests__/opsCloseProtection.test.ts`**-style **auth** branching tests.

- **Legal:** **Engineering** delivers **checklist** and **controls**; **legal** sign-off is **explicitly** out of scope — avoid marketing copy that claims **POPIA compliance**.



## Story Progress Notes



### Agent Model Used: Dev Agent (implementation 2026-04-07)



### Completion Notes List



- **Migration:** `supabase/migrations/20260412120000_vst12_compliance_incidents_documents_retention.sql` — `compliance_incidents`, `vehicle_compliance_documents`, `chauffeur_compliance_documents`, retention + `data_subject_anonymised_at` on `profiles`, retention on `bookings`, RLS + named policies.

- **Actions:** `src/actions/opsCompliance.ts`; Zod in **`src/lib/ops-compliance-schemas.ts`** (Next.js **`use server`** files may only export async functions — schemas live in `lib`).

- **Auth:** `getOpsAdminForAction()` in **`src/lib/ops-auth.ts`** (admin-only DSR).

- **UI:** `src/app/(ops)/ops/compliance/page.tsx`, `src/features/ops/components/ComplianceDsrPanel.tsx`, nav link in **`src/app/(ops)/ops/layout.tsx`**.

- **Tests:** `src/actions/__tests__/opsCompliance.test.ts` — Zod + staff vs admin branches; **`npm run test`** and **`npm run build`** pass.

- **Build fix (related):** Moved **`opsCloseProtection`** Zod exports to **`src/lib/ops-close-protection-schemas.ts`** so existing ops pages satisfy the same Next.js server-action export rule.



### Definition of Done checklist



See **`docs/checklists/story-dod-checklist.txt`** — all ACs addressed; legal sign-off remains explicitly out of scope per story.



### Change Log



| Date | Change |

|------|--------|

| 2026-04-07 | Initial **Draft**: **VST-12 Compliance and safety** from **`docs/epic-4.md`**; dependencies **VST-5**, **VST-7**, **VST-8**, **VST-9**, **VST-11** (integrate / no duplicate CP rules), **VST-3** (awareness baseline); **admin / ops** persona; epic traceability + terminology + **out of scope** (legal workflow, DPO portal, automated regulator breach notification, ISO pack, native apps, privacy PDF replacement); **16 ACs** (design doc **`docs/compliance-and-safety.md`**, incidents schema, compliance documents schema + storage, RLS, retention policy + columns + optional automation deferral, audit stream choice, admin DSR export, admin DSR delete/anonymise, MVP ops UI, VST-11 integration notes, types, **data-models**, index + API docs, Vitest, sitemap guard, epic alignment); **16 tasks** mapped to ACs; **Dev Technical Guidance** (`ops-auth`, `ops_audit_log`, field boundaries, Storage, testing). Status **Draft**. |

| 2026-04-07 | **Implemented:** migration, **`docs/compliance-and-safety.md`**, **`opsCompliance`** + admin DSR, **`/ops/compliance`**, docs + types + tests; **Status → Review**. |

