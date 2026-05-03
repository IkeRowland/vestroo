# Capstone driver → Vestroo field mapping & modality strategy

**Purpose:** Document how the vendored **Expo / React Native** reference app (`frontend-driver`) maps to Vestroo **Next.js mobile-web** **`/field/*`**, where **socket.io** concerns land relative to **Supabase Realtime** (**VST-9**), and what **interim** patterns replace native **chat** / **push**—without weakening **`requireChauffeurPage`** / **`getChauffeurForAction()`** (**NFR.5.3**) or importing reference **JWT/axios** transport as defaults.

**Scope:** Reference tree **`docs/capstone-reference/frontend-driver`** vs Vestroo **`src/app/(field)/`**, **`src/actions/fieldChauffeur.ts`**, **`src/actions/fieldLocation.ts`**, **`src/lib/field-auth.ts`**, **`src/lib/supabase/realtime.ts`**. **Out of scope:** building a **new Expo app** (phase 2 assessment only); **FE.5.7** tablet-wide polish (cross-reference below); **FE.5.8** full a11y baseline (note alignment only).

**Related:** [Field tools](field-tools.md) (**VST-8**) — transitions, maps deep links, **`chauffeur_contact_intent`**, RLS. [Realtime and notifications](realtime-and-notifications.md) (**VST-9**) — Realtime channels, **`operational_notifications`**, native push stance. [Capstone backend module matrix](capstone-backend-module-matrix.md) — **§ RT.7.3** (**Conversation** / **SharedItinerary** vs shipped **`realtime.ts`**). [Epic 5](epic-5.md) **FE.5.7** / **FE.5.8** — follow-on responsive and accessibility work for **`/ops/*`** and **`/field/*`**.

**Sources (under `docs/capstone-reference/frontend-driver`):**

- Tabs / stack: [`src/navigation/AppNavigator.tsx`](capstone-reference/frontend-driver/src/navigation/AppNavigator.tsx)
- Context: [`src/context/ScheduleContext.tsx`](capstone-reference/frontend-driver/src/context/ScheduleContext.tsx), [`src/context/NotificationContext.tsx`](capstone-reference/frontend-driver/src/context/NotificationContext.tsx), [`src/context/LocationContext.tsx`](capstone-reference/frontend-driver/src/context/LocationContext.tsx)
- Screens: [`src/screens/HomeScreen.tsx`](capstone-reference/frontend-driver/src/screens/HomeScreen.tsx), [`src/screens/ScheduleScreen.tsx`](capstone-reference/frontend-driver/src/screens/ScheduleScreen.tsx), [`src/screens/NotificationScreen.tsx`](capstone-reference/frontend-driver/src/screens/NotificationScreen.tsx), [`src/screens/ConversationScreen.tsx`](capstone-reference/frontend-driver/src/screens/ConversationScreen.tsx), [`src/screens/ConversationDetailScreen.tsx`](capstone-reference/frontend-driver/src/screens/ConversationDetailScreen.tsx), [`src/screens/TripTrackingScreen.tsx`](capstone-reference/frontend-driver/src/screens/TripTrackingScreen.tsx), [`src/screens/TripHistoryScreen.tsx`](capstone-reference/frontend-driver/src/screens/TripHistoryScreen.tsx), [`src/screens/ProfileScreen.tsx`](capstone-reference/frontend-driver/src/screens/ProfileScreen.tsx)
- Sockets: [`src/hook/useTripSocket.ts`](capstone-reference/frontend-driver/src/hook/useTripSocket.ts), [`src/hook/useTrackingSocket.ts`](capstone-reference/frontend-driver/src/hook/useTrackingSocket.ts), [`src/hook/useConversationSocket.ts`](capstone-reference/frontend-driver/src/hook/useConversationSocket.ts), [`src/hook/useNotificationSocket.ts`](capstone-reference/frontend-driver/src/hook/useNotificationSocket.ts), [`src/hook/useSharedItinerarySocket.ts`](capstone-reference/frontend-driver/src/hook/useSharedItinerarySocket.ts), [`src/services/socket.ts`](capstone-reference/frontend-driver/src/services/socket.ts), [`src/constants/socket.enum.ts`](capstone-reference/frontend-driver/src/constants/socket.enum.ts)
- Pause UI: [`src/components/DriverSchedule/ConfirmPause.tsx`](capstone-reference/frontend-driver/src/components/DriverSchedule/ConfirmPause.tsx)

