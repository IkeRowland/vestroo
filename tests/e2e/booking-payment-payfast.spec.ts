import { test } from '@playwright/test';

/**
 * PayFast E2E (VST-13 / VST-14): default suite does not drive PayFast redirect or ITN.
 * Optional: `page.route('https://sandbox.payfast.co.za/**', …)` to stub the POST target
 * after seeding the booking flow; production uses `PAYFAST_URL` (see docs/hardening-and-go-live.md).
 */
test.describe('Booking payment (PayFast)', () => {
  test(
    'sandbox redirect + ITN (@heavy — manual pre-release only)',
    { tag: '@heavy' },
    async () => {
      test.skip(
        !process.env.RUN_HEAVY_E2E,
        'Set RUN_HEAVY_E2E=1 with PayFast sandbox env and a reachable ITN URL for a full payment smoke; see docs/hardening-and-go-live.md',
      );
      // Placeholder for extended harness: seed through /book/details, open /book/payment,
      // optionally mock `**/eng/process` and assert form fields — not run unless RUN_HEAVY_E2E.
    },
  );
});
