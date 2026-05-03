import { afterEach, describe, expect, it, vi } from 'vitest'

import { isDispatchSuggestionsEnabled } from '@/lib/dispatch-suggestions-env'

describe('isDispatchSuggestionsEnabled', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('is false when unset', () => {
		vi.stubEnv('DISPATCH_SUGGESTIONS_ENABLED', '')
		expect(isDispatchSuggestionsEnabled()).toBe(false)
	})

	it('matches SMS-style truthy values', () => {
		vi.stubEnv('DISPATCH_SUGGESTIONS_ENABLED', '1')
		expect(isDispatchSuggestionsEnabled()).toBe(true)
		vi.stubEnv('DISPATCH_SUGGESTIONS_ENABLED', 'yes')
		expect(isDispatchSuggestionsEnabled()).toBe(true)
		vi.stubEnv('DISPATCH_SUGGESTIONS_ENABLED', '0')
		expect(isDispatchSuggestionsEnabled()).toBe(false)
	})
})
