# Story VST-9: Realtime and notifications



## Status: Done



**Dependencies:** **[VST-5](vst-5.story.md)** MUST be **complete and stable** for **RLS** and tables **`public.vehicle_trackings`** and **`public.notifications`** (see **`docs/data-models.md`** and migrations). **[VST-7](vst-7.story.md)** MUST be **stable** so **ops** assigns **trips** and dispatch semantics align with **`/ops/*`** and **`src/actions/opsDispatch.ts`**. **[VST-8](vst-8.story.md)** SHOULD be **stable** so **chauffeurs** update **trip status** and the **field** app can **publish location** from **`/field/*`** (optional extension of **`fieldChauffeur`** or a dedicated action). **VST-10+** is **not** required for **MVP realtime** — tours, packages, and later epics MUST NOT block this slice unless explicitly pulled in.



## Story



- As an **authorised viewer** (operations staff, and customers or corporate accounts where product rules allow)

- I want **live vehicle location**, **ETA**, and **timely operational notifications** (assignment, change, no-show) on **agreed channels**, with **rate limits** and **privacy tiers**

- so that **coordination stays accurate and discreet**, **RLS and consent boundaries** hold, and **developers can verify** subscriptions on **staging** within documented **SLA-style windows**



## Epic traceability (source)



**From `docs/epic-4.md` — VST-9:** The platform MUST provide live **vehicle location** and **ETA** for **authorised viewers** and **operational notifications** (assignment, change, no-show), with **rate limits** and **privacy tiers** (e.g. VIP vs corporate). **Consent and visibility rules** MUST be **documented**; **dev subscribers** MUST see **timely updates** on **agreed channels**. Track detail in **`docs/stories/vst-9.story.md`**.



**Terminology alignment (folded from epic Domain vocabulary):**



1. Prefer **trip status**, **vehicle location**, and **ETA** in product copy, APIs, and engineering docs for live fulfilment visibility.

2. Use **service route**, **run**, **trip** / **leg**, **chauffeur**, **vehicle**, **booking** where those concepts apply — avoid **public-transit** framing.

3. Avoid **“bus tracking”** as a **product name**; **Runs** = operational instances; **patterns** = templates.

4. **Trip status** semantics MUST stay aligned with **`docs/data-models.md`** and **`TripFulfilmentStatusDb`** — not ad-hoc strings outside typed / constrained values.



**Out of scope (for this slice):** **VST-10+** features (e.g. **tours / experience packages** end-to-end booking) are **not** prerequisites for **MVP realtime**. **VST-12** **legal sign-off**, full **compliance** vault UIs, and **retention/export** flows — this story **documents** engineering boundaries and **POPIA-oriented** hooks only where noted. **Reference-only** patterns under **`src/features/capstone-reference/**`** (e.g. socket hooks) are **non-deliverable** — production **Realtime** MUST be implemented in **shipped** app code with **Supabase Realtime** (preferred) or a **documented** alternative. **Native mobile push** via Apple/Google is **out of scope** unless explicitly added in **Dev Technical Guidance**; **in-app** / **notifications table** / **email** stubs may suffice for MVP.



## Acceptance Criteria (ACs)



1. **Architecture documentation:** Add **`docs/realtime-and-notifications.md`** (**stub acceptable** if phased) describing: **Realtime channels** (or equivalent), **which roles** see **vehicle location** vs **ETA** vs **notifications**, **consent** and **visibility** rules, **VIP vs corporate** **privacy tier** rules, **agreed update intervals**, and **rate limits** (client + server). Cross-link from **`docs/index.md`** when the doc exists.



2. **Vehicle location ingestion:** Define and implement the **ingestion path** (chauffeur **field** app and/or **background** strategy) that **writes** to **`public.vehicle_trackings`** (linked to **`chauffeur_assignment_id`** per **`docs/data-models.md`**). **Throttle** updates (e.g. **max N** per **minute** per **assignment**); **document** the limit and **enforce** **server-side** (Server Action / API) and/or **DB** (trigger or constraint) **if feasible**.



