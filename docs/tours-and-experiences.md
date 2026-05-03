# Tours and experiences (VST-10)

This document records the **content strategy** for tour / **experience packages**, how they connect to **bookings** and **quotes**, and the operational workflow. Cross-reference: **[data-models.md](data-models.md)** (`experience_packages`, `bookings.booking_metadata`), **[front-end-api-interaction.md](front-end-api-interaction.md)** (Server Actions).

## Content source decision

**Chosen approach:** **`public.experience_packages`** in PostgreSQL (Supabase), with:

- **Structured itinerary** in **`itinerary` (jsonb)** — ordered steps (`order`, `title`, optional `duration_minutes`, `location_label`, `highlight`).
- **Add-ons** in **`addon_catalog` (jsonb)** — `[{ id, label, price_zar }]`. Selected ids are stored on the booking in **`booking_metadata.selected_addon_ids`** (no junction table for this slice).
- **Stub map locations** in **`stub_origin` / `stub_destination` (jsonb)** — same shape as wizard `QuoteLocation`; used for **`bookings`** origin/destination columns and PayFast line copy, while **pricing** does **not** use Distance Matrix.

**Rationale:** Queryable catalogue, **RLS** for public read of active rows, staff CRUD via **`is_staff`**, and **service role** server actions for booking writes. Alternative **git markdown + frontmatter** under `src/content/` was considered; it trades **non-dev edits** and preview UX for zero DB migration — rejected for VST-10 to align with **[epic-4.md](epic-4.md)** delivery of at least one **end-to-end bookable** package with **server-side** validation against a **canonical** catalogue.

**Headless CMS:** Out of scope unless product explicitly adopts one; table-backed catalogue keeps editorial workflow in SQL/ops for now.

## Update workflow

1. **Create/change packages** — SQL migration or Supabase SQL editor (staff JWT with **`is_staff`**, or service role in controlled environments).
2. **Activate/deactivate** — `is_active`; public and **anon** clients only **SELECT** rows with `is_active = true` (see migration **`20260410120000_vst10_experience_packages.sql`**).
3. **Marketing** — `src/app/(marketing)/tours/` lists and details; routes use **`dynamic = 'force-dynamic'`** so **Next.js build** does not call Supabase (CI-friendly). Pages load on request against the linked project.
4. **Booking** — Customer selects date, group size, add-ons on **`/tours/[slug]`** → **`calculateExperienceQuote`** → existing wizard (**`/book/quote` → details → payment**). **`createBooking` / `processPayment`** reconcile totals and persist **`booking_intent = experience_package`** plus **`booking_metadata`**.

## Link to bookings and quotes

| Stage | Mechanism |
|--------|-----------|
| Discovery | **`listActiveExperiencePackages`**, **`fetchExperiencePackageBySlug`** (`src/lib/experience-package-data.ts`) |
| Quote | **`calculateExperienceQuote`** (`src/actions/calculateExperienceQuote.ts`) — line items + total + single vehicle tier |
| Reconcile | **`reconcileBookingQuote`** — `experience_package` branch uses DB package row + metadata; compares to client **`quoteAmount`** within tolerance |
| Persist | **`bookings.booking_metadata`**: `experience_package_id`, `experience_date` (ISO), `group_size`, `selected_addon_ids` |

**Ops visibility:** **`/ops/experiences`** — read-only table of recent **`experience_package`** bookings (package id from metadata).

## Date and timezone semantics

- **`experience_date`** is stored as a string and validated with **`new Date(...)`**. **`webBookingPayloadSchema`** requires the **UTC calendar day** of **`experience_date`** to match **`date`** (wizard pickup/trip date): both sides use **`toISOString().slice(0, 10)`** for comparison.
- **Implication:** the “day” is the **UTC** date of the underlying `Date` objects. If the UI later collects a **local calendar date** without time (e.g. date picker in Johannesburg), ensure the stored `Date` / ISO string reflects the intended **business calendar day** in UTC (e.g. normalise to **UTC noon** for that local date before persisting) to avoid off-by-one near midnight. **Product/legal** should confirm whether **customer-local** or **operator-timezone** dates are authoritative (**VST-12** for formal policy).
- **Regenerate types:** To replace hand-maintained table shapes with generated **`Database`**, use the Supabase CLI (see **[local-development.md](local-development.md#regenerate-typescript-types-optional)**).

## Epic alignment

**[epic-4.md](epic-4.md) VST-10** — publishing packages, itineraries, and booking attachments from an agreed source: **delivered** via **`experience_packages`** + **`booking_metadata`** as above.
