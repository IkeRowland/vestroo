/**
 * Copy for `/ops/experiences` — NFR.17.8 (Story 17.17).
 */

export const opsExperiencesCopy = {
	pageTitle: 'Experiences',
	pageDescription:
		'Manage the public experience-package catalogue and review recent experience bookings.',
	filterContextAria: 'Experiences context',
	filterHint: 'Catalogue and bookings use the same ops freshness bar above.',

	packagesSectionTitle: 'Packages (catalogue)',
	bookingsSectionTitle: 'Experience bookings',
	packagesLoadErrorTitle: 'Experience packages could not be loaded',
	bookingsLoadErrorTitle: 'Experience bookings could not be loaded',

	bookingsTableCaption: 'Experience package bookings',
	confirmationLink: 'Confirmation',
	confirmationAria: (ref: string) => `Open confirmation for booking ${ref}`,
} as const