**Last updated:** 2026-04-07

---

## Modality strategy

| Dimension | Reference (`frontend-driver`) | Vestroo field MVP |
| --------- | ----------------------------- | ------------------ |
| Runtime | **Expo** / **React Native**, **NativeWind** | **Next.js** App Router, **mobile-web** |
| Maps | **react-native-maps**, in-app directions | **External** maps deep links — [`buildGoogleMapsUrl` / `buildAppleMapsUrl`](../src/lib/maps.ts), [`resolveFieldMapsTarget`](../src/lib/field-navigation-target.ts) (see [field-tools](field-tools.md)) |
| Location | **expo-location** | Browser **Geolocation** → **`publishChauffeurLocationAction`** ([`fieldLocation.ts`](../src/actions/fieldLocation.ts)); throttled server writes |
| Push | **expo-notifications** | **Not** web MVP — see [realtime-and-notifications](realtime-and-notifications.md); **`operational_notifications`** for downstream comms |
| Live updates | **socket.io-client** (multiple namespaces/hooks) | **Supabase Realtime** where subscribed (see **VST-9**); ops **`subscribeTripsBoard`** / vehicle tracking helpers in [`realtime.ts`](../src/lib/supabase/realtime.ts) — **no** chauffeur trip-list socket parity in web MVP |
| Auth | Reference **AuthContext** / token patterns | **`requireChauffeurPage`**, **`getChauffeurForAction`**, Supabase session — **no** reference token storage |

## Integration posture

The reference driver stack (**socket.io**, **axios** to Nest, **token-oriented** auth) is **not** a copy-paste target for Vestroo **`/field/*`** (**NFR.5.3**). Use **Supabase Realtime** per **[VST-9](realtime-and-notifications.md)**, **Server Actions**, and **`requireChauffeurPage`** instead. **Canonical** integration contrasts (all three vendored frontends), **anti-patterns**, and **UI dependency intent** are in **[Capstone reference — stack & integration](capstone-reference-stack-integration.md)** (**FE.5.9**). **Nest module-by-module** mapping remains **[Epic 6](epic-6.md)** (**BE.6.1** / **FE.5.10**).

---

## Status definitions (mapping table)

[^implemented]: **implemented** — Web MVP covers the concern with a **`/field/*`** route and/or Server Action + data path.

[^partial]: **partial** — Substitute exists (e.g. list+detail vs many native tabs; background location vs foreground publish only).

[^notstarted]: **not started** — No dedicated field route or Realtime channel for that reference concern.

[^notapplicable]: **not applicable** — Not targeted for corporate shuttle chauffeur web MVP (e.g. in-app chat).

---

## Primary mapping: screens & realtime domains