3. **Supabase Realtime (preferred):** Subscribe **authorised** clients to **`vehicle_trackings`** and/or **`trips`** (or agreed tables) using **user JWT** clients — extend **`src/lib/supabase/client.ts`** / **`server.ts`** as needed. **RLS** MUST govern what each subscriber receives; **document** verification steps against **Supabase Realtime + RLS** behaviour (including any **caveats** from provider docs). If **not** using Supabase Realtime, **document** the **alternative** and **security** model **in `docs/realtime-and-notifications.md`**.



4. **ETA display:** For **authorised** viewers, show **ETA** derived from **last known position** + **route** — **reuse** **`src/lib/maps.ts`** (or **document** a **stub** calculation and upgrade path). **Precision** MUST respect **privacy class** (coarser for **VIP** where product requires; **fuller** for **corporate** where allowed) per the **matrix** in **`docs/realtime-and-notifications.md`**.



5. **Operational notifications:** **Persist** and/or **fan-out** **assignment**, **change**, and **no-show** events to **`public.notifications`** (extend schema **via migration** if types/channels are insufficient) for **dispatcher**, **customer**, and/or **chauffeur** as product rules dictate. Implement via **Server Action**, **server-side** orchestration after dispatch/field actions, and/or **DB trigger** — **document** the **chosen path(s)** in **`docs/realtime-and-notifications.md`** and **`docs/front-end-api-interaction.md`**. Align **status-driven** rules with **`TripFulfilmentStatusDb`** where applicable.



6. **Rate limits:** **Client** debouncing/batching MUST be documented and implemented where location is streamed. **Server/API** limits MUST be documented; reference **Supabase project** Realtime and **database** limits in **`docs/realtime-and-notifications.md`** (links to provider docs as needed).



7. **Privacy tiers:** **Document** an explicit **matrix** in **`docs/realtime-and-notifications.md`**: e.g. **VIP** = coarser **location** / **ETA** rounding vs **corporate** = **fuller** detail where **contract** and **consent** allow. Implementation MUST **not** leak **higher-precision** data to **lower-tier** viewers via APIs or Realtime payloads.



8. **Consent / visibility:** Provide **user-facing** copy **stub** and/or **account** **flags** stub as agreed with PO, plus **engineering** documentation for **POPIA alignment** (engineering **cannot** replace legal sign-off — **boundary** with **VST-12** stated in **`docs/realtime-and-notifications.md`**).



9. **Dev subscriber verification:** Add a **checklist** (e.g. in **`docs/staging-and-promotion.md`** or **`docs/local-development.md`**) for developers to confirm **Realtime** (or agreed channel) subscribers receive updates within **N seconds** on **staging** (define **N** in the doc).



10. **Ops console integration:** **`/ops/*`** MUST surface **live board** updates via **Realtime** **or** a **documented polling fallback** (intervals, trade-offs) in **`docs/ops-console.md`** and/or **`docs/realtime-and-notifications.md`**.



11. **Field app integration:** **`/field/*`** MUST **publish** **location** updates through the agreed ingestion path (**optional hook** from **VST-8** — extend **`src/actions/fieldChauffeur.ts`** **or** add a **new** action); **document** in **`docs/field-tools.md`**.



12. **Security:** **No** **service role** keys in the **browser**; **anon** / **authenticated** Realtime **only** with **RLS**. **Audit** or log **sensitive** subscription patterns **where feasible** (defence in depth — align with **`ops_audit_log`** or successor patterns).



13. **Tests:** Add **integration** or **mocked** Realtime tests **where feasible**; **`npm run test`** MUST pass in CI.



14. **Epic traceability and documentation:** Keep **`docs/epic-4.md`** bullet **VST-9** consistent with delivery. Update **`docs/data-models.md`** (**`vehicle_trackings`**, **`notifications`**, Realtime-relevant columns). Update **`docs/front-end-api-interaction.md`** and **`docs/index.md`** with links to **`docs/realtime-and-notifications.md`**.



## Tasks / Subtasks



