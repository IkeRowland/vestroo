# Compliance and safety (engineering)

This document describes **engineering** controls and **product hooks** for South Africa–aware personal information handling, **incident** logging, **compliance document** metadata, **retention** labelling, and **data subject request (DSR)** export / anonymisation. It is **not** legal advice and **does not** replace POPIA sign-off, privacy policies, or DPO processes — same boundary tone as **[realtime-and-notifications.md](realtime-and-notifications.md)** (*Legal and product boundary*) and **[stories/vst-9.story.md](stories/vst-9.story.md)** out-of-scope notes.

## POPIA-oriented engineering checklist (mappable themes)

Use this as an **orientation** checklist for implementation reviews; **legal** interpretation is out of scope.

| Theme (POPIA-style) | As implemented / planned in-repo |
|---------------------|----------------------------------|
| **Lawful processing / purpose limitation** | Customer and guest data collected for **booking, fulfilment, and operations** only as wired in Server Actions and schema (see **[data-models.md](data-models.md)**). No secondary marketing profile without a future explicit story. |
| **Minimisation** | Field app minimises chauffeur-visible PII (**[field-tools.md](field-tools.md)**); incident **`metadata`** must not store raw PII (below). |
| **Security measures** | RLS on compliance tables; staff JWT for ops mutations; **admin-only** DSR actions (**[ops-console.md](ops-console.md)**); service role server-only (**[environment-vars.md](environment-vars.md)**). |
| **Transparency / access** | **MVP:** admin-triggered **minimal JSON export** (`exportDataSubjectAction`) — not a self-service portal. |
| **Correction / deletion** | **MVP:** admin **anonymise** pattern on **`profiles`** + linked **booking** guest fields + **`trips.customer_id`** (`anonymiseDataSubjectAction`). **Hard delete** and **auth.users** cleanup are **documented follow-ups** (Dashboard / Admin API). |
| **Breach / incident readiness** | **`compliance_incidents`** for internal logging purposes (triage, safety, privacy-related events) — **not** automated regulator notification. |
| **Retention** | **`retention_class`** / **`retention_until`** columns on incidents, document rows, **`profiles`**, **`bookings`**; **purge automation deferred** (optional stub below). |
| **Third parties / cross-border** | Maps, email, PayFast: see **[api-reference.md](api-reference.md)** / **[front-end-api-interaction.md](front-end-api-interaction.md)**; sub-processor governance is **legal / ops** outside this file. |

## Incident logging (`public.compliance_incidents`)

**Purposes:** operational, safety, privacy-process, and security-adjacent events that staff need to **record and list** without exposing tables to customers or chauffeurs.

**Who may create/view:** **Dispatcher** and **admin** only (RLS via **`public.is_staff()`**; Server Actions use **`getOpsStaffForAction()`**). **Chauffeurs** and **customers** have **no** SQL access. **Field tools** do **not** expose incidents (**[field-tools.md](field-tools.md)**).

**`metadata` jsonb — MUST NOT store:** free-text customer narratives with identifiers, names, emails, phone numbers, ID/passport numbers, financial account details, or special-category health data. Prefer **coarse labels**, internal ticket ids, and **booking UUIDs** (via **`related_booking_id`**) instead of duplicating PII.

## Compliance documents (vehicles and chauffeurs)

### Design choice: two tables (not polymorphic)

We use **`vehicle_compliance_documents`** and **`chauffeur_compliance_documents`** separately (see migration **`20260412120000_vst12_*`**).

**Rationale:** clear FKs (`vehicle_id` → **`vehicles`**, `chauffeur_id` → **`profiles`**), simpler CHECK constraints per entity, and straightforward ops listings without `entity_type` branching. A polymorphic **`compliance_documents`** table would reduce table count but push validation and joins into application code; two tables match fleet vs people workflows.

**Fields:** `document_type` (CHECK), optional `expiry_date`, **`storage_bucket`** + **`storage_object_path`** (Supabase Storage; signed URLs **server-only**), optional **`notes`** (staff-only semantics — avoid plain-text ID numbers). Timestamps and optional **`retention_class`** / **`retention_until`**.

