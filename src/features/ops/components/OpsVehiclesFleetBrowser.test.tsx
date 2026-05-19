/** @vitest-environment happy-dom */
import { fireEvent, render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

expect.extend(toHaveNoViolations)

import { OpsVehiclesFleetBrowser } from '@/features/ops/components/OpsVehiclesFleetBrowser'
import type { OpsFleetVehicleRow } from '@/features/ops/ops-fleet-types'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: mockPush }),
}))

const baseVehicle: OpsFleetVehicleRow = {
	id: 'v1111111-1111-4111-8111-111111111111',
	name: '2024 Test Sedan',
	license_plate: 'CA123GP',
	category_id: 'c1',
	is_fleet_active: true,
	operation_status: 'charging',
	vehicle_condition: 'available',
	make: 'Test',
	model: 'Sedan',
	model_year: 2024,
	mileage_km: 1000,
	color: 'Black',
	seats: 5,
	transmission: 'automatic',
	fuel_type: 'petrol',
	description: null,
	primary_image_url: null,
	gallery_image_urls: [],
	assigned_driver: null,
}

describe('OpsVehiclesFleetBrowser (Story 17.12)', () => {
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

	it('opens detail from list row via router', () => {
		render(
			<OpsVehiclesFleetBrowser
				vehicles={[baseVehicle]}
				categories={[{ id: 'c1', name: 'Sedan' }]}
				view="list"
				selectedVehicleId={null}
				onEditVehicle={vi.fn()}
				onRequestArchive={vi.fn()}
			/>,
		)
		const row = screen.getByTestId('ops-vehicles-fleet-row')
		fireEvent.click(row)
		expect(mockPush).toHaveBeenCalledWith(
			'/ops/fleet/vehicles?id=v1111111-1111-4111-8111-111111111111',
			{ scroll: false },
		)
	})

	it('passes axe with detail rail open (lg)', async () => {
		const { container } = render(
			<OpsVehiclesFleetBrowser
				vehicles={[baseVehicle]}
				categories={[{ id: 'c1', name: 'Sedan' }]}
				view="list"
				selectedVehicleId={baseVehicle.id}
				onEditVehicle={vi.fn()}
				onRequestArchive={vi.fn()}
			/>,
		)
		expect(await axe(container)).toHaveNoViolations()
	})
})
