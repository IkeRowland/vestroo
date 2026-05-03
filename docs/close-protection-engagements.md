# Close protection engagements (VST-11)

High-level **close protection engagement** records link **[bookings](data-models.md)** to optional **[trips](data-models.md)** fulfilment rows. They exist so **dispatcher** and **admin** staff can coordinate VIP / sensitive movements **in-system** without building tactical security tooling in MVP.

**Related:** [Data models — Close protection](data-models.md) · [Operations console](ops-console.md) · Story **[VST-11](stories/vst-11.story.md)**. **Compliance / retention / export UI:** deferred to **[VST-12](stories/vst-12.story.md)** (this story documents PII boundaries and audit hooks only).

## MVP workflow

1. **Customer / enquiry** — Public surface remains **enquiry-led** (e.g. marketing **Close protection** → **Contact**). There is **no** customer self-serve checkout that creates an engagement row.
2. **Booking** — A normal **`bookings`** row exists after the web flow (or internal booking) as today.
3. **Engagement creation** — **Dispatcher** or **admin** creates **`public.close_protection_engagements`** from **`/ops/close-protection`**, anchored on **`booking_id`**. Initial **`status`** is usually **`draft`** until coordination is live.
4. **`trip_id`** — **Nullable** until fulfilment exists. When **dispatch** runs **`assign_booking_to_run`** (see **`src/actions/opsDispatch.ts`**), the app **updates** any engagement for that **`booking_id`** that still has **`trip_id` null** to the new trip. Staff may also set or adjust **`trip_id`** manually when policies allow, provided the trip is linked to the same booking via **`booking_trips`**.
5. **Lifecycle** — Staff move **`status`** through **`active`** → **`completed`** or **`cancelled`**, and maintain **`coordination_notes`** for handover between shifts.

## Cleared roles

| Role | Access |
|------|--------|
| **dispatcher**, **admin** | **Read/write** engagements (via **`public.is_staff()`** and app gates — see **`src/lib/ops-auth.ts`**). |
| **customer**, **chauffeur**, **anon** | **No** CRUD; **RLS** denies all. |

**Deferred:** a dedicated **`close_protection_coordinator`** profile role is **not** in schema for MVP. If product later splits duties, add the role, extend **`is_staff()`** or add narrow policies, and update this doc.

## `booking_intent` / `booking_metadata` decision

**Approach B (chosen):** Do **not** add a **`close_protection`** value to **`booking_intent`**. Keep existing intents (**`point_to_point`**, **`hourly_hire`**, **`corporate_pattern`**, **`experience_package`**).

Optional **`bookings.booking_metadata`** keys (jsonb, **no migration required** for the bag shape):

- **`close_protection_requested`** (boolean) — reserved for a future **structured** contact / enquiry flag if product adds it; **MVP** uses **copy + `/contact` only** (no public write to engagements).
- **`close_protection_engagement_id`** (uuid string) — optional cross-reference if a future flow needs it; **not** required for MVP ops-created engagements.

Authoritative engagement data lives only in **`close_protection_engagements`**. See **[data-models.md](data-models.md)**.

## PII minimisation

- **Protectee identity** beyond what **`bookings`** already holds (guest / customer fields) is **out of scope** for this table — **no** duplicate passport, national ID, or credential vault columns.
- **`coordination_notes`** is **staff-only** and must remain **operational** (routes, times, codenames, SOP references, contact points **already cleared for ops**). **Do not** store:
  - Passport / ID numbers, visa details, or full **government ID** images
  - **Full medical** histories or diagnoses
  - **Unrelated third-party PII** (family, staff not involved in the leg)
  - Passwords, raw security system credentials, or **classified** material
- **Audit** (**`ops_audit_log`**) records **material** changes (**create**, **status** / **notes** updates) with **payloads** that avoid note **content** and customer PII (ids and field labels only), consistent with other ops actions.

## Field / chauffeur isolation

Chauffeurs execute **trips** in **`/field/*`**; they **must not** read **`close_protection_engagements`** or **`coordination_notes`**. **`src/actions/fieldChauffeur.ts`** does not touch this table; RLS blocks JWT chauffeur clients. See **[field-tools.md](field-tools.md)**.

## Handoff to VST-12

- **Retention** schedules and **automated purge** of engagements / notes.
- **Data subject** export and delete flows involving coordination data.
- **Incident** logging and **compliance** dashboards.
- **Credential / clearance** vault (if ever in scope) — **not** in VST-11.

## Server Actions (staff JWT)

Implemented in **`src/actions/opsCloseProtection.ts`** — **`createUserServerClient()`** + **`getOpsStaffForAction()`**. Names and auth expectations are summarised in **[front-end-api-interaction.md](front-end-api-interaction.md)**.
