/**
 * Copy for `/ops/compliance` — NFR.17.8 (Story 17.17).
 */

export const opsComplianceCopy = {
	pageTitle: 'Compliance',
	pageDescription: 'Track staff incidents and monitor fleet and driver document expiry.',
	filterContextAria: 'Compliance data context',
	filterHint: 'Data subject tools require admin role.',

	incidentsSectionTitle: 'Recent incidents',
	docsSectionTitle: (horizonDate: string, windowDays: number) =>
		`Compliance documents — expiry on or before ${horizonDate} (${windowDays}-day window, includes overdue)`,
	vehiclesSubheading: 'Vehicles',
	driversSubheading: 'Drivers',
	noneInWindow: 'None in this window.',

	vehicleDocsCaption: 'Vehicle compliance documents expiring within the configured horizon',
	driverDocsCaption: 'Driver compliance documents expiring within the configured horizon',

	dsrGateTitle: 'Data subject requests',
	dsrGateBody:
		'DSR export and anonymisation are limited to users with the admin role. Dispatchers can work with incidents and document lists above.',
} as const
