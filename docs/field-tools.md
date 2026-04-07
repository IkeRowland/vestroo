# Field tools (chauffeur web)

Responsive **chauffeur** surface for **VST-8**: assignments, confirm → en route, complete, maps deep links, and minimal customer contact. **Production** UI lives under **`src/app/(field)/`** at **`/field/*`**. Reference-only code under **`src/features/capstone-reference/frontend-driver`** is **not** shipped.

## Routes and auth

| Path | Purpose |
|------|---------|
| **`/field/login`** | Supabase password sign-in; **`next`** query must start with **`/field`** to be honoured. |
| **`/field/unauthorized`** | Authenticated user whose **`profiles.role`** is not **`chauffeur`**. |
| **`/field`** | Assignment list (**`trips.chauffeur_id = auth.uid()`**). |
| **`/field/trips/[tripId]`** | Trip detail, actions, maps, contact (policy-gated). |

**Server gate:** **`requireChauffeurPage()`** in **`src/lib/field-auth.ts`** (layouts/pages). **Server Actions:** **`getChauffeurForAction()`** returns **403-style** errors for non-chauffeurs.

**Marketing (`(marketing)`), booking (`(app)`), and ops (`(ops)`)** do not expose chauffeur mutations; only **`/field/*`** and **`src/actions/fieldChauffeur.ts`** implement chauffeur trip updates, behind the same role checks.

**Middleware:** **`middleware.ts`** sets **`x-pathname`** for **`/field`** (and **`/ops`**) so nested layouts can treat login/unauthorized as public.

## Supabase client

Field **reads and writes** use **`createUserServerClient()`** from **`src/lib/supabase/server.ts`** so **RLS** applies. No service-role shortcut for chauffeur flows in this slice.

## Trip status transitions (chauffeur)

Aligned with **`TripFulfilmentStatusDb`** (`src/types/database.types.ts`) and **`src/actions/opsDispatch.ts`** semantics for staff.

| From | To | Who |
|------|-----|-----|
| **`assigned`** | **`en_route`** | Chauffeur (**confirm assignment**) |
| **`en_route`** | **`completed`** | Chauffeur |
| **`booking`** → **`assigned`**, **`cancelled`**, arbitrary staff moves | — | **Dispatcher / admin** only (**`opsDispatch`**) |

Invalid chauffeur transitions are rejected in **`src/actions/fieldChauffeur.ts`** using **`src/lib/chauffeur-trip-transitions.ts`**. **`status_history`** entries use **`source: 'field_app'`**.

## Navigation (maps) resolution order

Pure URL builders live in **`src/lib/maps.ts`** (**no API keys**). The **destination** for links is resolved server-side in **`src/lib/field-navigation-target.ts`**:

1. **Booking** linked via **`booking_trips`**: **`destination_latitude`** + **`destination_longitude`** if both finite; else **`destination_address`** as a search query.
2. Else **booking** **origin** coordinates, then **origin** address.
3. Else **`trips.service_run_id`** → **`service_runs.service_route_id`** → **`service_route_points`** ordered by **`order_index` ASC** → first **`service_points`** row (**`lat`/`lng`**, else **`address`**).

If none apply, the UI shows a short notice; seed **service route points** on staging if you need the third path.

## Customer contact (POPIA-oriented)

- **When:** **`assigned`** or **`en_route`** only (`tripStatusAllowsCustomerContact` in **`src/lib/field-customer-contact.ts`**).
- **Display:** Masked phone (e.g. **`***8214`**).
- **Action:** **`tel:`** opens the dialer with the **full** stored number (required for calling); **`Call customer`** first appends **`ops_audit_log`** with **`chauffeur_contact_intent`** (minimal payload: **`trip_status`** only).
- **Not shown:** email, full name, or bulk customer lists.

## Live location (VST-9)

- **`FieldLocationPublisher`** on **`/field/trips/[tripId]`** runs while status is **`assigned`** or **`en_route`**: **geolocation** watch + **8 s** interval calls to **`publishChauffeurLocationAction`** (`src/actions/fieldLocation.ts`).
- **Server:** resolves **`chauffeur_assignment_id`** from **`trips.service_run_id`** + **`chauffeur_assignments`** match; enforces **max 12** tracking writes per **minute** per assignment (minimum **5 s** between successful updates).
- **Requires:** trip linked to a **dispatch run** so an assignment row exists; otherwise the action returns a clear error (no silent drop).
- **Privacy / consent:** engineering notes in **[realtime-and-notifications.md](realtime-and-notifications.md)**; user-facing consent copy remains a **stub** pending PO.

## Audit log

**`public.ops_audit_log`** includes **`actor_role`**: **`dispatcher`** (default), **`admin`**, or **`chauffeur`**. Staff inserts omit **`actor_role`** and rely on the DB default **`dispatcher`**. Chauffeur actions set **`actor_role = chauffeur`** and **`action`** in:

- **`chauffeur_confirm_assignment`**
- **`chauffeur_update_trip_status`**
- **`chauffeur_contact_intent`**

Helpers: **`appendOpsAuditLog`** in **`src/lib/ops-audit.ts`**.

## Close protection (VST-11)

Chauffeurs **do not** read **`close_protection_engagements`** or **`coordination_notes`**. Field Server Actions (**`fieldChauffeur.ts`**, **`fieldLocation.ts`**) **do not** query that table; RLS denies **`authenticated`** non-staff **SELECT**. Trip execution uses **`trips`**, **`bookings`** (linked), and maps helpers only — see **[close-protection-engagements.md](close-protection-engagements.md)**.

## Related

- [Data models — VST-8 section](data-models.md#field-tools-vst-8)
- [Operations console](ops-console.md)
- [Story VST-8](stories/vst-8.story.md)
- [Realtime and notifications (VST-9)](realtime-and-notifications.md)