## RLS summary

All new compliance tables: **RLS enabled**; **no** policies for **anon**; **authenticated** access only where **`is_staff(auth.uid())`**. Named policies in the migration for PR review (**[staging-and-promotion.md](staging-and-promotion.md)**). **DSR** mutations are further restricted to **`ProfileRole === 'admin'`** in Server Actions (`getOpsAdminForAction()`), not only `is_staff`.

## Retention classes and purge strategy (documentation-first)

**Classes** (aligned with column CHECK constraints):

| Class | Typical use |
|-------|-------------|
| **`operational`** | Trips, dispatch artefacts, short-lived ops data. |
| **`financial`** | Bookings / payment references subject to tax/audit windows. |
| **`compliance_document`** | Licences, PDP, insurance metadata rows. |
| **`marketing`** | Optional future consent-led data (stub). |

**Purge:** **No cron or Edge purge ships in this story.** Operators may delete/archive per org policy using staff tools and Supabase backups. **Optional stub (commented sketch):**

```sql
-- Post-MVP: scheduled job (pg_cron / Edge Function) — example only, do not run blindly:
-- DELETE FROM public.compliance_incidents
--   WHERE retention_until IS NOT NULL AND retention_until < current_date;
-- (Review legal hold / incident freeze before any automated delete.)
```

## DSR export and delete / anonymise boundaries

### Scope of **`exportDataSubjectAction`** (admin only)

- **Subject:** **`profiles.role = customer`** only (MVP guard).
- **Resolve by:** `profileId` **or** exact **`profiles.email`** (case-insensitive guest match on **`bookings.customer_email`** requires non-empty profile email).
- **Payload (`vst12_dsr_minimal_v1`):** profile row subset (including retention fields), **deduped bookings** where `customer_id = profile.id` **or** guest rows with same email, **trips** with `customer_id = profile.id`.
- **Out of MVP export:** full **`ops_audit_log`** history, **`tickets`**, **`notifications`**, raw Storage files, and **`auth.users`** metadata (document separate process).

### Scope of **`anonymiseDataSubjectAction`** (admin only)

- **Subject:** **`customer`** profiles only; rejects if **`data_subject_anonymised_at`** already set.
- **Writes:** **`profiles`**: placeholder name/phone/email, clear avatar, **`status = inactive`**, set **`data_subject_anonymised_at`**; **bookings** (by `customer_id` or guest email match): redact **`customer_name`**, **`customer_email`**, **`customer_phone`**; **`trips`**: **`customer_id` null** where it matched the subject (column nullable — **[data-models.md](data-models.md)**).
- **Follow-up:** **`auth.users`** email/phone may still exist — **Supabase Dashboard** or **Admin API** required for full account removal; flagged in audit payload `auth_users_followup_required: true`.
- **Hard delete** of referential rows is **out of MVP** unless a migration plan is approved.

## Audit stream choice

**We use a single stream: `public.ops_audit_log`** via **`appendOpsAuditLog`** (**[src/lib/ops-audit.ts](../src/lib/ops-audit.ts)**).

**Rationale:** VST-7/VST-8 already centralise operational and field events; DSR and compliance mutations stay **searchable in one place** (`action` discriminates: `dsr_export`, `dsr_anonymise`, `create_compliance_incident`, `create_vehicle_compliance_document`, `create_chauffeur_compliance_document`). A separate **`compliance_audit_log`** would duplicate infrastructure for ISO-style separation without a current reporting consumer.

**Payload rules:** continue to avoid PII in **`ops_audit_log.payload`** (ids and counts only for DSR).

## Related documentation

- **[data-models.md](data-models.md)** — tables, RLS, retention columns.
- **[ops-console.md](ops-console.md)** — `/ops/compliance`, JWT vs service role.
- **[field-tools.md](field-tools.md)** — chauffeur PII boundaries (no compliance-table access).
- **[realtime-and-notifications.md](realtime-and-notifications.md)** — deferred compliance UI hooks (VST-9).
- **[stories/vst-12.story.md](stories/vst-12.story.md)** — acceptance criteria source.
