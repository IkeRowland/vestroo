/** @vitest-environment happy-dom */
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { describe, expect, it } from 'vitest'

expect.extend(toHaveNoViolations)

import { formatBookingIntentLabel } from '@/features/ops/booking-intent-labels'
import { OpsAvatarCell } from '@/features/ops/components/OpsAvatarCell'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OpsTableShell } from '@/features/ops/components/ops-primitives'
import {
	getBookingsQueuePaymentPillTone,
	getBookingsQueueStatusPillTone,
} from '@/features/ops/lib/ops-bookings-queue-pill-tones'
import { formatQueueStatusLabel } from '@/lib/ops-bookings-queue-query'

describe('Bookings queue presentation (17.10)', () => {
	it('exposes visible pill labels for status and payment', () => {
		const { getByText } = render(
			<OpsStatusPill tone={getBookingsQueueStatusPillTone('paid')}>
				{formatQueueStatusLabel('paid')}
			</OpsStatusPill>,
		)
		expect(getByText('Paid')).toBeTruthy()
	})

	it('passes axe on a minimal table row surface', async () => {
		const { container } = render(
			<OpsTableShell caption="Test queue">
				<thead>
					<tr>
						<th scope="col">Customer</th>
						<th scope="col">Status</th>
						<th scope="col">Payment</th>
						<th scope="col">Intent</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td>
							<OpsAvatarCell name="Jane Doe" secondary="jane@example.com" src={null} />
						</td>
						<td>
							<OpsStatusPill tone={getBookingsQueueStatusPillTone('paid')}>
								{formatQueueStatusLabel('paid')}
							</OpsStatusPill>
						</td>
						<td>
							<OpsStatusPill tone={getBookingsQueuePaymentPillTone('pending')}>
								{formatQueueStatusLabel('pending')}
							</OpsStatusPill>
						</td>
						<td>
							<OpsStatusPill tone="neutral" dot={false}>
								{formatBookingIntentLabel('point_to_point')}
							</OpsStatusPill>
						</td>
					</tr>
				</tbody>
			</OpsTableShell>,
		)
		expect(await axe(container)).toHaveNoViolations()
	})
})
