import { describe, expect, it } from 'vitest'

import { tripStatusDisplayLabel } from '@/features/ops/copy/ops-trips-copy'

describe('ops-trips-copy', () => {
	it('tripStatusDisplayLabel formats snake_case', () => {
		expect(tripStatusDisplayLabel('en_route')).toBe('En Route')
		expect(tripStatusDisplayLabel('booking')).toBe('Booking')
	})
})
