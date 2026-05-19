# Data models (Supabase / PostgreSQL)

Canonical schema lives in **`supabase/migrations/`** (timestamp order = apply order). This document maps **`docs/epic-4.md` Domain vocabulary** to **`public.*` tables**, documents **gaps and phased work**, and summarises **roles and RLS**. Legacy **Payload** collection descriptions in older revisions of this file are **not** current truth for the Vestroo stack.

## Role model (`public.profiles`)

| Column | Notes |
|--------|--------|
| **`role`** | One of **`customer`**, **`chauffeur`**, **`dispatcher`**, **`admin`**. Enforced by **`profiles_role_check`**. |
| **`status`** | `active` / `inactive`. |

**VST-5 migration decision (legacy → epic):**

- **`driver` → `chauffeur`** (same fulfilment actor, Vestroo vocabulary).
- **`manager` → `dispatcher`** (ops desk / dispatch; keeps prior broad staff access via **`public.is_staff()`**).
- **`admin`** unchanged (elevated platform access).

**`public.is_staff(uid)`** returns true only for **`admin`** and **`dispatcher`**. **Chauffeurs** are **not** staff for catalogue / network staff policies; they use **row-scoped** policies (e.g. own **`chauffeur_id`**, assignment rows).

Application types: **`src/types/database.types.ts`** (`ProfileRole`).

## Epic entity → `public.*` mapping

