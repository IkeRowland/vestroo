# Capstone reference — stack & integration (canonical appendix)

**FE.5.9 — living artifact.** Single place to contrast vendored **capstone** integration patterns with **Vestroo** ops/field defaults so teams can reuse **IA and UX ideas** without blind-porting **auth, HTTP clients, storage, or realtime wiring**.

## Purpose & scope

- **Purpose:** Document how **`capstone-reference/*`** frontends (Nest-oriented **REST + axios**, **JWT in browser storage**, **Firebase**, **socket.io**) differ from Vestroo’s **Next.js App Router**, **Supabase** (Postgres + RLS), **server-first gates**, **Server Actions / Route Handlers**, **Supabase Storage**, and **Supabase Realtime** — at the level of **integration posture**, not screen-by-screen features (those stay in the **FE.5.4–FE.5.6** mapping docs).
- **Scope:** **`capstone-reference/frontend-admin`**, **`frontend-manager`**, **`frontend-driver`** (and awareness of **`frontend-customer`** socket patterns where relevant). **Out of scope:** Nest **module-by-module** traceability — see **Epic 6 / FE.5.10 / BE.6.1** below.
- **NFR.5.3:** This appendix must **not** read as endorsement of reference patterns as **drop-in** implementations for **`/ops/*`** or **`/field/*`**. Treat capstone code as **historical reference only** unless a future ADR explicitly adopts an alternative.

## Sources under `capstone-reference/*`

- **Admin:** `frontend-admin` — app shell, Ant-based UI, axios API client, local token checks, Firebase uploads.
- **Manager:** `frontend-manager` — dashboard shell, `AuthContext`, axios services, REST constants, TanStack Query / Redux / Zustand / MUI usage sites.
- **Driver:** `frontend-driver` — Expo app, socket.io hooks and namespaces, native maps/notifications.
- **Backend (awareness only):** `backend` Nest modules and gateways — detailed row ownership lives in **[Epic 6](epic-6.md)**.

**Last updated:** 2026-04-07

## Vocabulary for Vestroo targets (NFR.5.4)

When this doc states **intended** product capabilities, use **Epic 4 / VST** language: **corporate shuttle**, **service routes**, **trips**, **bookings**, **fleet**, **chauffeurs**, **corporate clients** — **not** capstone **transit-demo** or legacy **public-bus** product naming as defaults for Vestroo.

---

## Epic 6 / FE.5.10 / BE.6.1 boundary (AC8)

**Module-by-module** mapping from reference **`app.module`** imports to **Supabase tables, RLS, Server Actions, and Route Handlers** is owned by **Epic 6**, story **FE.5.10**, requirement **BE.6.1**. **FE.5.9** does **not** duplicate that matrix.

**Authoritative traceability:** **[Capstone backend module matrix](capstone-backend-module-matrix.md)** (**FE.5.10** / **BE.6.1**) and **[Epic 6: Backend & data parity vs reference NestJS](epic-6.md)**.

---

## Auth & session — reference vs Vestroo

| Topic | Reference (capstone) | Vestroo (intended) |
| ----- | -------------------- | ------------------- |
| Staff/admin session | **`ClientLayout`** reads **`localStorage`** `accessToken` and redirects unauthenticated users ([`frontend-admin/src/app/ClientLayout.tsx`](capstone-reference/frontend-admin/src/app/ClientLayout.tsx)) | **`requireOpsStaffPage`** on **`(ops)`** routes; Supabase session via SSR-aware clients — see [`src/lib/ops-auth.ts`](../src/lib/ops-auth.ts), [`src/app/(ops)/ops/layout.tsx`](../src/app/(ops)/ops/layout.tsx), [`docs/ops-console.md`](ops-console.md) |
| Manager-style session | **`AuthContext`** and token-oriented client auth ([`frontend-manager/src/contexts/AuthContext.tsx`](capstone-reference/frontend-manager/src/contexts/AuthContext.tsx)) | Same server-first ops model; no parallel JWT-in-browser staff session for first-party **`/ops/*`** |
| Chauffeur / field | Driver **`AuthContext`** ([`frontend-driver/src/context/AuthContext.tsx`](capstone-reference/frontend-driver/src/context/AuthContext.tsx)) | **`requireChauffeurPage`**, **`getChauffeurForAction()`** — [`src/lib/field-auth.ts`](../src/lib/field-auth.ts), [`src/app/(field)/field/layout.tsx`](../src/app/(field)/field/layout.tsx), [`docs/field-tools.md`](field-tools.md) |
| Password / recovery | Reference login/forgot-password pages call Nest/axios | Supabase Auth flows; **`/ops/login`**, **`/field/login`** — no **`localStorage`** token model for staff/field |

---

## HTTP / API client patterns — reference vs Vestroo

