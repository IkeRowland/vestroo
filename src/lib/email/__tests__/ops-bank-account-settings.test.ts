import { describe, it, expect } from 'vitest'

import {
	formatPaymentReference,
	resolveAccountInvoiceEftReference,
} from '@/lib/email/ops-bank-account-settings'

describe('formatPaymentReference', () => {
	it('substitutes invoice_number and booking_ref tokens', () => {
		expect(
			formatPaymentReference('REF-{invoice_number}', { invoice_number: 'INV-2026-0042' }),
		).toBe('REF-INV-2026-0042')
		expect(
			formatPaymentReference('{invoice_number}-{booking_ref}', {
				invoice_number: 'A',
				booking_ref: 'B',
			}),
		).toBe('A-B')
	})

	it('leaves unknown placeholders intact', () => {
		expect(formatPaymentReference('{other}', { invoice_number: 'X' })).toBe('{other}')
	})
})

describe('resolveAccountInvoiceEftReference', () => {
	it('prefers external_invoice_ref over payment_reference when both set', () => {
		expect(
			resolveAccountInvoiceEftReference({
				rawInvoiceReferenceFormat: null,
				externalInvoiceRef: 'INV-99',
				paymentReferenceField: 'PO-1',
				bookingRefLabel: 'BR',
			}),
		).toBe('INV-99')
	})

	it('falls back to payment_reference when external is empty', () => {
		expect(
			resolveAccountInvoiceEftReference({
				rawInvoiceReferenceFormat: null,
				externalInvoiceRef: null,
				paymentReferenceField: 'VST-HELLO',
				bookingRefLabel: 'ignored',
			}),
		).toBe('VST-HELLO')
	})

	it('uses invoice_reference_format with tokens', () => {
		expect(
			resolveAccountInvoiceEftReference({
				rawInvoiceReferenceFormat: 'EFT-{invoice_number}',
				externalInvoiceRef: 'INV-2026-0042',
				paymentReferenceField: '',
				bookingRefLabel: 'BOOK',
			}),
		).toBe('EFT-INV-2026-0042')
		expect(
			resolveAccountInvoiceEftReference({
				rawInvoiceReferenceFormat: 'EFT-{invoice_number}',
				externalInvoiceRef: '',
				paymentReferenceField: 'PR99',
				bookingRefLabel: 'BOOK',
			}),
		).toBe('EFT-PR99')
	})

	it('returns em dash when no reference fields', () => {
		expect(
			resolveAccountInvoiceEftReference({
				rawInvoiceReferenceFormat: null,
				externalInvoiceRef: '',
				paymentReferenceField: '',
				bookingRefLabel: '',
			}),
		).toBe('—')
	})
})
