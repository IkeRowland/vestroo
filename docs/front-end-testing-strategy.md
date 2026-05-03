# Front-End Testing Strategy

## E2E Testing (Playwright)

* **Critical Flow:** "Guest User Booking".
* **Steps:** Landing Page → Enter "Sandton" to "OR Tambo" → Select Date → Click "Get Quote" → Select "Sedan" → Enter Details → Click "Pay".
* **Coverage:** MUST cover the "Happy Path" Booking Flow (Search → Quote → Payment Success) on Mobile and Desktop.

## Unit Testing (Vitest)

* Test `calculateQuote` logic (mocking Google Maps).
* Test Form Validation schemas (Zod).
* MUST cover **100%** of the Pricing Calculation Logic.

## Manual QA

* Admin Panel functionality will be validated via manual exploratory testing.

