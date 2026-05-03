import { describe, it, expect } from 'vitest'

import {
	ACCOUNT_BOOKING_CANCELLATION_POLICY_SNIPPET,
	resolveSupportContactLine,
} from '@/lib/email/email-copy'
import { renderAccountTripConfirmationHtml } from '@/lib/email/templates/account-trip-confirmation'

describe('renderAccountTripConfirmationHtml', () => {
	it('includes key sections and escaped copy', () => {
		const html = renderAccountTripConfirmationHtml({
			customerName: 'Test <User>',
			bookingReference: 'REF-1',
			pickupDateTimeLabel: '1 Jan 2026, 10:00',
			originLabel: 'A',
			destinationLabel: 'B',
			vehicleName: 'V-Class',
			vehicleCategoryLabel: 'Luxury van',
			driverFullName: 'Jane Doe',
			totalZarLabel: 'R 1,234.00',
			lineItems: [
				{ label: 'Transfer', qty: 1, unit_zar: 500, total_zar: 500, note: 'Airport' },
			],
			creditTermsDays: 14,
			cancellationSnippet: ACCOUNT_BOOKING_CANCELLATION_POLICY_SNIPPET,
			supportContactLine: resolveSupportContactLine(),
		})

		expect(html).toContain('Trip confirmation')
		expect(html).toContain('REF-1')
		expect(html).toContain('Invoice to follow within 14 days')
		expect(html).toContain('Luxury van')
		expect(html).toContain('&lt;User&gt;')
		expect(html).toContain('Standard cancellations')
	})

	it('includes rider tracking link when riderTrackingUrl is set', () => {
		const url = 'https://app.example/track/abc'
		const html = renderAccountTripConfirmationHtml({
			customerName: 'Booker',
			bookingReference: 'REF-1',
			pickupDateTimeLabel: '1 Jan 2026, 10:00',
			originLabel: 'A',
			destinationLabel: 'B',
			vehicleName: 'V-Class',
			vehicleCategoryLabel: 'Luxury van',
			driverFullName: 'Jane Doe',
			totalZarLabel: 'R 1,234.00',
			lineItems: [],
			creditTermsDays: 14,
			cancellationSnippet: ACCOUNT_BOOKING_CANCELLATION_POLICY_SNIPPET,
			supportContactLine: resolveSupportContactLine(),
			riderTrackingUrl: url,
		})
		expect(html).toContain('Rider tracking')
		expect(html).toContain(`href="${url}"`)
		expect(html).toContain('id="rider-tracking"')
		expect(html).toContain('forward this email')
	})

	it('mentions rider email when riderEmailForCopy is set', () => {
		const html = renderAccountTripConfirmationHtml({
			customerName: 'Booker',
			bookingReference: 'REF-1',
			pickupDateTimeLabel: '1 Jan 2026, 10:00',
			originLabel: 'A',
			destinationLabel: 'B',
			vehicleName: 'V-Class',
			vehicleCategoryLabel: 'Luxury van',
			driverFullName: 'Jane Doe',
			totalZarLabel: 'R 100.00',
			lineItems: [],
			creditTermsDays: 14,
			cancellationSnippet: ACCOUNT_BOOKING_CANCELLATION_POLICY_SNIPPET,
			supportContactLine: resolveSupportContactLine(),
			riderTrackingUrl: 'https://app.example/track/x',
			riderEmailForCopy: 'rider@example.com',
		})
		expect(html).toContain('rider@example.com')
		expect(html).toContain('share this link')
	})
})
