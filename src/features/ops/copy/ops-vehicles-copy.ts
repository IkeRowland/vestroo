/**
 * Copy for **`/ops/fleet/vehicles`** vehicles tab fleet UX (Story 17.12 / NFR.17.8).
 */
import { OPS_FLEET_DRIVERS_PATH } from '@/lib/ops-fleet-drivers-url'

export const opsVehiclesCopy = {
	pageTitle: 'Fleet',
	pageDescription:
		'Manage vehicles, plates, categories and operational status. Archive removes a vehicle from the public catalogue without deleting historical trips.',
	addVehicleSubtitle: 'Add a new vehicle to your fleet.',
	viewList: 'List',
	viewGrid: 'Grid',
	viewToggleGroupAria: 'Fleet layout',
	tableCaption: 'Fleet vehicles — list view',
	gridListAria: 'Fleet vehicles — grid view',
	rowOpenDetailAria: (name: string) => `Open details for ${name}`,
	cardOpenAria: (name: string) => `Open details for ${name}`,
	cardAssignAria: (name: string) => `Assign a driver to ${name} — opens Drivers`,
	openDetail: 'Open',
	assignToDriver: 'Assign to driver',
	detailHeroAlt: (name: string) => `${name} — primary photo`,
	/** Former “Status” — shows assigned driver. */
	detailDriverHeading: 'Driver',
	driverNotAssigned: 'Not assigned',
	detailSpecsHeading: 'Specifications',
	detailRemindersHeading: 'Reminders',
	detailRemindersPlaceholder:
		'Service reminders and compliance checks will appear here when that data is connected.',
	detailActivityHeading: 'Activity',
	detailActivityPlaceholder:
		'Trip activity for this vehicle will appear here when analytics are connected.',
	seatsLabel: 'Seats',
	transmissionLabel: 'Transmission',
	fuelLabel: 'Fuel',
	makeModelYear: (make: string, model: string, year: string) =>
		[make, model, year].filter(Boolean).join(' · ') || '—',
	/** Opens fleet **Drivers** tab to set default vehicle on a driver profile. */
	assignDriverHref: OPS_FLEET_DRIVERS_PATH,
} as const