| Reference concern | Capstone implementation pointer | Vestroo target | Status | Vestroo-preferred naming (NFR.5.4) | Supabase / platform | Realtime / socket gap (VST-9) | Story / epic traceability |
| ----------------- | -------------------------------- | -------------- | ------ | ------------------------------------ | --------------------- | ----------------------------- | ------------------------- |
| **Home** (trips list, **ScheduleContext**, **useTripSocket**) | [`HomeScreen.tsx`](capstone-reference/frontend-driver/src/screens/HomeScreen.tsx) (`useSchedule`, `useTripSocket`) | **`/field`** — assigned trips for chauffeur; transitions on **`/field/trips/[tripId]`** via **`fieldChauffeur.ts`** | partial [^partial] | **Assignments** / **trips** — not undifferentiated “home feed” | `trips` filtered by **`chauffeur_id`** | Reference **trip socket** → **no** subscribed trip list for chauffeurs in web; ops board uses **`subscribeTripsBoard`** — **gap** for live list refresh on field home | **VST-8**, **VST-9**; **5.6** |
| **Schedule** (shift, pause confirm) | [`ScheduleScreen.tsx`](capstone-reference/frontend-driver/src/screens/ScheduleScreen.tsx), [`ScheduleContext.tsx`](capstone-reference/frontend-driver/src/context/ScheduleContext.tsx), [`ConfirmPause.tsx`](capstone-reference/frontend-driver/src/components/DriverSchedule/ConfirmPause.tsx) | **Not** a separate route; **`chauffeur_schedules`** surfaced on **`/ops/roster`** for staff; field app focuses on **trip execution** | not started [^notstarted] | **Chauffeur schedule** / **shift** vs **trip assignment** | `chauffeur_schedules` (ops roster) | Reference schedule sockets N/A on web MVP | **VST-7**, **VST-8**; **FE.5.11** |
| **Notifications** (badge, **NotificationContext**, **useNotificationSocket**) | [`NotificationScreen.tsx`](capstone-reference/frontend-driver/src/screens/NotificationScreen.tsx), [`NotificationContext.tsx`](capstone-reference/frontend-driver/src/context/NotificationContext.tsx), [`useNotificationSocket.ts`](capstone-reference/frontend-driver/src/hook/useNotificationSocket.ts) | **No** **`/field/notifications`**; trip status changes feed **`operational_notifications`** (see **VST-9**) | partial [^partial] | **Operational notifications** — not in-app notification center | `operational_notifications` (+ inserts from **`fieldChauffeur`**) | Reference **notification namespace** socket → **no** field UI inbox; email/SMS dispatch per **VST-9** / integrations epic | **VST-9**; **5.6** |
| **Conversations** + detail | [`ConversationScreen.tsx`](capstone-reference/frontend-driver/src/screens/ConversationScreen.tsx), [`ConversationDetailScreen.tsx`](capstone-reference/frontend-driver/src/screens/ConversationDetailScreen.tsx), [`useConversationSocket.ts`](capstone-reference/frontend-driver/src/hook/useConversationSocket.ts) | **Out of web MVP** — use approved **voice** channel per [field-tools](field-tools.md) | not applicable [^notapplicable] | **Customer contact** via **`tel:`** after audit when **`assigned` / `en_route`** | `chauffeur_contact_intent` audit | **socket.io** chat → **no** Vestroo equivalent on **`/field/*`** | **VST-8**; **5.6** |
| **Trip tracking** | [`TripTrackingScreen.tsx`](capstone-reference/frontend-driver/src/screens/TripTrackingScreen.tsx), [`useTripSocket.ts`](capstone-reference/frontend-driver/src/hook/useTripSocket.ts), [`useTrackingSocket.ts`](capstone-reference/frontend-driver/src/hook/useTrackingSocket.ts), [`LocationContext.tsx`](capstone-reference/frontend-driver/src/context/LocationContext.tsx) | **`/field/trips/[tripId]`** + **`FieldLocationPublisher`** → **`fieldLocation.ts`** → **`vehicle_trackings`** | partial [^partial] | **Live location** / **ETA** context — corporate shuttle | `vehicle_trackings`, **`publishChauffeurLocationAction`** | Reference **tracking** sockets → **Realtime** on **`vehicle_trackings`** possible for subscribers; field web does not mirror all native tracking UI — see [realtime-and-notifications](realtime-and-notifications.md) | **VST-8**, **VST-9** |
| **Trip history** | [`TripHistoryScreen.tsx`](capstone-reference/frontend-driver/src/screens/TripHistoryScreen.tsx); [`AppNavigator.tsx`](capstone-reference/frontend-driver/src/navigation/AppNavigator.tsx) ( **`Lịch sử`** tab **commented out** ) | **`/field`** **Past** section (completed/cancelled) + same detail route | partial [^partial] | **Past assignments** | `trips` | No history-specific socket — list is RSC fetch | **VST-8** |
| **Profile** | [`ProfileScreen.tsx`](capstone-reference/frontend-driver/src/screens/ProfileScreen.tsx) | **No** **`/field/profile`**; auth session only | partial [^partial] | **Chauffeur account** (Supabase user + **`profiles`**) | `profiles` | N/A | **VST-8** |
| **Shared itinerary** | [`useSharedItinerarySocket.ts`](capstone-reference/frontend-driver/src/hook/useSharedItinerarySocket.ts); consumed in [`TripTrackingScreen.tsx`](capstone-reference/frontend-driver/src/screens/TripTrackingScreen.tsx) (and map components) | **Not** exposed as shared-itinerary socket; navigation via **maps target** from booking / service run | not started [^notstarted] | **Itinerary** / **waypoints** in shuttle terms | Booking + service-run route data | Reference **shared itinerary** events → **no** web socket parity | **VST-9**; **Epic 7** |
| **Auth surfaces** | [`LoginScreen.tsx`](capstone-reference/frontend-driver/src/screens/LoginScreen.tsx) (stack in **AppNavigator**) | **`/field/login`**, **`/field/unauthorized`** | implemented [^implemented] | Supabase **chauffeur** sign-in | Supabase Auth + **`profiles.role`** | N/A | **VST-8** |

