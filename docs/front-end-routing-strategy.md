# Front-End Routing Strategy

## Route Definitions

| Path | Component | Type | Notes |
| :---- | :---- | :---- | :---- |
| / | (marketing)/page.tsx | Server | Homepage. High SEO. |
| /book | (app)/book/page.tsx | Client | Redirects to /book/search. |
| /book/search | (app)/book/search/page.tsx | Client | Step 1 inputs. |
| /book/quote | (app)/book/quote/page.tsx | Client | Display calculated options. Protected: Requires origin set. |
| /book/details | (app)/book/details/page.tsx | Client | User info form. Protected: Requires selectedVehicle. |
| /book/payment | (app)/book/payment/page.tsx | Client | PayFast modal trigger. |
| /confirmation | (app)/confirmation/page.tsx | Server | Success state. Fetches booking via ID param. |

## Route Groups

* **(marketing):** Public, ISR-heavy pages for SEO optimization.
* **(app):** Dynamic Booking Application with protected routes.
* **(payload):** PayloadCMS Admin Routes (Managed by Payload).
* **(ops):** Staff operations console under **`/ops/*`** — route table, auth, and shell layout are documented in **[ops-console.md](ops-console.md)** (this file stays booking-corridor focused).

