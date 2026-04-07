import { describe, expect, it } from 'vitest'

import {
	buildTelHref,
	maskCustomerPhoneForDisplay,
	tripStatusAllowsCustomerContact,
} from '@/lib/field-customer-contact'

describe('field customer contact', () => {
	it('masks phone for display', () => {
		expect(maskCustomerPhoneForDisplay('+27 82 123 4567')).toBe('***4567')
		expect(maskCustomerPhoneForDisplay('12')).toBe('***')
	})

	it('builds tel href', () => {
		expect(buildTelHref('+27 82 123 4567')).toBe('tel:+27821234567')
	})

	it('gates contact by trip status', () => {
		expect(tripStatusAllowsCustomerContact('assigned')).toBe(true)
		expect(tripStatusAllowsCustomerContact('en_route')).toBe(true)
		expect(tripStatusAllowsCustomerContact('completed')).toBe(false)
	})
})
