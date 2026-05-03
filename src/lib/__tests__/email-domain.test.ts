import { describe, it, expect } from 'vitest'

import { extractEmailDomain } from '@/lib/email-domain'

describe('extractEmailDomain', () => {
	it('returns lowercase domain', () => {
		expect(extractEmailDomain('  User@Example.COM  ')).toBe('example.com')
	})

	it('returns null for invalid', () => {
		expect(extractEmailDomain('not-an-email')).toBeNull()
		expect(extractEmailDomain('@nodomain.com')).toBeNull()
		expect(extractEmailDomain('a@')).toBeNull()
	})
})
