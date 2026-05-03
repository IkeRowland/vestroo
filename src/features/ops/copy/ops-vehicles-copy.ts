/**
 * Copy for **`/ops/vehicles`** fleet UX (Story 17.12 / NFR.17.8).
 */
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
	cardAssignAria: (name: string) => `Assign a trip involving ${name} — opens Fulfil`,
	openDetail: 'Open',
	assignToTrip: 'Assign to trip',
	detailHeroAlt: (name: string) => `${name} — primary photo`,
	detailStatusHeading: 'Status',
	detailSpecsHeading: 'Specifications',
	detailRemindersHeading: 'Reminders',
	detailRemindersPlaceholder:
		'Service reminders and compliance checks will appear here when that data is connected.',
	detailActivityHeading: 'Activity',
	detailActivityPlaceholder:
		'Trip activity for this vehicle will appear here when analytics are connected.',
	operationStatusLabel: 'Operation status',
	activeTripsLabel: 'Active trips',
	seatsLabel: 'Seats',
	transmissionLabel: 'Transmission',
	fuelLabel: 'Fuel',
	makeModelYear: (make: string, model: string, year: string) =>
		[make, model, year].filter(Boolean).join(' · ') || '—',
	fulfilAssignHref: '/ops/trips',
} as const
