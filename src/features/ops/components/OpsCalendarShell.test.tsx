/** @vitest-environment happy-dom */
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

expect.extend(toHaveNoViolations)

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
}))

import { OpsCalendarShell } from '@/features/ops/components/OpsCalendarShell'

describe('OpsCalendarShell (Story 17.14)', () => {
	beforeEach(() => {
		mockPush.mockClear()
		vi.stubGlobal(
			'matchMedia',
			vi.fn().mockImplementation((query: string) => ({
				matches: typeof query === 'string' && query.includes('1024'),
				media: String(query),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('passes axe with rail open', async () => {
		const { container } = render(
			<OpsCalendarShell
				weekStartYmd="2026-04-20"
				monthYm="2026-04"
				view="week"
				selectedEventId="e1"
				events={[
					{
						id: 'e1',
						startsAt: '2026-04-21T10:00:00.000Z',
						endsAt: '2026-04-21T11:00:00.000Z',
						title: 'Test',
						subtitle: 'sub',
						tone: 'info',
					},
				]}
				railByTripId={{
					e1: {
						tripId: 'e1',
						status: 'assigned',
						scheduleLabel: 'a → b',
						vehicleName: 'V',
						clientLabel: 'C',
						driverName: 'D',
						notes: null,
						serviceType: null,
					},
				}}
			/>,
		)
		expect(await axe(container)).toHaveNoViolations()
		expect(screen.getByText('Test')).toBeTruthy()
	}, 15_000)
})
