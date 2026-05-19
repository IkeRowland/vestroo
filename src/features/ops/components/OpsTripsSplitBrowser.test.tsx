/** @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

expect.extend(toHaveNoViolations)

vi.mock('@/features/ops/components/TripOpsForms', () => ({
	TripOpsForms: () => <div data-testid="trip-ops-forms-stub" />,
}))

import { OpsTripsSplitBrowser } from '@/features/ops/components/OpsTripsSplitBrowser'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
}))

const TRIP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const DRIVER_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
const VEHICLE_ID = 'vvvvvvvv-vvvv-4vvv-8vvv-vvvvvvvvvvvv'

const baseTrip = {
	id: TRIP_ID,
	status: 'assigned',
	time_start_estimate: '2026-04-28T10:00:00.000Z',
	time_end_estimate: '2026-04-28T11:00:00.000Z',
	vehicle_id: VEHICLE_ID,
	chauffeur_id: DRIVER_ID,
	ops_delay_note: null,
	ops_revised_time_end_estimate: null,
	ref_label: 'VST-TESTREF',
	pickup_datetime: '2026-04-28T12:00:00.000Z',
	customer_name: 'Alex Rider',
	customer_email: 'alex@example.com',
	linked_account_name: null,
	client_type: 'walk_in',
	origin_name: 'O.R. Tambo International Airport',
	destination_name: 'Sandton City',
}

describe('OpsTripsSplitBrowser (Story 17.13)', () => {
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

	it('opens detail from row via router', () => {
		render(
			<OpsTripsSplitBrowser
				trips={[baseTrip]}
				vehicles={[{ id: VEHICLE_ID, name: 'Shuttle A', primary_image_url: null }]}
				driverNameByProfileId={{ [DRIVER_ID]: 'Alex Driver' }}
				selectedTripId={null}
			/>,
		)
		expect(screen.getByRole('columnheader', { name: 'Reference' })).toBeTruthy()
		expect(screen.getByText('VST-TESTREF')).toBeTruthy()
		expect(screen.getByText('Alex Rider')).toBeTruthy()
		fireEvent.click(screen.getByTestId('ops-trips-row'))
		expect(mockPush).toHaveBeenCalledWith(`/ops/trips?id=${TRIP_ID}`, { scroll: false })
	})

	it('passes axe with detail rail open (lg)', async () => {
		const { container } = render(
			<OpsTripsSplitBrowser
				trips={[baseTrip]}
				vehicles={[{ id: VEHICLE_ID, name: 'Shuttle A', primary_image_url: null }]}
				driverNameByProfileId={{ [DRIVER_ID]: 'Alex Driver' }}
				selectedTripId={TRIP_ID}
			/>,
		)
		expect(await axe(container)).toHaveNoViolations()
	})
})
