# Epic 9: Deferred Capstone Modules & Optional Patterned Corporate Shuttle (REF / SH)

## Description

**Vestroo is a corporate shuttle and chauffeured transport business, not a public bus or mass-transit operator.** The reference project under `docs/capstone-reference` includes NestJS modules and `cline_docs` whose **names and diagrams** reflect a **campus / line-haul demo** (`BusStop`, `BusRoute`, `BusSchedule`, `Ticket`, `BusTracking`, `DriverBusSchedule`, files such as `busOperations.md`). Those artifacts are **reference material only**.

Epic 9 has **two** jobs:

1. **Traceability (always):** The **Epic 6 / FE.5.10** matrix MUST map each of those **reference modules** and related docs to **deferred**, **not applicable** to current Vestroo scope, or **conceptual analogue** in **corporate shuttle language** (e.g. recurring **client run**, **pickup sequence**, **capacity per departure**, **manifest**, **chauffeur assignment to a published timetable**)—with **no obligation** to build transit-style product.

2. **Optional product gate (rare):** If stakeholders explicitly approve a **patterned or capacity-managed corporate shuttle** offering (e.g. recurring employee loop, airport rotation, shared departure with **declared capacity**), implementation MAY proceed using **Vestroo terminology and IA**—reusing **patterns** from the reference (transactions, realtime, schedules) **without** adopting **bus / transit** branding or Epic 5 public-transit navigation.

If the gate is **no-go** (default for many operators), **only** the traceability and **deferred** rows are required—no feature delivery.

<a id="sh-9-1"></a>
## SH.9.1 — Product gate record (patterned / capacity-managed shuttle)