| Epic concept | Primary tables / notes | Gap / phase |
|--------------|-------------------------|-------------|
| Organisations / clients | Not modelled as dedicated org table; **guest fields** on **`bookings`** (`customer_name`, `customer_email`, `customer_phone`). **`profiles`** for authenticated users. | **Phase:** `organisations`, `organisation_members` (or similar) for B2B. |
| Service routes | **`service_routes`**, **`service_route_points`** → **`service_points`** | Aligned (renamed from bus-route vocabulary in earlier migrations). |
| Service patterns | **`service_patterns`** | Aligned. Column **`chauffeur_ids`** (uuid[]) holds template chauffeur references. |
| Runs | **`service_runs`** | Aligned. Optional **`chauffeur_id`** on run row. **`scheduled_start` / `scheduled_end`** = **service window** for the run (**[ADR 0002](adr/0002-patterned-shuttle-domain-sh9-2.md)** / **SH.9.2**). **`passenger_capacity`** (SH.9.3) = declared max passengers per run for capacity-managed departures (**[ADR 0003](adr/0003-service-run-capacity-holds-sh9-3.md)**). |
| Run manifest (patterned shuttle) | **`service_run_manifest_entries`** | **SH.9.2:** ordered passenger / party lines per **`service_run_id`** (`sequence_order`, optional **`booking_id`**, **`passenger_profile_id`**, **`guest_display_label`**). **RLS:** staff all; chauffeur **`SELECT`** when **`service_runs.chauffeur_id`** matches; customer **`SELECT`** for own profile or **`bookings.customer_id`**. Migration **`20260417120000_sh92_service_run_manifest_entries.sql`**; vocabulary **[ADR 0002](adr/0002-patterned-shuttle-domain-sh9-2.md)**. |
| Service points | **`service_points`** | Aligned. |
| Vehicles | **`vehicles`**, **`vehicle_categories`**, **`vehicle_pricings`**, **`service_configs`** | Aligned. Web quote stub may use **string** vehicle option ids on **`bookings.vehicle_id`** before fleet join. |
| Chauffeurs | **`profiles`** (`role = chauffeur`), **`chauffeur_assignments`**, **`chauffeur_schedules`** (renamed from **`driver_schedules`**) | Aligned naming (VST-5). |
| Bookings / trips | **`bookings`**, **`booking_trips`**, **`trips`** | Aligned. **`trips.chauffeur_id`** links fulfilment chauffeur. |
| Tour / experience packages | **`experience_packages`** (VST-10) + legacy stub **`service_patterns`** / **`service_routes`** (“Winelands experience template”) in **`20260406121000_*`**. |
| Compliance & safety | **`compliance_incidents`**, **`vehicle_compliance_documents`**, **`chauffeur_compliance_documents`**; retention columns on **`profiles`**, **`bookings`**, and compliance rows (**`retention_class`**, **`retention_until`**); **`profiles.data_subject_anonymised_at`** | **Delivered (VST-12):** staff ops + admin DSR actions; purge automation optional post-MVP. |
| Documents / audit | **`ops_audit_log`** (operational + DSR + compliance mutations) | **VST-12** extends action list; single stream preferred over split compliance audit table (**[compliance-and-safety.md](compliance-and-safety.md)**). |
| Trip / service feedback | **`ratings`** — **`trip_id`**, **`chauffeur_id`** (renamed from **`driver_id`** in VST-5), **`customer_id`**, **`rate`**, **`feedback`**; **RLS** **`ratings_parties`**, **`ratings_insert_customer`** (see **`20260406103000_vestroo_profile_roles_chauffeur_columns_rls.sql`**) | **Schema + RLS aligned**; **first-party writes / reads:** **TBD** in **`src/actions/`** — traceability **[RT.7.6](capstone-backend-module-matrix.md#rt-7-6)** (**[Story 7.6](stories/7.6.story.md)**). **Not** a **Supabase Realtime** topic today — same matrix subsection. |

## Gap analysis: `tickets`, `trip_seats`, `chauffeur_schedules`

### `public.tickets`

- **Purpose in schema:** Seat commitment on a **scheduled service run** between two **service points**, with **`passenger_id`**, fare, boarding time, **`service_run_id`**, **`service_route_id`**.
- **Epic mapping:** Closest to **scheduled / shared-ride inventory** (“ticket” wording is acceptable when selling discrete seats; for charter-first positioning prefer **booking** / **trip** in product copy).
- **SH.9.3 (capacity / holds):** **`ticket_inventory_state`** (`legacy` \| `hold` \| `confirmed` \| `released` \| `expired` \| `cancelled`), optional **`hold_expires_at`**, optional **`idempotency_key`** (unique per **`service_run_id`** when set), optional **`booking_id`**. **`legacy`** rows are excluded from capacity sums. **Transactional** reserve / release / confirm / expire via **`reserve_service_run_capacity`** and related RPCs (**`20260418140000_sh93_*.sql`**, **[ADR 0003](adr/0003-service-run-capacity-holds-sh9-3.md)**). Server Actions: **`src/actions/service-run-capacity.ts`** (JWT path for reserve/release/confirm/cancel; service role for batch expire).
- **SH.9.5 (patterned checkout + PayFast):** Service-role RPCs **`reserve_service_run_capacity_for_booking_checkout`**, **`confirm_ticket_holds_for_paid_booking`**, **`release_ticket_holds_for_failed_booking`** (**`20260418160000_sh95_*.sql`**, **[ADR 0005](adr/0005-patterned-checkout-sh9-5.md)**) — **`processPayment`** + **`/api/payfast/webhook`** only; guest automated patterned checkout **not** in MVP (requires **`bookings.customer_id`**).
- **Decision:** **Aligned** with Vestroo run/pattern vocabulary after column renames; **retain** table name `tickets` for now (breaking rename deferred to avoid app/ETL churn). **`COMMENT ON`** documents intent (see migration **`20260406103000_*.sql`**).

### `public.trip_seats`

- **Purpose:** Aggregated **seats occupied** per **`service_run_id`** and point-to-point segment (`from_point_id`, `to_point_id`).
- **Epic mapping:** Seat inventory on a **run** (passenger capacity segment).
- **SH.9.3 note:** Per-**`service_run_id`** enforcement is implemented on **`tickets`** + **`service_runs.passenger_capacity`**. **Segment**-level caps via **`trip_seats`** remain a documented extension (same gap table); not auto-maintained in the SH.9.3 migration.
- **Decision:** **Aligned**; name kept as `trip_seats` (internal). Product surface should say **run** / **booking** as appropriate.

### `public.chauffeur_schedules` (formerly `driver_schedules`)

- **Capstone traceability:** **[capstone-backend-module-matrix.md — RT.7.5](capstone-backend-module-matrix.md#rt-7-5)** (**Story 7.5**) — **`DriverScheduleModule`** vs assignments, runs, roster; **no** shipped Realtime subscription on this table.
- **Purpose:** **Shift / roster** row: chauffeur, **work_date**, vehicle, hours, status; **`trips.schedule_id`** references it.
- **Epic mapping:** **Chauffeur** availability and assigned shift — not the same as a customer **trip**; supports ops scheduling (VST-7).
- **Decision:** **Renamed** table + **`chauffeur_id`** column in VST-5 for vocabulary alignment.

### `public.ratings` (trip feedback)

- **Purpose:** Persist **customer → chauffeur / trip** feedback: **`trip_id`** (FK **`trips`**), **`chauffeur_id`** and **`customer_id`** (FK **`profiles`**), **`rate`** (**1–5**), **`feedback`** text, timestamps.
- **DDL spine:** **`supabase/migrations/20260402131447_vin_shuttle_tickets_and_social.sql`** (create; original column name **`driver_id`**), **`20260402131457_vin_shuttle_rls_enable_and_is_staff.sql`**, **`20260402133655_vestroo_rls_policies_booking_social.sql`**, then **`20260406103000_vestroo_profile_roles_chauffeur_columns_rls.sql`** (**rename `driver_id` → `chauffeur_id`**, recreate **`ratings_parties`** / **`ratings_insert_customer`**).
- **App + Realtime:** **No** dedicated Server Actions under **`src/actions/`** **grep-verified** (2026-04-11). **`src/lib/supabase/realtime.ts`** has **no** **`ratings`** channel; **`20260409120000_vst9_realtime_notifications.sql`** does **not** add **`ratings`** to **`supabase_realtime`**. Canonical narrative: **[capstone-backend-module-matrix.md — RT.7.6](capstone-backend-module-matrix.md#rt-7-6)**.
- **NFR.3.1:** Party-scoped visibility only — follow **`ratings_parties`** / **`ratings_insert_customer`** definitions in SQL; **do not** assume cross-party **PII** reads beyond policies.

## Key relationships (FK overview)

- **`profiles.id`** ← **`auth.users.id`**; referenced by bookings, trips, tickets passenger, chauffeur columns, etc.
- **`bookings`** ← **`booking_trips`** → **`trips`**.
- **`trips`:** **`customer_id`**, **`chauffeur_id`**, **`schedule_id` → `chauffeur_schedules.id`**, **`vehicle_id` → `vehicles.id`**.
- **`service_routes`** ← **`service_route_points`** → **`service_points`**.
- **`service_patterns`** → **`service_runs`** (template to operational instance).
- **`chauffeur_assignments`:** chauffeur + vehicle + **service run** + time window; **`vehicle_trackings`** reference **`chauffeur_assignment_id`**.

## Web bookings (`public.bookings`) — VST-6

Guest and authenticated flows persist quote intent on **`public.bookings`** (Server Actions use the **service role** client; RLS still applies to **anon** / **authenticated** clients as defined in migrations).

| Column / area | Purpose |
|---------------|---------|
| **`booking_intent`** | `point_to_point` \| `hourly_hire` \| `corporate_pattern` \| `experience_package` (check constraint). Default **`point_to_point`**. |
| **`hourly_duration_hours`**, **`hourly_service_area_notes`** | Persisted hourly hire semantics (minimum billable hours enforced in `src/lib/pricing-env.ts` + `calculateHourlyHirePrice`). |
| **`service_pattern_id`** | Optional FK → **`service_patterns`** for corporate / contracted template references. |
| **`booking_metadata`** | JSON bag. For **`experience_package`**: **`experience_package_id`** (uuid), **`experience_date`** (ISO string), **`group_size`**, **`selected_addon_ids`** (string[]). See **[tours-and-experiences.md](tours-and-experiences.md)**. For **`corporate_pattern`** (SH.9.5): **`service_run_id`**, **`from_point_id`**, **`to_point_id`**, **`seats`**, optional **`idempotency_key`** — see **`BookingMetadataCorporatePatternKeys`** in **`src/types/database.types.ts`** and **[ADR 0005](adr/0005-patterned-checkout-sh9-5.md)**. **Epic 12 / Q6:** optional **`client_type_source`** (`user_confirmed_domain_match` \| `user_declined_domain_match` \| `no_match` \| `ops_manual`) — see **[epic-12-client-type-inference.md](epic-12-client-type-inference.md)**. |
| **`client_type`**, **`customer_account_id`**, **`account_snapshot`** | VST-14 account linkage — **`bookings_account_linkage_check`**. Populated on public inserts from Q6 + server verification — **[epic-12-client-type-inference.md](epic-12-client-type-inference.md)**. |
| **`payment_reference`** | Customer-facing reservation code (**`VST-*`**); used with phone in **`searchBooking`**. |
| **`trans_id`** | **PayFast** (current gateway) payment id — ITN writes **`pf_payment_id`** here; **does not** replace **`payment_reference`**. |
| **`payment_timestamp`** | Server timestamp when gateway reported a terminal state (see migration **`20260406120000_*`**). |
| **`invoice_requested`** | Corporate invoicing hook (boolean, default **false**) — MVP flag only; no PDF generation (**VST-13** / migration **`20260413130000_*`**). |
| **`purchase_order_ref`** | Optional short PO / reference; PII minimisation — not a full billing party record. |
| **`billing_entity_ref`** | Optional internal or contract reference (e.g. org code). |

### Lifecycle mapping (business vs payment)

| `bookings.status` | `bookings.payment_status` | When |
|-------------------|---------------------------|------|
| **`pending`** | **`pending`** | Row created (`createBooking` / `processPayment`); awaiting PayFast. |
| **`paid`** | **`paid`** | PayFast webhook **`COMPLETE`** (typical **simple** web booking path, e.g. `point_to_point` with immediate checkout). |
| **`ready_to_assign`** | **`paid`** | **Walk-in (Epic 14 / Q19):** PayFast **`COMPLETE`** sets **`payment_status`** to **`paid`**. In the same **`UPDATE`**, trigger `bookings_walk_in_paid_to_ready_to_assign` on `bookings` (`BEFORE UPDATE OF payment_status`, function `bookings_walk_in_paid_to_ready_to_assign_fn()`) sets **`status`** to **`ready_to_assign`** for **`client_type = 'walk_in'`** (account and other paths are excluded — Epic 12/13 **invoicing** semantics unchanged). **DDL:** `20260420220000_epic14_story141_ready_to_assign_walk_in_paid_trigger_v1.sql`. **Ops (Q18):** same rows on **`/ops/bookings`** (“**Ready to assign**”) and **`/ops/fulfil?queue=paid`** — see **[fulfil-queue-buckets.md](fulfil-queue-buckets.md)**. |
| **`pending`** | **`failed`** | PayFast **`FAILED`** / **`CANCELLED`** (booking can be retried with a new checkout). |
| **`cancelled`** | *(unchanged or still `pending`)* | Guest **`cancelBooking`** when not yet paid. |

**Walk-in quote-first (Epic 14)** — additional **`bookings.status`** values used before payment (**Q13** / **Q14**–**Q17**): e.g. **`submitted`**, **`triaged`**, **`quote_sent`**, **`awaiting_payment`**, in line with **[`docs/epic-14.md`](epic-14.md)**. Full narrative is **not** duplicated here.

### `public.booking_quotes` (cross-reference — Epic 12/13/14)

Versioned quote rows (`sent` / `superseded` / `expired` / `rejected`), Resend **HTML**, and **HMAC** links to **`/q/...`** (accept / pay / reject) are defined in [`docs/epic-12.md`](epic-12.md), [`docs/epic-13.md`](epic-13.md), and [`docs/epic-14.md`](epic-14.md) (and the walk-in payment slice in **[`integrations-and-payments.md#walk-in-quote-first-flow-epic-14`](integrations-and-payments.md#walk-in-quote-first-flow-epic-14)**). This file stays at the **`bookings` table** level; **`public.booking_quotes`** (and **`bookings.current_quote_id`**) hold quote versions and supersedes — no second full lifecycle spec here.

Application types: **`BookingIntentDb`**, **`BookingLifecycleStatus`**, **`BookingPaymentStatus`** in **`src/types/database.types.ts`**.

### `booking_trips` / `trips` (web scope)

The marketing wizard does **not** insert **`booking_trips`** or **`trips`** rows: guest bookings may lack **`customer_id`**, and fulfilment **trips** require ops (**chauffeur**, **vehicle**, **schedule**, etc.). **VST-7** is expected to attach **`trips`** and **`service_run_id`** when dispatch confirms a **run**.

### Seeds: corporate pattern + experience template

After core vehicle/pricing data exists, migration **`20260406121000_vst6_seed_corporate_and_experience_patterns.sql`** inserts:

- Fixed UUID **`a0000001-0000-4000-8000-000000000001`** — **Corporate Sandton circuit** **`service_routes`** row.
- Fixed UUID **`a0000001-0000-4000-8000-000000000002`** — **Winelands experience template** **`service_routes`** row.
- Fixed UUID **`b0000001-0000-4000-8000-000000000001`** — **`service_patterns`** (corporate-style template).
- Fixed UUID **`b0000001-0000-4000-8000-000000000002`** — **`service_patterns`** (experience-package stub template).

If **`vehicle_pricings`** is empty, the seed **no-ops** with a notice (apply core migrations first). Documented in **`docs/local-development.md`** (apply order).

### `public.experience_packages` (VST-10)

Curated **bookable** tour / experience rows. **Itinerary** and **add-on catalogue** are **jsonb**; **stub_origin** / **stub_destination** populate **`bookings`** geographic columns without Distance Matrix pricing.

| Column | Notes |
|--------|--------|
| **`slug`** | Unique public path segment (`/tours/[slug]`). |
| **`base_price_zar`**, **`per_passenger_increment_zar`**, **`included_passengers`** | Package math (see **`computeExperiencePackageQuote`**). |
| **`default_vehicle_category_id`** | Optional FK → **`vehicle_categories`**; else first tier that fits group size. |
| **`itinerary`** | Ordered steps: `order`, `title`, optional `duration_minutes`, `location_label`, `highlight`. |
| **`addon_catalog`** | `[{ id, label, price_zar }]`. |
| **`stub_*`** | JSON with `placeId`, `formattedAddress`, `name`, `latitude`, `longitude`. |
| **`is_active`** | **RLS:** **anon** / **authenticated** **SELECT** only when **true**; **staff** (`is_staff`) **all**; service role bypasses for Server Actions. |

**Seed:** migration **`20260410120000_vst10_experience_packages.sql`** — package id **`e0000001-0000-4000-8000-000000000001`**, slug **`cape-winelands-day`** (narrative aligned with Winelands template UUIDs in this file’s VST-6 seed section).

## RLS overview (by role)

- **Default:** RLS **enabled** on listed public tables; access only where a **policy** allows (deny-by-default).
- **Customer / passenger:** **`bookings`** (own `customer_id`), **`tickets`** (own `passenger_id`), **`trips`** as customer or chauffeur party, **`booking_trips`** via booking ownership, **`notifications`** as recipient, **`ratings`** as party. **`service_run_manifest_entries`:** **`SELECT`** when **`passenger_profile_id = auth.uid()`** or linked **`bookings.customer_id = auth.uid()`** (**SH.9.2**).
- **Chauffeur:** Row access via **`chauffeur_id = auth.uid()`** on trips, conversations, ratings, shared itineraries; **`chauffeur_assignments`** / **`chauffeur_schedules`** self rows; **`vehicle_trackings`** when linked to own assignment. **`service_run_manifest_entries`:** **`SELECT`** when **`service_runs.chauffeur_id = auth.uid()`** for the parent run (**SH.9.2** — **`20260417120000_sh92_*`**). **`tickets`:** **`SELECT`** when assigned to the run (**`tickets_chauffeur_run_select`**, **SH.9.3** — **`20260418140000_sh93_*`**). **VST-8:** additional **`bookings`** / **`booking_trips`** **select** policies when the booking is linked to a trip owned by the chauffeur (guest booking PII for active legs only — see migration **`20260408120000_*`**).
- **Dispatcher / admin (`is_staff`):** Broad read/write on fleet, service network, staff-managed tables, and cross-customer operations **as defined in policies** — not a bypass for **`auth` clients** unless using **service role** (server-only).

**`compliance_incidents`**, **`vehicle_compliance_documents`**, **`chauffeur_compliance_documents` (VST-12):** RLS **enabled**; **no** **`anon`** policies. **`authenticated`:** **only** **`is_staff(auth.uid())`** for **select / insert / update / delete** (named `*_staff_*` policies in **`20260412120000_vst12_compliance_incidents_documents_retention.sql`**). **Incident insert** requires **`reported_by = auth.uid()`**. Customers and chauffeurs have **no** access. **DSR export / anonymise** are further restricted to **`profiles.role = admin`** in Server Actions (**`getOpsAdminForAction()`**), not RLS alone.

Policy definitions are split across historical **`vin_shuttle_rls_*.sql`** (enable + early policies, some superseded), **`20260402133618_vestroo_drop_legacy_rls_policies.sql`**, **`20260402133646_vestroo_rls_policies_vestroo_domain.sql`**, **`20260402133655_vestroo_rls_policies_booking_social.sql`**, **`20260402133703_vestroo_rls_policies_tracking_drivers.sql`**, **`20260406103000_vestroo_profile_roles_chauffeur_columns_rls.sql`** (VST-5 role + column + policy refresh), **`20260408120000_vst8_chauffeur_booking_rls_ops_audit_actor_role.sql`** (VST-8 chauffeur booking visibility + audit **`actor_role`**), **`20260412120000_vst12_compliance_incidents_documents_retention.sql`** (VST-12), **`20260417120000_sh92_service_run_manifest_entries.sql`** (**SH.9.2** manifest RLS), and **`20260418140000_sh93_service_run_capacity_holds.sql`** (**SH.9.3** chauffeur **`tickets`** read).

## Operations console (VST-7)

### `public.ops_audit_log`

Append-only log: **staff** (**`is_staff`**) may **select** all rows and **insert** with **`actor_role`** **`dispatcher`** or **`admin`** (**`actor_id = auth.uid()`**). **Chauffeurs** may **insert** only with **`actor_role = chauffeur`**, **`actor_id = auth.uid()`**, and **`action`** in the field allow-list (**`chauffeur_confirm_assignment`**, **`chauffeur_update_trip_status`**, **`chauffeur_contact_intent`**). Chauffeurs do **not** receive **select** on this table (policies unchanged for read).

| Column | Notes |
|--------|--------|
| **`actor_id`** | **`profiles.id`** of the actor. |
| **`actor_role`** | **`dispatcher`** (default), **`admin`**, or **`chauffeur`** — migration **VST-8**. |
| **`action`** | Staff: e.g. `assign_booking_to_run`, `update_trip_status`, `record_trip_delay`, `swap_trip_vehicle`, `create_compliance_incident`, `create_vehicle_compliance_document`, `create_chauffeur_compliance_document`. **Admin:** `dsr_export`, `dsr_anonymise`. Chauffeur: `chauffeur_*` as above. |
| **`entity`** | Table or domain name, e.g. `trip`. |
| **`entity_id`** | Optional UUID of the primary row. |
| **`payload`** | JSON object with ids and operational fields only — **no** customer names, emails, or phone numbers. |
| **`created_at`** | Server default **`now()`**. |

**Retention:** treat as operational telemetry; align deletion/archival with org policy (e.g. **VST-12** compliance story). No automatic purge in migrations.

### `public.trips` (fulfilment extensions)

| Column / change | Notes |
|-----------------|--------|
| **`customer_id`** | **Nullable** after VST-7 migration — guest bookings may have **`trips.customer_id`** null while the **`bookings`** row holds guest PII; link is **`booking_trips`**. |
| **`service_run_id`** | Optional FK → **`service_runs`** — ties fulfilment to an operational run. |
| **`ops_delay_note`** | Dispatcher free-text delay context (prefer operational wording, not PII). |
| **`ops_revised_time_end_estimate`** | Expected trip end after delay. |

### Trip status labels (application)

Column **`trips.status`** remains **plain text** (legacy default **`booking`**). The ops console uses this lifecycle set (see **`TripFulfilmentStatusDb`** in **`src/types/database.types.ts`**):

| Value | Typical meaning |
|-------|-----------------|
| **`booking`** | Created or pre-dispatch placeholder. |
| **`assigned`** | Chauffeur + vehicle + schedule (+ run) committed by dispatch. |
| **`en_route`** | Live leg in progress (chauffeur updates in **VST-8**). |
| **`completed`** | Fulfilment finished. |
| **`cancelled`** | Leg cancelled. |

### Join rules for vehicle utilisation

- **Fleet:** **`vehicles`** left to **`vehicle_categories`** on **`vehicles.category_id`** for labels; optional **`vehicle_pricings`** via category for pricing-tier context.
- **In-use:** **`trips`** where **`vehicle_id`** matches and **`status`** ∉ {**`cancelled`**, **`completed`**}.
- **Roster overlap (optional):** **`chauffeur_assignments`** windows (**`start_time`**, **`end_time`**) can be compared to **`trips.time_*_estimate`** with the same interval-overlap rule as **`src/lib/ops-time-windows.ts`** (start A before end B and end A after start B).

## Realtime and notifications (VST-9)

### `public.vehicle_trackings`

- **Purpose:** Live or recent **vehicle location** tied to **`chauffeur_assignments.id`** and **`service_runs.id`** (`service_run_id`), plus optional **`estimated_arrival`** (server-computed stub when destination coordinates exist).
- **RLS:** **Staff** read all; **chauffeur** insert/update only where **`chauffeur_assignment_id`** belongs to **`auth.uid()`** (see **`20260406103000_*.sql`**).
- **Realtime:** Included in **`supabase_realtime`** publication (**`20260409120000_vst9_realtime_notifications.sql`**). Subscribers use the **user JWT** client; **RLS** filters events.

### `public.notifications`

- **Core columns:** **`recipient_id`**, **`title`**, **`body`**, **`is_read`**, timestamps.
- **VST-9 columns:** **`kind`** (`general` \| `assignment` \| `change` \| `no_show` \| `trip_status`), **`metadata`** (jsonb, operational ids/status labels — avoid PII), **`channel`** (default **`in_app`**).
- **RLS:** **`notifications_own`** — recipient or **staff** for all operations; **`notifications_chauffeur_customer_insert`** — chauffeur may insert rows whose **`recipient_id`** is a **`trips.customer_id`** for a trip they **`chauffeur_id`** own.
- **Realtime:** **`public.notifications`** is **not** added to **`supabase_realtime`** in **`20260409120000_vst9_realtime_notifications.sql`** (that file publishes **`vehicle_trackings`** and **`trips` only**). Shipped app code has **no** `postgres_changes` subscriber for this table (`src/lib/supabase/realtime.ts`).
- **Emission:** **`insertOperationalNotifications`** is called only from Server Actions **`opsDispatch`** and **`fieldChauffeur`** (assign / status / delay / swap / chauffeur trip updates → customer **`trip_status`**). **`publishChauffeurLocationAction`** updates **`vehicle_trackings`** only — it does **not** insert **`notifications`** rows. Outbound email/push remains separate; see **`docs/realtime-and-notifications.md`**.

## Field tools (VST-8)

### Chauffeur-visible data

- **`trips`:** rows with **`chauffeur_id = auth.uid()`** (existing **`trips_select`** policy).
- **`bookings`:** via **`bookings_select_chauffeur_linked`** — only bookings linked through **`booking_trips`** to a trip the chauffeur owns (supports **guest** bookings with **`customer_id` null**).
- **`booking_trips`:** **`booking_trips_select_chauffeur`** for those link rows.
- **UI minimisation:** field app shows **masked** phone and **`payment_reference`** for context; **no** email in UI; avoid **`select *`** on **`bookings`** in new code.

### Chauffeur vs dispatcher transitions

| Transition | Chauffeur (`fieldChauffeur` actions) | Dispatcher / admin (`opsDispatch`) |
|------------|--------------------------------------|-----------------------------------|
| **`assigned` → `en_route`** | Yes (**confirm**) | Yes (full status action) |
| **`en_route` → `completed`** | Yes | Yes |
| **`booking` → `assigned`**, **`cancelled`**, delays, vehicle swap | No | Yes |

### Logging

Chauffeur mutations append **`ops_audit_log`** with **`actor_role = chauffeur`** and minimal **`payload`** (status from/to, **`trip_status`** for contact intent). **Retention** and compliance UI: delivered under **`/ops/compliance`** (**[compliance-and-safety.md](compliance-and-safety.md)**).

## Compliance and safety (VST-12)

### `public.compliance_incidents`

| Column | Notes |
|--------|--------|
| **`category`** | `safety` \| `privacy` \| `security` \| `operational` \| `data_handling` \| `other` (CHECK). |
| **`summary`** | Free-text staff summary. |
| **`occurred_at`** | When the event happened (timestamptz). |
| **`reported_by`** | FK → **`profiles.id`** (insert policy: must equal **`auth.uid()`**). |
| **`related_booking_id`** | Optional FK → **`bookings`**. |
| **`metadata`** | jsonb; **must not** hold raw PII (see **[compliance-and-safety.md](compliance-and-safety.md)**). |
| **`retention_class`**, **`retention_until`** | Optional policy hooks. |

### `public.vehicle_compliance_documents` / `public.chauffeur_compliance_documents`

| Column | Notes |
|--------|--------|
| **`document_type`** | CHECK per table (licence/insurance/PDP/etc.). |
| **`expiry_date`** | Optional **date**. |
| **`storage_bucket`**, **`storage_object_path`** | Supabase Storage reference; signed URLs server-only. |
| **`notes`** | Staff-only operational notes. |
| **`vehicle_id`** / **`chauffeur_id`** | FK to **`vehicles`** or **`profiles`** (chauffeur person). |

### Retention columns on **`profiles`** and **`bookings`**

**`retention_class`**, **`retention_until`** — optional labels for documentation-first retention; automated purge **not** required in MVP. **`profiles.data_subject_anonymised_at`** — set by admin DSR anonymise action.

## Smoke / verification

- Structural checks and policy inventory: **`supabase/smoke_rls.sql`** — run after migrations are applied to the **hosted** (or target) database (for example via **`supabase db push`** on a linked dev project).
- Manual JWT role checks: **`docs/local-development.md`** (RLS smoke section).

## Related documentation

- [Epic 4 — domain vocabulary](epic-4.md)
- [Operations console — routes and client strategy](ops-console.md)
- [Field tools — chauffeur web](field-tools.md)
- [Realtime and notifications](realtime-and-notifications.md)
- [Compliance and safety (VST-12)](compliance-and-safety.md)
- [Local development — migrations & RLS smoke](local-development.md)
- [Staging and promotion — RLS review expectations](staging-and-promotion.md)
- [Story VST-5](stories/vst-5.story.md)
