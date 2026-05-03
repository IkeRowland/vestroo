# Epic 7: Real-Time, Tracking, and Messaging (RT)

## Description

This epic maps **reference real-time behaviour**—**socket.io** (`AppGateway` namespace `app`), **conversation** gateway (**Redis + JWT WS guard**), **tracking**, **notifications**, **shared itinerary**, and related driver flows—to **Vestroo** patterns: **Supabase Realtime**, **Row Level Security** on channels, **Server Actions** for mutations, and documented **rate limits** and **privacy tiers**. Performance and reliability expectations MUST be aligned with **`cline_docs/techContext`** (and related notes) where those documents define targets; gaps MUST be recorded explicitly.

## Goals

* Replace **ad hoc socket** assumptions with **documented** Realtime **topics**, **policies**, and **client subscription** rules.
* Preserve **operational** needs: **assignment updates**, **location/ETA**, **messaging** or **interim** channels where product requires them.
* Meet or document deviations from **techContext** performance targets (latency, fan-out, reconnect behaviour).
* Keep **corporate shuttle** framing: no mandatory **fixed public-transit-style** UX in real-time surfaces unless **Epic 9** patterned-shuttle gate is **go**.

## User Stories / Requirements

### RT.7.1: Tracking and trip presence parity

The platform MUST document and implement **authorised** live **vehicle / trip** updates consistent with **VST-9** and **`docs/realtime-and-notifications.md`**. The matrix MUST map reference **Tracking**, **Trip**, and **BusTracking** (where applicable) to **Supabase Realtime** channels (or **polling** fallback) with **RLS** notes. **BusTracking** (reference module name) MUST be labeled **Epic 9 deferred / optional patterned shuttle** or **N/A** with **rationale** when not in scope—**not** “Vestroo bus tracking” as a product.

### RT.7.2: Notifications parity

The team MUST map reference **Notification** module behaviour (triggers, payloads, read state) to **Vestroo** notification helpers, **DB** tables, and **Realtime** or **push** strategy. Gaps (e.g. no mobile push on web MVP) MUST be **explicit** with **interim** patterns (SMS policy, deep links) cross-linked to **field tools** docs.

### RT.7.3: Conversation and shared itinerary

The team MUST map reference **Conversation**, **SharedItinerary**, and gateway **Redis + JWT** patterns to **Vestroo**: **Realtime channels**, **Storage** for attachments if any, **RLS**, and **staff vs chauffeur vs customer** visibility. If **in-app chat** is out of scope, the matrix MUST state **deferred** and **approved alternative** per product.

### RT.7.4: Realtime policies, abuse controls, and observability

The system MUST document **subscription rules**, **rate limits**, and **privacy tiers** (e.g. VIP vs corporate) for each Realtime topic. The team MUST align stated targets with **`cline_docs/techContext`** where applicable; any **lower** or **higher** bar MUST cite **measurement method** and **owner**. **Load** or **soak** expectations for Realtime MUST be referenced or marked **not yet measured**.

### RT.7.5: Driver schedule vs broadcast patterns

The team MUST map **DriverSchedule** and **DriverBusSchedule** reference modules to **Vestroo** **assignments**, **runs**, and **roster** concepts. **DriverBusSchedule** (reference module name) MUST be treated as **Epic 9 deferred / optional patterned shuttle** unless **SH.9.1** is **go**; the doc MUST **not** imply fixed public-style timetables are the default for **corporate shuttle**.

### RT.7.6: Ratings and feedback events

The team MUST map reference **Rating** flows to **Vestroo** feedback storage and **ops** visibility, including whether **Realtime** is required or **batch** suffices. **Service type** dimensions from the reference (e.g. hourly vs scenic) MUST map to **Vestroo** product lines without forcing **bus** vocabulary into **Epic 5** UI.

## Related Non-Functional Requirements

* **NFR.3.1:** Security — Realtime MUST **not** leak PII across roles; **RLS** and **filter predicates** MUST be verified.
* **NFR.1.1 / NFR.1.2:** Performance and scale — subscription counts and payload sizes MUST be **bounded** or **documented** as risk.
* **NFR.5.5:** Authorization — **UI** hints MUST match **server** enforcement for who may subscribe.

## Design Goals

* **Explicit channels:** Names and purposes are listed, not discovered by reading old socket code.
* **Supabase-first:** Avoid parallel **socket.io** infrastructure unless an **ADR** approves it.
* **Field-ready:** Chauffeur web MUST have **clear** behaviour under flaky networks (see Epic 5 field mapping).
