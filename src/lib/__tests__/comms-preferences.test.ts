import { describe, expect, it } from 'vitest'

import {
	DEFAULT_COMMS_PREFERENCES,
	normalizeCommsPreferencesFromDb,
	parseAccountPrefsCategoryQuery,
} from '@/types/comms-preferences'

describe('normalizeCommsPreferencesFromDb', () => {
	it('applies US-B3 defaults when null', () => {
		expect(normalizeCommsPreferencesFromDb(null)).toEqual(DEFAULT_COMMS_PREFERENCES)
	})

	it('merges partial object and forces transactional on', () => {
		expect(normalizeCommsPreferencesFromDb({ marketing: true })).toEqual({
			informational: true,
			marketing: true,
			transactional: true,
		})
	})
})

describe('parseAccountPrefsCategoryQuery', () => {
	it('parses canonical category param', () => {
		expect(parseAccountPrefsCategoryQuery('marketing')).toBe('marketing')
	})

	it('returns null for unknown values', () => {
		expect(parseAccountPrefsCategoryQuery('spam')).toBe(null)
	})
})
