/**
 * Copy for **`/ops/calendar`** (Story 17.14, **NFR.17.8**). Shuttle ops vocabulary (**NFR.17.7**).
 */
export const opsCalendarCopy = {
	pageTitle: 'Calendar',
	pageDescription:
		'Week view of scheduled trips with time-of-day context. Select an event for assignment summary.',
	emptyWeekTitle: 'No trips this week',
	emptyWeekDescription: 'Trips that fall in the selected week appear here.',
	viewToggleGroupAria: 'Calendar layout',
	viewWeek: 'Week grid',
	viewList: 'Agenda list',
	prevWeekAria: 'Previous week',
	nextWeekAria: 'Next week',
	thisWeek: 'This week',
	gridRegionAria: 'Week calendar, trips as timed events',
	listRegionAria: 'Agenda list for this week',
	eventOpenDetailAria: (title: string) => `Open details: ${title}`,
	detailRailTitle: 'Trip details',
	sectionSchedule: 'Schedule',
	sectionVehicle: 'Vehicle',
	sectionClient: 'Client / booking',
	sectionDriver: 'Driver',
	sectionNotes: 'Notes',
	noNotes: 'No notes on this trip.',
	serviceTypeLabel: 'Service type',
	openTripsPage: 'Open in Trips',
} as const
