# Epic 8: Integrations, Communications, Payments, and Platform Ops (INT)

## Description

This epic covers **cross-cutting platform** concerns mirrored in the reference stack: **email** (Mailer + Handlebars templates), **SMS** utilities, **payments** (reference **Momo**, **PayOS** under `share/`), **scheduled jobs** (**ScheduleModule** / cron), and **secrets/configuration** (JWT, Redis, provider keys). **Vestroo** production choices—**PayFast**, **Google Maps**, **Supabase**, **Vercel**—MUST remain authoritative; the epic’s job is **parity of outcomes** and **clear mapping**, not **copy-paste** of reference providers.

## Goals

* Ensure **transactional email** and **SMS** behaviours needed for **booking and ops** have **documented** Vestroo implementations or **stubs** with **explicit** limitations.
* Map **payment** flows from the reference to **PayFast** (and corporate invoicing hooks per **VST-13**), including **webhooks**, **idempotency**, and **failure recovery**.
* Document **scheduled jobs**: what the reference runs on cron vs what Vestroo runs (**Vercel cron**, **Supabase** extensions, or **manual** ops)—with **no hidden** assumptions.
* Centralise **secrets** and **environment** naming per **`docs/environment-vars.md`**; forbid **duplicate** secret names for different semantics.

## User Stories / Requirements

### INT.8.1: Email template parity (Mailer / Handlebars → Vestroo)

The team MUST inventory reference **email templates** and **send triggers** (booking, OTP, notifications) and map each to a **Vestroo** template (provider or **HTML** in-repo), **trigger site** (Server Action / Route Handler / DB trigger), and **status**. Missing templates MUST be **backlog items** with **priority**. **PII** in email MUST follow **compliance** docs (**VST-12**). Canonical inventory (matrix, failure modes, traceability): **[integrations-and-payments.md § INT.8.1](integrations-and-payments.md#int-8-1)**.

### INT.8.2: SMS stub and policy parity

The platform MUST document **SMS** usage: **which** events send SMS, **stub vs provider**, **opt-in**, and **rate limits**. Reference **`share/`** SMS helpers MUST **not** be wired without **product** and **legal** approval; the matrix MUST state **implemented / stub / not applicable** with **rationale**. Canonical matrix, stub **NFR** notes, **`share/`** gate, and env footnote: **[integrations-and-payments.md § INT.8.2](integrations-and-payments.md#int-8-2)**.

### INT.8.3: Payments — Momo / PayOS vs PayFast

The team MUST document reference **Momo** and **PayOS** flows vs **Vestroo PayFast** (and any **deposit** rules): **checkout steps**, **webhooks**, **refunds**, **reconciliation**. The artifact MUST make **provider substitution** obvious for **developers** and **support**. **Test** and **production** keys MUST follow **`docs/environment-vars.md`**. Canonical matrix, substitution map, and PayFast **NFR** slices: **[integrations-and-payments.md § INT.8.3](integrations-and-payments.md#int-8-3)**.

### INT.8.4: Scheduled jobs and background work

The team MUST list reference **ScheduleModule** jobs (cron expressions, purposes) and map each to **Vestroo**: **implemented automation**, **manual ops procedure**, or **not applicable**. New scheduled work MUST **not** run with **client secrets**; **server** or **hosted cron** only, with **monitoring** hooks referenced from **hardening** docs where relevant.

### INT.8.5: Secrets, config, and shared modules (`share/`)

The team MUST document reference **`share/`** concerns—**JWT**, **Redis**, **SMS**, **Momo**, **PayOS**—as **patterns only**, mapping to **Vestroo** **Supabase JWT**, **Realtime/Redis** (if any), and **env** vars. **Redis** MUST **not** be introduced solely to mimic the reference unless an **ADR** approves cost and hosting. **JWT in browser storage** remains **forbidden** for first-party staff flows unless **explicitly** revised by ADR.

### INT.8.6: Third-party HTTP clients and idempotency

Where the reference uses **axios** or **Nest HttpModule** for outbound calls, Vestroo MUST document **Route Handler** or **server-only** fetch usage, **timeouts**, **retries**, and **idempotency keys** for **payments** and **critical** side effects.

## Related Non-Functional Requirements

* **NFR.3.1:** Security — **webhooks** MUST verify signatures; **secrets** MUST be server-only.
* **NFR.1.3:** Availability — payment and email providers MUST have **documented** failure modes and **operator** steps.
* **NFR.4.1:** Type safety — integration code MUST be **TypeScript** with **narrow** types at boundaries.

## Design Goals

* **Provider-agnostic docs:** Tables say what the **business event** is, then which **adapter** implements it.
* **Staging clarity:** Every integration MUST state **sandbox** vs **production** behaviour.
* **No silent cron:** Anything that **must** run on a schedule has a **named owner** and **monitoring** note.
