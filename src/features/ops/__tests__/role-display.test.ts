import { describe, expect, it } from 'vitest'

import {
	getCommsDispatchRecipientRoleLabel,
	getRoleDisplayLabel,
	ROLE_DISPLAY_LABELS,
} from '@/features/ops/role-display'
import { COMMS_DISPATCH_RECIPIENT_ROLES } from '@/types/comms'
import type { ProfileRole } from '@/types/database.types'
import { PROFILE_ROLES } from '@/types/database.types'

describe('ROLE_DISPLAY_LABELS / getRoleDisplayLabel', () => {
	it.each(
		PROFILE_ROLES.map((role) => [role, ROLE_DISPLAY_LABELS[role]] as const),
	)('maps %s to %s', (role: ProfileRole, expected: string) => {
		expect(getRoleDisplayLabel(role)).toBe(expected)
	})

	it('matches epic Q21 chauffeur → Driver', () => {
		expect(getRoleDisplayLabel('chauffeur')).toBe('Driver')
	})
})

describe('getCommsDispatchRecipientRoleLabel', () => {
	it('uses ProfileRole labels for overlapping roles', () => {
		expect(getCommsDispatchRecipientRoleLabel('chauffeur')).toBe('Driver')
		expect(getCommsDispatchRecipientRoleLabel('customer')).toBe('Customer')
		expect(getCommsDispatchRecipientRoleLabel('dispatcher')).toBe('Dispatcher')
		expect(getCommsDispatchRecipientRoleLabel('admin')).toBe('Admin')
	})

	it('labels comms-only roles', () => {
		expect(getCommsDispatchRecipientRoleLabel('booker')).toBe('Booker')
		expect(getCommsDispatchRecipientRoleLabel('rider')).toBe('Rider')
		expect(getCommsDispatchRecipientRoleLabel('ops')).toBe('Ops')
	})

	it('covers every COMMS_DISPATCH_RECIPIENT_ROLES value', () => {
		for (const r of COMMS_DISPATCH_RECIPIENT_ROLES) {
			const label = getCommsDispatchRecipientRoleLabel(r)
			expect(label.length).toBeGreaterThan(0)
			expect(label).not.toBe('chauffeur')
		}
	})
})
