import { describe, expect, it } from 'vitest'

import {
	assertChauffeurTripTransition,
	isChauffeurTripTransitionAllowed,
} from '@/lib/chauffeur-trip-transitions'

describe('chauffeur trip transitions', () => {
	it('allows assigned → en_route and en_route → completed', () => {
		expect(isChauffeurTripTransitionAllowed('assigned', 'en_route')).toBe(true)
		expect(isChauffeurTripTransitionAllowed('en_route', 'completed')).toBe(true)
	})

	it('rejects dispatcher-only transitions', () => {
		expect(isChauffeurTripTransitionAllowed('booking', 'assigned')).toBe(false)
		expect(isChauffeurTripTransitionAllowed('assigned', 'completed')).toBe(false)
		expect(isChauffeurTripTransitionAllowed('en_route', 'assigned')).toBe(false)
		expect(isChauffeurTripTransitionAllowed('completed', 'en_route')).toBe(false)
	})

	it('assertChauffeurTripTransition returns message on invalid', () => {
		const r = assertChauffeurTripTransition('assigned', 'completed')
		expect(r.ok).toBe(false)
		if (!r.ok) {
			expect(r.message).toContain('Invalid')
		}
	})
})
