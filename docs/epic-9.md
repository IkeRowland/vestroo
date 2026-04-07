# Epic 9: Deferred Capstone Modules & Optional Patterned Corporate Shuttle (REF / SH)

## Description

**Vestroo is a corporate shuttle and chauffeured transport business, not a public bus or mass-transit operator.** The reference project under `docs/capstone-reference` includes NestJS modules and `cline_docs` whose **names and diagrams** reflect a **campus / line-haul demo** (`BusStop`, `BusRoute`, `BusSchedule`, `Ticket`, `BusTracking`, `DriverBusSchedule`, files such as `busOperations.md`). Those artifacts are **reference material only**.

Epic 9 has **two** jobs:

1. **Traceability (always):** The **Epic 6 / FE.5.10** matrix MUST map each of those **reference modules** and related docs to **deferred**, **not applicable** to current Vestroo scope, or **conceptual analogue** in **corporate shuttle language** (e.g. recurring **client run**, **pickup sequence**, **capacity per departure**, **manifest**, **chauffeur assignment to a published timetable**)—with **no obligation** to build transit-style product.

2. **Optional product gate (rare):** If stakeholders explicitly approve a **patterned or capacity-managed corporate shuttle** offering (e.g. recurring employee loop, airport rotation, shared departure with **declared capacity**), implementation MAY proceed using **Vestroo terminology and IA**—reusing **patterns** from the reference (transactions, realtime, schedules) **without** adopting **bus / transit** branding or Epic 5 public-transit navigation.

If the gate is **no-go** (default for many operators), **only** the traceability and **deferred** rows are required—no feature delivery.

## Goals

* Keep **reference module names** traceable for engineers reading `docs/capstone-reference/backend` without implying Vestroo sells **bus service**.
* Prevent **accidental** porting of transit UX into **`/ops/*`** (Epic 5 remains corporate shuttle).
* When and **only when** product approves a **patterned / capacity** corporate offering, define schema and flows in **shuttle vocabulary**; reference **ticketing / seat** docs become **design inputs**, not product labels.

## User Stories / Requirements

### SH.9.1: Product gate — patterned or capacity-managed shuttle (optional)

The organisation MUST record a **go / no-go** for any **new** offering that includes **published timetables**, **fixed pickup sequences**, or **per-departure capacity limits** distinct from today’s **on-demand chauffeured** model (owner, date, commercial and compliance notes). **Implementation MUST NOT** begin on **SH.9.2–SH.9.5** until **go**. The **no-go** path MUST still deliver **SH.9.6** (deferred mapping). **No-go is the expected default** for operators who only run **booked-by-job** corporate shuttle.

### SH.9.2: Domain model — only if gated (Vestroo terms)

If **go**, the platform MUST model **recurring runs**, **waypoints or pickup order**, and **timetables** (as product defines) in **Postgres** with **RLS**. Naming MUST use **Epic 4 / VST** vocabulary (**run**, **assignment**, **service window**, **waypoint**, **manifest**—exact terms via ADR); MUST **not** ship **bus line** or **stop** as primary user-facing labels unless legally required. Collision with existing **service route / quote** concepts MUST be resolved in an **ADR**.

### SH.9.3: Capacity, holds, and occupancy — only if gated

If **go**, the team MUST implement **inventory-safe** **capacity** and **reservation** behaviour (inspired by reference **`ticketingSystem`** / **`seatTracking`** **logic**, not **transit product naming**): transactional holds, no oversell, clear cancellation rules. If **no-go**, the matrix cites those `cline_docs` files as **reference-only** with **no Vestroo feature**.

### SH.9.4: Live operations for patterned runs — only if gated

If **go**, the team MUST map reference **BusTracking** and **DriverBusSchedule** **capabilities** (vehicle position relative to a **published pattern**, chauffeur tied to a **scheduled run**) to **Vestroo Realtime** (Epic 7) with **privacy** and **client** policies. Reference **class names** remain **traceability keys** only. If **no-go**, mark **N/A** with rationale.

### SH.9.5: Checkout and fulfilment — only if gated

If **go**, **booking and payment** rules for **patterned / capacity** products MUST be specified (vs on-demand **VST-6**), including **refund** and **no-show**. **PayFast** (or approved provider) MUST follow **INT.8.3**.

### SH.9.6: Deferred reference mapping (required regardless of gate)

The team MUST maintain a **deferred capstone modules** section in the **Epic 6** matrix (or linked doc): each reference module **BusStop**, **BusRoute**, **BusSchedule**, **Ticket**, **BusTracking**, **DriverBusSchedule** with **status** (**deferred** / **not applicable** / **analogue only**), **Epic 9 gate** reference, and **one-line rationale** in **corporate shuttle** framing. Cross-link **`cline_docs`** (**busOperations**, **busTracking**, **ticketingSystem**, **seatTracking**, **driverSchedule**) as **source docs for the old demo**, not as Vestroo product specs. **`docs/capstone-reference/document/`** diagrams (e.g. pricing, booking flows) MUST appear in the **diagram index**; map to tests/stories where they apply to **Vestroo** flows, or mark **reference-only**.

## Related Non-Functional Requirements

* **NFR.3.1:** Security — If **go**, **manifest** and **passenger lists** MUST have **RLS** and **audit** appropriate to **corporate** data handling.
* **NFR.1.2:** Scalability — If **go**, **capacity** contention MUST be **database-backed**; **no** optimistic-only oversell.
* **NFR.5.4:** Consistency — Default product language remains **corporate shuttle**; any gated patterned offering MUST use **distinct** nav labels agreed with product—not transit demo copy.

## Design Goals

* **Reference ≠ product:** File and module names in `capstone-reference` may say **bus**; **Vestroo UI and epics** do not describe the company as a bus service.
* **Honest deferral:** **No-go** with full **SH.9.6** mapping is a **complete** outcome.
* **Reuse without confusion:** Shared **Realtime** and **payments** patterns (Epic 7 / 8) apply; **transit IA** does not.
