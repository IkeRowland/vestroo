import { describe, expect, it } from 'vitest'

import { joinProfileFullName, splitProfileFullName } from '@/features/account/lib/account-profile-name'

describe('splitProfileFullName', () => {
	it('returns empty parts for blank', () => {
		expect(splitProfileFullName('')).toEqual({ firstName: '', lastName: '' })
		expect(splitProfileFullName('   ')).toEqual({ firstName: '', lastName: '' })
	})

	it('splits on first whitespace', () => {
		expect(splitProfileFullName('Ada Lovelace')).toEqual({ firstName: 'Ada', lastName: 'Lovelace' })
		expect(splitProfileFullName('John von Neumann')).toEqual({ firstName: 'John', lastName: 'von Neumann' })
	})

	it('treats single token as first name only', () => {
		expect(splitProfileFullName('Madonna')).toEqual({ firstName: 'Madonna', lastName: '' })
	})
})

describe('joinProfileFullName', () => {
	it('joins trimmed parts', () => {
		expect(joinProfileFullName('Ada', 'Lovelace')).toBe('Ada Lovelace')
		expect(joinProfileFullName('  Ada  ', ' Lovelace ')).toBe('Ada Lovelace')
	})

	it('returns single token when last empty', () => {
		expect(joinProfileFullName('Madonna', '')).toBe('Madonna')
	})
})