| Topic | Reference (capstone) | Vestroo (intended) |
| ----- | -------------------- | ------------------- |
| Default transport | **axios** instances and services to **Nest** base URL (e.g. [`frontend-admin/src/app/services/apiClient.ts`](capstone-reference/frontend-admin/src/app/services/apiClient.ts), [`frontend-manager/src/services/api/axios.ts`](capstone-reference/frontend-manager/src/services/api/axios.ts), [`frontend-driver/src/services/userServices.ts`](capstone-reference/frontend-driver/src/services/userServices.ts)) | **Supabase client** (RLS-scoped), **Server Actions** for trusted App Router mutations, **Route Handlers** for webhooks and non-Next clients — see **[Frontend API interaction](front-end-api-interaction.md)** |
| OpenAPI / generated clients | Reference may imply singleton API clients | **Anti-pattern for first-party ops/field:** embedding Nest **base URLs**, reference **OpenAPI client singletons**, or copy-pasted **REST path constants** without an explicit integration design and security review |
| Booking/list shapes | Manager **`constants/api.ts`**, **`routers.ts`** | Vestroo **`/ops/search`**, **`/ops/fulfil`**, **`/ops/trips`** — not obligated to mirror **`GET /bookings`** parity |

---

## File storage — reference vs Vestroo

| Topic | Reference (capstone) | Vestroo (intended) |
| ----- | -------------------- | ------------------- |
| Vehicle / media uploads | Firebase Storage helpers (e.g. [`frontend-admin/src/app/utils/firebase/firebase.ts`](capstone-reference/frontend-admin/src/app/utils/firebase/firebase.ts)) | **Supabase Storage** with bucket policies and server-side validation when implemented; no Firebase SDK as default for ops fleet media |
| Client init | Firebase config in reference admin utils | Vestroo env validation per **[Environment variables](environment-vars.md)** — **do not** copy capstone **`NEXT_PUBLIC_*/`** names for third-party backends |

---

## Realtime / messaging — reference vs Vestroo

| Topic | Reference (capstone) | Vestroo (intended) |
| ----- | -------------------- | ------------------- |
| Live trips / tracking / chat | **socket.io-client** with namespaces and hooks (e.g. [`frontend-driver/src/hook/useTripSocket.ts`](capstone-reference/frontend-driver/src/hook/useTripSocket.ts), [`frontend-driver/src/services/socket.ts`](capstone-reference/frontend-driver/src/services/socket.ts), [`frontend-driver/src/constants/socket.enum.ts`](capstone-reference/frontend-driver/src/constants/socket.enum.ts); customer app also uses sockets under **`frontend-customer`**) | **Supabase Realtime** (`postgres_changes` on **`vehicle_trackings`**, **`trips`**, etc.) with **RLS** determining row visibility; client uses **anon key + user JWT** only |
| Connection semantics | Socket URL + namespace per concern | Channel builders and bridges (e.g. [`src/lib/supabase/realtime.ts`](../src/lib/supabase/realtime.ts)) — **not** socket.io URLs/namespaces as drop-ins |

**Authoritative detail (VST-9):** **[Realtime and notifications](realtime-and-notifications.md)** — channels by role (staff vs chauffeur vs customer MVP boundaries), **`notifications`** table behaviour, rate limits, privacy tiers. **Summary only here:** staff may receive broader **`vehicle_trackings`** / **`trips`** events where RLS allows; chauffeur sees **own assignment** scoped data; **customer `vehicle_trackings` Realtime is not MVP** until explicit policies and consent work exist — see VST-9 tables.

---

## Representative capstone file pointers

Paths are relative to the repo root unless noted. They were verified in this checkout (2026-04-07).[^verify]

| Area | Representative paths |
| ---- | -------------------- |
| Admin — layout / token gate | [`capstone-reference/frontend-admin/src/app/ClientLayout.tsx`](capstone-reference/frontend-admin/src/app/ClientLayout.tsx) |
| Admin — axios client | [`capstone-reference/frontend-admin/src/app/services/apiClient.ts`](capstone-reference/frontend-admin/src/app/services/apiClient.ts) |
| Admin — Firebase | [`capstone-reference/frontend-admin/src/app/utils/firebase/firebase.ts`](capstone-reference/frontend-admin/src/app/utils/firebase/firebase.ts) |
| Manager — auth context | [`capstone-reference/frontend-manager/src/contexts/AuthContext.tsx`](capstone-reference/frontend-manager/src/contexts/AuthContext.tsx) |
| Manager — axios | [`capstone-reference/frontend-manager/src/services/api/axios.ts`](capstone-reference/frontend-manager/src/services/api/axios.ts) |
| Driver — sockets | [`capstone-reference/frontend-driver/src/services/socket.ts`](capstone-reference/frontend-driver/src/services/socket.ts), [`capstone-reference/frontend-driver/src/hook/useTripSocket.ts`](capstone-reference/frontend-driver/src/hook/useTripSocket.ts), [`capstone-reference/frontend-driver/src/constants/socket.enum.ts`](capstone-reference/frontend-driver/src/constants/socket.enum.ts) |

