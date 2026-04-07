/**
 * Dev-only booking fixture entrypoint. Requires `next dev` (fixture is disabled in production).
 * @see docs/hardening-and-go-live.md
 */
export const e2eQuoteFixturePath = '/book/search?e2e_fixture=quote' as const;
