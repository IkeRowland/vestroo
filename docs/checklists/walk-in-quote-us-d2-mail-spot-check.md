# US-D2 — `walk-in-quote` email spot check (3 of 4 clients)

**Story 14.11 / Epic 14** — manual QA only (not Playwright).

## Template

| Client | Tester | Date | Pass |
| ------ | ------ | ---- | ---- |
| Gmail (web) | | | ☐ |
| Outlook (web) | | | ☐ |
| Apple Mail (desktop) | | | ☐ |
| iOS Mail | | | ☐ |

**Requirement:** complete **at least three** rows (three different clients).

## What to verify

1. Subject and sender look correct; no obvious spam-folder-only rendering issues.
2. **Accept / reject / pay** links use opaque `/q/.../...` paths (no query-string PII).
3. Links resolve in the client (no broken redirects for that client).

## Notes

Record rendering quirks (images blocked, link tracking warnings, etc.) in the story **Progress Notes** when closing the checklist.
