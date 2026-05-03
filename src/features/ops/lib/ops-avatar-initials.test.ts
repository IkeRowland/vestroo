import { describe, expect, it } from 'vitest'

import { opsAvatarInitialsFromName } from '@/features/ops/lib/ops-avatar-initials'

describe('opsAvatarInitialsFromName (Story 17.7)', () => {
	it('uses first + last word when ≥ 2 words', () => {
		expect(opsAvatarInitialsFromName('Alice Johnson')).toBe('AJ')
		expect(opsAvatarInitialsFromName('Jean de Villiers')).toBe('JV')
	})

	it('uses first two letters for a single word', () => {
		expect(opsAvatarInitialsFromName('Madonna')).toBe('MA')
		expect(opsAvatarInitialsFromName('A')).toBe('A')
	})

	it('trims and collapses whitespace', () => {
		expect(opsAvatarInitialsFromName('  Bob   Smith  ')).toBe('BS')
	})

	it('returns placeholder when empty after trim', () => {
		expect(opsAvatarInitialsFromName('')).toBe('?')
		expect(opsAvatarInitialsFromName('   ')).toBe('?')
	})
})
