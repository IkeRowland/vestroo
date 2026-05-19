import { describe, expect, it } from 'vitest'

import { normalizeOpsDriverAvatarObjectPosition } from '@/features/ops/lib/ops-driver-avatar-display'

describe('normalizeOpsDriverAvatarObjectPosition', () => {
	it('defaults unknown values to center', () => {
		expect(normalizeOpsDriverAvatarObjectPosition(null)).toBe('center')
		expect(normalizeOpsDriverAvatarObjectPosition('')).toBe('center')
		expect(normalizeOpsDriverAvatarObjectPosition('nope')).toBe('center')
	})

	it('accepts canonical positions case-insensitively', () => {
		expect(normalizeOpsDriverAvatarObjectPosition('TOP')).toBe('top')
		expect(normalizeOpsDriverAvatarObjectPosition('  Top Left  ')).toBe('top left')
	})
})