[^verify]: If your tree differs (sparse checkout, submodule, or upstream rename), **verify paths on checkout** before citing in PRs.

---

## UI dependency inventory — capstone vs Vestroo direction (AC3)

Consolidated view of **notable** capstone UI/runtime dependencies vs Vestroo’s **FE.5.2** posture, **[`docs/ops-design-system-parity.md`](ops-design-system-parity.md)**, and **[ADR 0001: Ops / field UI stack](adr/0001-ops-field-ui-stack-tailwind-radix.md)**. Intent column: **import wholesale** / **not default** / **defer** / **defer to product**.

| Dependency / area | Capstone usage (where) | Vestroo direction | Intent |
| ----------------- | ------------------------ | ----------------- | ------ |
| **Ant Design** | `frontend-admin`, `frontend-manager` dense UI | **Forbidden** for **`/ops/*`** and authenticated **`/field/*`** per ADR 0001 | **not default** |
| **Tailwind + Radix (+ shadcn-style)** | N/A in capstone | Primary internal stack | **not default** (in Vestroo — **default** for ops/field) |
| **MUI** (incl. date pickers) | Manager date components | **Radix + shared `src/components/ui/*`**; **native `<input type="date">`** or agreed lightweight picker — no MUI kit for ops/field | **not default** |
| **TanStack Query** | Manager data hooks | Server Components + **TanStack Query only where a story explicitly adds it** for client islands — not required for FE.5.2 baseline | **defer** |
| **Redux** | Manager global state | **Zustand** (already in stack) or server state — do not import Redux for ops/field parity | **not default** |
| **Zustand** | Manager (alongside Redux) | Allowed where minimal client global state is needed; not a mandate to mirror capstone stores | **defer to product** |
| **Leaflet** (+ routing/editable) | Admin **`/router`**, some manager flows | **Defer** embedded maps in ops until product + bundle review; prefer **maps deep links** on field per **[field-tools](field-tools.md)**; **`react-leaflet`** only if an existing/adopted story requires it | **defer** |
| **react-native-maps** | Driver app | Field web: **external maps URLs**, not in-app RN maps | **not default** |
| **Sonner** | Manager toasts | **Defer** — parity spec prefers **`Alert` + inline** until an explicit story adds toasts | **defer** |
| **Recharts / DevExtreme** | Manager/admin dashboards | **Defer**; lazy-load if analytics story lands | **defer** |
| **react-big-calendar / react-calendar** | Manager admin/calendar | **`/ops/calendar`** may evolve; **single** calendar library only after bundle review | **defer** |
| **socket.io-client** | Driver (and customer) | **not default** — **Supabase Realtime** per VST-9 | **not default** |

---

## Do not copy from reference (AC4)

Reference patterns below are **documented for comparison only**. Approved Vestroo alternatives are inline.

- **JWT or access tokens in `localStorage` (or similar client storage)** for staff/manager/chauffeur parity — **Use:** Supabase session + **`requireOpsStaffPage`** / **`requireChauffeurPage`** and server-aware clients ([`ops-console.md`](ops-console.md), [`field-tools.md`](field-tools.md)).
- **Nest base URLs, axios singletons, and interceptor stacks** wired like **`ClientLayout` + `apiClient`** — **Use:** Server Actions, Route Handlers, Supabase queries — **[`docs/front-end-api-interaction.md`](front-end-api-interaction.md)**.
- **socket.io server URLs, namespaces, and event names** copied into Vestroo — **Use:** **`postgres_changes`** subscriptions and helpers under **`src/lib/supabase/realtime.ts`**, governed by **[VST-9](realtime-and-notifications.md)** (RLS, channels, MVP boundaries).
- **Firebase SDK blocks** for auth or storage in ops/field — **Use:** Supabase Auth + **Supabase Storage** with designed bucket policies.
- **Reference `.env` / `NEXT_PUBLIC_*` names** for Firebase, Nest, or socket hosts — **Use:** **[`docs/environment-vars.md`](environment-vars.md)** Vestroo matrix; never paste capstone env names into production config without review.

---

## Related Vestroo docs

- **[Capstone admin → ops mapping](capstone-admin-to-ops-mapping.md)** (FE.5.4)
- **[Capstone manager → Vestroo mapping](capstone-manager-to-vestroo-mapping.md)** (FE.5.5)
- **[Capstone driver → field mapping](capstone-driver-to-field-mapping.md)** (FE.5.6)
- **[Epic 5](epic-5.md)** — FE.5.9 context
- **[Epic 6](epic-6.md)** — BE.6.1 module matrix (FE.5.10)
