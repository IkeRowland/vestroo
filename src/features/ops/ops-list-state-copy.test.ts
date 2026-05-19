import { describe, expect, it } from 'vitest'

import {
	OPS_EMPTY_COPY,
	opsDataRetryHint,
} from '@/features/ops/ops-list-state-copy'

describe('ops-list-state-copy', () => {
	it('exposes non-empty trip empty guidance', () => {
		expect(OPS_EMPTY_COPY.trips.title).toContain('trip')
		expect(OPS_EMPTY_COPY.trips.description.length).toBeGreaterThan(20)
	})

	it('retry hint mentions try again', () => {
		expect(opsDataRetryHint().toLowerCase()).toContain('try again')
	})
})