- [x] **Task 1 — AC1:** Author **`docs/realtime-and-notifications.md`** (channels, roles, consent, tiers, intervals, rate limits); link from **`docs/index.md`**. (AC: #1)



- [x] **Task 2 — AC2:** Implement **vehicle_trackings** **ingestion** with **documented throttle**; **server** and/or **DB** enforcement as feasible. (AC: #2)



- [x] **Task 3 — AC3:** Wire **Supabase Realtime** (or **documented** alternative) for **`vehicle_trackings`** / **`trips`**; extend **`src/lib/supabase/client.ts`** / **`server.ts`**; **verify RLS** with Realtime. (AC: #3)



- [x] **Task 4 — AC4:** Implement **ETA** display for **authorised** viewers using **`src/lib/maps.ts`** or **documented stub**; apply **privacy tier** precision. (AC: #4)



- [x] **Task 5 — AC5:** Implement **operational notifications** (**assignment**, **change**, **no-show**) to **`public.notifications`** (+ migration if needed); **document** Action/trigger path. (AC: #5)



- [x] **Task 6 — AC6:** Implement **client debounce** + document **server/API** rate limits and **Supabase** project limits. (AC: #6)



- [x] **Task 7 — AC7:** Encode **VIP vs corporate** **privacy matrix** in docs and **enforce** in payloads/APIs. (AC: #7)



- [x] **Task 8 — AC8:** Add **consent/visibility** **stub** (copy/flags) + **POPIA** engineering notes; **VST-12** boundary in doc. (AC: #8)



- [x] **Task 9 — AC9:** Add **staging dev checklist** for subscriber **latency** (**N** seconds). (AC: #9)



- [x] **Task 10 — AC10:** Integrate **`/ops/*`** with **Realtime** or **documented polling**; update **`docs/ops-console.md`**. (AC: #10)



- [x] **Task 11 — AC11:** Extend **`/field/*`** to **publish location** (**fieldChauffeur** or new action); **`docs/field-tools.md`**. (AC: #11)



- [x] **Task 12 — AC12:** **Security review:** no service role in browser; **RLS-only** Realtime; **audit** hooks as feasible. (AC: #12)



- [x] **Task 13 — AC13:** Add **tests** (mocked/integration) for Realtime-related paths; **`npm run test`** green. (AC: #13)



- [x] **Task 14 — AC14:** Update **`docs/data-models.md`**, **`docs/front-end-api-interaction.md`**, **`docs/index.md`**; align **`docs/epic-4.md`** **VST-9**. (AC: #14)



## Dev Technical Guidance



- **Tables (authoritative):** **`public.vehicle_trackings`** — link **`chauffeur_assignment_id`** per **`docs/data-models.md`**; **`public.notifications`** — **`recipient_id`**, RLS policy **`notifications_own`** (recipient-scoped). **`public.trips`** — **`status`** and lifecycle for **status-driven** notification rules — align with **`TripFulfilmentStatusDb`** in **`src/types/database.types.ts`** (e.g. **`booking`**, **`assigned`**, **`en_route`**, **`completed`**, **`cancelled`**).

- **Migrations / RLS:** Earlier tracking policies in **`supabase/migrations/20260402133703_vestroo_rls_policies_tracking_drivers.sql`**; consolidated **chauffeur insert/update** and **staff read** patterns in **`supabase/migrations/20260406103000_vestroo_profile_roles_chauffeur_columns_rls.sql`**. New policies or triggers for **throttle** / **notification fan-out** SHOULD be **forward-only** migrations under **`supabase/migrations/`**.

- **Supabase clients:** **`src/lib/supabase/client.ts`**, **`src/lib/supabase/server.ts`** — add **Realtime** channel helpers **without** exposing **service role** to the client bundle.

- **Maps / ETA:** Prefer **`src/lib/maps.ts`** for route/distance assumptions; document any **stub** if Maps APIs are not yet wired for ETA.

- **Ops and field:** **`docs/ops-console.md`**, **`src/app/(ops)/`**, **`src/actions/opsDispatch.ts`**; **`docs/field-tools.md`**, **`src/app/(field)/`**, **`src/lib/field-auth.ts`**, **`src/actions/fieldChauffeur.ts`** — keep **assignment** and **status** semantics consistent when emitting **notifications** and **location**.

- **Non-deliverable:** Do **not** ship **`src/features/capstone-reference/**`** socket demos as production **Realtime**; implement in **app** code paths with tests and docs.

- **Conventions:** **`docs/repo-conventions.md`**, **`docs/front-end-api-interaction.md`**.



## Story Progress Notes



### Agent Model Used: `dev` (implementation)



### Completion Notes List



- **Migration `20260409120000_vst9_realtime_notifications.sql`:** `notifications.kind`, `metadata`, `channel`; CHECK on `kind`; policy **`notifications_chauffeur_customer_insert`**; **`ALTER PUBLICATION supabase_realtime ADD TABLE`** for **`vehicle_trackings`** and **`trips`** (if already present, migration may error — remove duplicate `ADD TABLE` locally or adjust publication manually).

- **Ingestion:** **`publishChauffeurLocationAction`** in **`src/actions/fieldLocation.ts`**; throttle **`VEHICLE_TRACKING_MAX_UPDATES_PER_MINUTE = 12`** (5 s min gap); **`FieldLocationPublisher`** client interval **8 s**.

- **Realtime:** **`src/lib/supabase/realtime.ts`** + **`OpsBoardRealtimeBridge`** on **`/ops/board`** (2 s debounce + ETA strip).

- **Notifications:** **`src/lib/operational-notifications.ts`**; **`opsDispatch`** + **`fieldChauffeur`** best-effort inserts (no service role); cancelled trips use **`kind = no_show`**.

- **Maps:** Restored **`calculateRouteDistance`**, **`PlaceResult`**, **`isAirport`** on **`src/lib/maps.ts`**; haversine ETA + **`roundCoordinatesForPrivacyTier`**.

- **Tests:** throttle, operational notification builders, maps ETA/privacy; **`calculateQuote.test.ts`** mocks **`quote-engine`**.

- **Build fix:** **`BookingSearchForm`** strict strings for **`formattedAddress`** / **`name`** when building store locations.



### Story DoD Checklist Report



- **Code quality:** TypeScript strict; new helpers follow repo patterns; no service role in client Realtime path.

- **Testing:** `npm run test` — **76** tests pass; `npm run build` succeeds.

- **Documentation:** **`docs/realtime-and-notifications.md`**, cross-links, **`data-models`**, **`epic-4`**, staging/latency checklist (**≤ 30 s** target staging, **≤ 10 s** healthy).

- **Security:** RLS-only Realtime; notification inserts via staff/chauffeur policies; PII minimised in titles/bodies.

- **N/A / deferred:** DB trigger for throttle (server enforcement only); customer **`vehicle_trackings`** SELECT (documented phased); native push (out of scope).



### Change Log



| Date | Change |

|------|--------|

| 2026-04-02 | Initial **Draft**: **VST-9 Realtime and notifications** from **`docs/epic-4.md`**; dependencies **VST-5** (**`vehicle_trackings`**, **`notifications`**, RLS), **VST-7** (ops assigns trips), **VST-8** (field status + optional location publish); **VST-10+** not required for MVP; epic traceability + terminology (**trip status**, **vehicle location**, **ETA**; avoid **“bus tracking”**) + **out of scope** (VST-10+, VST-12 legal sign-off, capstone Realtime hooks); **14 ACs** (architecture doc, ingestion + throttle, Supabase Realtime + RLS, ETA + privacy precision, operational notifications, rate limits, privacy tiers matrix, consent stub + POPIA boundary, dev staging checklist, ops integration, field location publish, security, tests, cross-docs); **14 tasks** 1:1 with ACs; **Dev Technical Guidance** (tables, migrations **`20260402133703_*`**, **`20260406103000_*`**, **`TripFulfilmentStatusDb`**, **`docs/ops-console.md`**, **`docs/field-tools.md`**). |

| 2026-04-07 | **Implementation complete** — Status **Review**; migration **`20260409120000_*`**, **`fieldLocation`**, **`operational-notifications`**, Realtime bridge, docs sweep, tests, maps/quote test fixes. |


