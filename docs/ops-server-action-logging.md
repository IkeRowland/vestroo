# Ops server action logging

Ops-facing server actions under `src/actions/ops*.ts` emit **structured JSON lines** via `src/lib/ops-action-log.ts` (`logOpsAction`) for observability (**US-B3**). Each invocation should use a **`correlationId`** from `newOpsCorrelationId()` (UUID v4), returned to the client inside `error.correlationId` on failures where applicable.

## Log line fields

| Field | Required | Description |
| ----- | -------- | ----------- |
| `scope` | yes | Always `ops_action` |
| `ts` | yes | ISO-8601 timestamp |
| `action` | yes | Stable action identifier (e.g. `assignBookingToRun`, `exportDataSubjectAction`) |
| `outcome` | yes | One of: `success`, `failure`, `validation_error`, `forbidden`, `not_found`, `conflict` |
| `level` | yes | `info`, `warn`, or `error` |
| `correlationId` | yes | UUID for this invocation |
| `code` | optional | Machine-oriented code (e.g. `VALIDATION`, `DATABASE`, `FORBIDDEN`) |
| `entityId` | optional | Primary entity UUID when safe (trip, engagement, document, …) |
| `bookingId` | optional | Booking UUID when part of the flow |
| `tripId` | optional | Trip UUID |
| `hint` | optional | **Internal only** — short redacted hint (e.g. gate message, Postgres summary). Never log raw multi-line SQL, stack traces, or secrets here |
| `meta` | optional | Small scalar map only; long strings are truncated with a length marker |

## Redaction rules (**AC8**)

- Do **not** log full **PII payloads** (customer names, phones, emails, free-text notes, coordination notes). Prefer **lengths** or counts (`summary_len`, `note_len`, `booking_count`).
- Do **not** log **environment secrets**, **JWTs**, **service-role keys**, or **API keys**.
- **DSR export**: log counts and version only on success — the export body is returned to the **admin client** separately and is not duplicated in logs.

## Client-visible errors

User-facing copy is built with `buildOpsActionFailure` / `mapOpsActionErrorToMessage` (`src/features/ops/ops-action-errors.ts`) so Postgres and internal strings are **not** shown raw when they resemble SQL, JWTs, or stack traces.