**Server Actions (chauffeur):** [`fieldChauffeur.ts`](../src/actions/fieldChauffeur.ts) — **`confirmChauffeurAssignmentAction`** (`assigned` → `en_route`), **`updateChauffeurTripStatusAction`** (`en_route` → `completed`), **`logChauffeurContactIntentAction`**, transitions guarded by **`assertChauffeurTripTransition`**. **No** chauffeur “decline assignment” path in product today — align copy with [field-tools](field-tools.md); do not imply **accept/decline** without **`fieldChauffeur`** support.

---

## Assessment: web MVP vs phase 2 native (Expo)

| | **Web MVP (current)** | **Phase 2 native (hypothetical)** |
| --- | --- | --- |
| **Pros** | Single deploy with **`/ops`** / booking; **`requireChauffeurPage`** server gates; no app store gate | Background location, richer maps, **expo-notifications**, optional **socket.io** parity |
| **Cons** | Geolocation **foreground** / browser prompts; **no** true push inbox on field; **no** in-app chat | Higher build/release cost; must **still** use Supabase session model — **not** reference JWT |

**No commitment** to native in this story; if pursued, re-validate **RLS**, **Realtime** policies, and **NFR.5.3** for any client-held secrets.

---

## Chat, push, and interim comms (web MVP)

| Capability | Web MVP stance | Interim pattern |
| ---------- | ---------------- | --------------- |
| **In-app chat** (reference **Conversations** + sockets) | **Out of scope** | **`tel:`** after **`logChauffeurContactIntentAction`** when status allows — [field-tools](field-tools.md) |
| **Native push** | **Out of scope** (per **VST-9** unless product changes) | **`operational_notifications`** + existing email/SMS architecture |
| **SMS** to customer | **Not defined** in [field-tools](field-tools.md) | **Gap** — future policy if product requires; do not assume SMS from this mapping |

Maps: **`buildGoogleMapsUrl`**, **`buildAppleMapsUrl`**, **`resolveFieldMapsTarget`** — same runbook.

---

## Verification (2026-04-07)

Cross-checked **`src/app/(field)/field/`** — **`page.tsx`**, **`trips/[tripId]/page.tsx`**, **`login/page.tsx`**, **`unauthorized/page.tsx`**; **`src/lib/field-auth.ts`**; **`src/actions/fieldChauffeur.ts`**, **`fieldLocation.ts`**; **`src/lib/supabase/realtime.ts`** (`subscribeVehicleTrackings`, `subscribeTripsBoard`). **Layout:** **`src/app/(field)/field/layout.tsx`** uses **`requireChauffeurPage`** for protected routes (public: login/unauthorized).

**Post-FE.5.6 UX pass:** Trip detail uses **`FieldTripDetailActions`** with **`stickyFooter`** (fixed bottom bar + **`env(safe-area-inset-bottom)`**); list and layout use **`min-h-11`** / safe-area on shell — **NFR.5.3** unchanged (no client-only gates).

---

## Deviation notes

| Topic | Note |
| ----- | ---- |
| **Reference `Menu.tsx` roles** | Story epic text mentions **manager** nav patterns; driver app uses **driver** session — mapping table uses actual **frontend-driver** files. |
| **Trip history tab** | Reference **AppNavigator** comments out **TripHistoryScreen** tab; Vestroo still lists **Past** on **`/field`**. |
| **Accept/decline** | Epic wording allows “if applicable”; product transitions are **confirm assignment** and **mark completed** only. |

---

## Follow-on work

- **FE.5.7** — Tablet-width verification for **`/field/*`** (and **`/ops/*`**) without clipping primary actions.
- **FE.5.8** — WCAG-oriented baseline (landmarks, focus, contrast) for field shell beyond this story’s UX pass.