This subsection is the **single authoritative place** for the **recorded** **go / no-go** decision on any **new** offering that includes **published timetables**, **fixed pickup sequences**, or **per-departure capacity limits** distinct from today’s **booked-by-job** corporate shuttle model. Other docs MUST link here ([`epic-9.md#sh-9-1`](epic-9.md#sh-9-1)) instead of inventing parallel gate narratives. If a future **ADR** is added for the same decision, this anchor MUST link to it **or** the ADR MUST link here (**one** logical decision, **no** contradiction).

**Normative rules:**

* **(a)** A recorded **go** allows future implementation work on **SH.9.2–SH.9.5** (domain, capacity, live ops, checkout — when separately approved as stories).
* **(b)** **Implementation MUST NOT** begin on **SH.9.2–SH.9.5** until **go** is recorded in the gate block below.
* **(c)** **No-go** is a **complete** outcome: **SH.9.6** (**deferred capstone mapping**) **still applies** and MUST be delivered for traceability.
* **(d)** **No-go is the expected default** for operators who only run **booked-by-job** corporate shuttle.

**Engineering guardrail:** Backlog items, tickets, and **PRs** that implement **SH.9.2–SH.9.5** require a **go** recorded at **`#sh-9-1`**. **No-go** MUST NOT be treated as a failure to ship **SH.9.6** (deferred mapping remains required).

**Consistency — Epic 6 / matrix:** Reference **Bus***, **Ticket**, and related rows MUST follow **[BE.6.1](epic-6.md)** and **[FE.5.10 / BE.6.1 — capstone backend module matrix](capstone-backend-module-matrix.md)** — not forced into the default corporate shuttle schema without the **SH.9.1** decision recorded here.

| Field | Record |
| ----- | ------ |
| **Decision** | **go** |
| **Effective date** (ISO **YYYY-MM-DD**) | **2026-04-17** |
| **Decision owners** (e.g. product/commercial, engineering, compliance — free text) | Product, commercial, engineering, compliance — *replace with named signatories when formal minutes are filed.* |
| **Offering summary** — what **new** capability is proposed? | ☑ Published timetables ☑ Fixed pickup sequence ☑ Per-departure capacity — **patterned / capacity-managed corporate shuttle** in **shuttle vocabulary** (**NFR.5.4**; not public bus / mass transit). |
| **Commercial / revenue notes** | **Go** unlocks **SH.9.2–SH.9.5** implementation stories; commercial detail lives in backlog / pricing as those stories ship. |
| **Compliance / privacy notes** | **Manifests** / **passenger lists** when implemented: **RLS** + **audit** per **[VST-12 — compliance and safety](compliance-and-safety.md)** (**NFR.3.1**). |
| **Link to SH.9.6 status** | **[Deferred capstone modules / matrix — § SH.9.6](capstone-backend-module-matrix.md#sh-9-6-deferred-capstone-modules)** — traceability (required regardless of gate). |
| **Notes on Epic 9 follow-on** | **SH.9.2–SH.9.5** may proceed per story order (**SH.9.2** requires **ADR `0002-*`** before DDL). **SH.9.6** remains **required**. Supersede this row only with a deliberate **no-go** or revised **go** (new date + owners). |

This row records a **go** for the optional patterned / capacity-managed offering (**supersedes** the prior **no-go** documentation default dated **2026-04-16**). **SH.9.2 vocabulary + collision ADR:** **[ADR 0002 — Patterned shuttle domain (SH.9.2)](adr/0002-patterned-shuttle-domain-sh9-2.md)**. Per the **`#sh-9-1`** preamble, the **ADR** links here (**bidirectional**).

**NFR pointers (no schema design here):**

* **NFR.5.4:** Vestroo remains a **corporate shuttle** product; **go** decisions MUST frame offerings in **shuttle vocabulary**, not as a **public bus** or **mass-transit** operator.
* **NFR.3.1:** If **go** implies **manifests** or **passenger lists**, expect **RLS** and **audit** appropriate to corporate data — **[VST-12](compliance-and-safety.md)**.
* **NFR.1.2:** If **go** and **per-departure capacity** are in scope for a later epic, **capacity contention** MUST be **database-backed** in that work — not optimistic-only oversell.

## Goals

* Keep **reference module names** traceable for engineers reading `docs/capstone-reference/backend` without implying Vestroo sells **bus service**.
* Prevent **accidental** porting of transit UX into **`/ops/*`** (Epic 5 remains corporate shuttle).
* When and **only when** product approves a **patterned / capacity** corporate offering, define schema and flows in **shuttle vocabulary**; reference **ticketing / seat** docs become **design inputs**, not product labels.

## User Stories / Requirements

### SH.9.1: Product gate — patterned or capacity-managed shuttle (optional)

Summary: the **recorded** decision lives at **[`epic-9.md#sh-9-1`](epic-9.md#sh-9-1)** (gate table and rules). Do not duplicate the gate elsewhere.

### SH.9.2: Domain model — only if gated (Vestroo terms)

If **go**, the platform MUST model **recurring runs**, **waypoints or pickup order**, and **timetables** (as product defines) in **Postgres** with **RLS**. Naming MUST use **Epic 4 / VST** vocabulary (**run**, **assignment**, **service window**, **waypoint**, **manifest**—exact terms via ADR); MUST **not** ship **bus line** or **stop** as primary user-facing labels unless legally required. Collision with existing **service route / quote** concepts MUST be resolved in an **ADR**.

### SH.9.3: Capacity, holds, and occupancy — only if gated

If **go**, the team MUST implement **inventory-safe** **capacity** and **reservation** behaviour (inspired by reference **`ticketingSystem`** / **`seatTracking`** **logic**, not **transit product naming**): transactional holds, no oversell, clear cancellation rules. If **no-go**, the matrix cites those `cline_docs` files as **reference-only** with **no Vestroo feature**.

### SH.9.4: Live operations for patterned runs — only if gated

If **go**, the team MUST map reference **BusTracking** and **DriverBusSchedule** **capabilities** (vehicle position relative to a **published pattern**, chauffeur tied to a **scheduled run**) to **Vestroo Realtime** (Epic 7) with **privacy** and **client** policies. Reference **class names** remain **traceability keys** only. If **no-go**, mark **N/A** with rationale.

<a id="sh-9-5-checkout"></a>

### SH.9.5: Checkout and fulfilment — only if gated

If **go**, **booking and payment** rules for **patterned / capacity** products MUST be specified (vs on-demand **VST-6**), including **refund** and **no-show**. **PayFast** (or approved provider) MUST follow **INT.8.3**.

**Implemented spec:** **[ADR 0005 — Patterned checkout (SH.9.5)](adr/0005-patterned-checkout-sh9-5.md)** · VST-6 delta **[`patterned-checkout-vst6-delta.md`](patterned-checkout-vst6-delta.md)** · integrations **[`#sh-9-5-patterned-checkout`](integrations-and-payments.md#sh-9-5-patterned-checkout)** · story [`docs/stories/9.5.story.md`](stories/9.5.story.md).

**Epic 16 / Theme N — payment provider deferral (US-N2 / Q31):** The previously integrated **PayFast** checkout has been **physically removed** from the codebase (server action, webhook, client modal, and DB trigger — see `docs/stories/16.13.story.md` and migration `20260426234500_ops16_drop_payfast_trigger.sql`). The **SH.9.5 capacity reservation contract** (`reserve_service_run_capacity_for_booking_checkout`) is **retained** in the database; only the upstream provider redirect is gone. **Patterned-checkout payment work is deferred** until a replacement provider is approved under **INT.8.3**. Until then, settlement (including for any `corporate_pattern` rows seeded out-of-band) is recorded by ops via **`markBookingPaymentReceived`** (US-N3) in line with the EFT bridge.

<a id="sh-9-6"></a>

### SH.9.6: Deferred reference mapping (required regardless of gate)

The team MUST maintain a **deferred capstone modules** section in the **Epic 6** matrix (or linked doc): each reference module **BusStop**, **BusRoute**, **BusSchedule**, **Ticket**, **BusTracking**, **DriverBusSchedule** with **status** (**deferred** / **not applicable** / **analogue only**), **Epic 9 gate** reference, and **one-line rationale** in **corporate shuttle** framing. Cross-link **`cline_docs`** (**busOperations**, **busTracking**, **ticketingSystem**, **seatTracking**, **driverSchedule**) as **source docs for the old demo**, not as Vestroo product specs. **`docs/capstone-reference/document/`** diagrams (e.g. pricing, booking flows) MUST appear in the **diagram index**; map to tests/stories where they apply to **Vestroo** flows, or mark **reference-only**. **Canonical matrix subsection:** **[`capstone-backend-module-matrix.md` — § SH.9.6](capstone-backend-module-matrix.md#sh-9-6-deferred-capstone-modules)**.

## Related Non-Functional Requirements

* **NFR.3.1:** Security — If **go**, **manifest** and **passenger lists** MUST have **RLS** and **audit** appropriate to **corporate** data handling.
* **NFR.1.2:** Scalability — If **go**, **capacity** contention MUST be **database-backed**; **no** optimistic-only oversell.
* **NFR.5.4:** Consistency — Default product language remains **corporate shuttle**; any gated patterned offering MUST use **distinct** nav labels agreed with product—not transit demo copy.

## Design Goals

* **Reference ≠ product:** File and module names in `capstone-reference` may say **bus**; **Vestroo UI and epics** do not describe the company as a bus service.
* **Honest deferral:** **No-go** with full **SH.9.6** mapping is a **complete** outcome.
* **Reuse without confusion:** Shared **Realtime** and **payments** patterns (Epic 7 / 8) apply; **transit IA** does not.
