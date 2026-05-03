import { test } from '@playwright/test'

import {
	assertInvalidTrackSurface,
	RIDER_TRACK_MALFORMED_TOKEN,
} from './helpers/rider-track-privacy'

/**
 * Epic 15 / **15B.7** (Story **15.17**) — invalid rider track link: CTAs, **`noindex`**, PII denylist.
 *
 * Shared assertions live in **`tests/e2e/helpers/rider-track-privacy.ts`** (also imported by docs
 * for **15B.8** reuse — **`epic15-15b8-rider-tracking-privacy.spec.ts`** owns the wider matrix and
 * **does not** duplicate these cases).
 *
 * **Bad token:** **`RIDER_TRACK_MALFORMED_TOKEN`** — **`verifyRiderTrackToken`** returns **`malformed`**
 * before trip fetch (see **`src/lib/tracking-tokens.ts`**).
 */

test.describe('Epic 15.17 — rider track invalid / expired privacy surface', () => {
	test('malformed token path: CTAs, noindex, denylist (no DB token gate)', async ({ page }) => {
		await assertInvalidTrackSurface(page, `/track/${RIDER_TRACK_MALFORMED_TOKEN}`)
	})

	test('/track/expired: same surface + noindex', async ({ page }) => {
		await assertInvalidTrackSurface(page, '/track/expired')
	})
})
