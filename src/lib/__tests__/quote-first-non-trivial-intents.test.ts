import { describe, it, expect, afterEach } from 'vitest'
import {
	isQuoteFirstForNonTrivialIntentsEnabled,
	isQuoteFirstNonTrivialBookingIntent,
} from '@/lib/quote-first-non-trivial-intents'

describe('isQuoteFirstForNonTrivialIntentsEnabled', () => {
	const prev = process.env.QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS

	afterEach(() => {
		if (prev === undefined) {
			delete process.env.QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS
		} else {
			process.env.QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS = prev
		}
	})

	it('defaults to ON when unset or empty', () => {
		delete process.env.QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS
		expect(isQuoteFirstForNonTrivialIntentsEnabled()).toBe(true)
		process.env.QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS = ''
		expect(isQuoteFirstForNonTrivialIntentsEnabled()).toBe(true)
	})

	it('is OFF for explicit false-like values (case-insensitive)', () => {
		for (const v of ['0', 'false', 'no', 'off', ' FALSE ']) {
			process.env.QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS = v
			expect(isQuoteFirstForNonTrivialIntentsEnabled()).toBe(false)
		}
	})

	it('is ON for common truthy strings', () => {
		for (const v of ['1', 'true', 'yes', 'on', 'TRUE']) {
			process.env.QUOTE_FIRST_FOR_NON_TRIVIAL_INTENTS = v
			expect(isQuoteFirstForNonTrivialIntentsEnabled()).toBe(true)
		}
	})
})

describe('isQuoteFirstNonTrivialBookingIntent', () => {
	it('matches non-trivial walk-in intents only', () => {
		expect(isQuoteFirstNonTrivialBookingIntent('hourly_hire')).toBe(true)
		expect(isQuoteFirstNonTrivialBookingIntent('experience_package')).toBe(true)
		expect(isQuoteFirstNonTrivialBookingIntent('trip_request')).toBe(true)
		expect(isQuoteFirstNonTrivialBookingIntent('point_to_point')).toBe(false)
		expect(isQuoteFirstNonTrivialBookingIntent('corporate_pattern')).toBe(false)
	})
})
