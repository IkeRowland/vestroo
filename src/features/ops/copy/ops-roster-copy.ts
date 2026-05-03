/**
 * Copy for **`/ops/roster`** (Story 17.15, **NFR.17.8**). Shuttle / driver ops vocabulary (**NFR.17.7**).
 */
export const opsRosterCopy = {
	pageTitle: 'Roster',
	pageDescription:
		'Driver shifts in a week or month view. Select a shift for coverage context, or a driver profile when linked from the schedule.',
	viewToggleAria: 'Roster calendar layout',
	viewWeek: 'Week',
	viewMonth: 'Month',
	prevWeekAria: 'Previous week',
	nextWeekAria: 'Next week',
	thisWeek: 'This week',
	prevMonthAria: 'Previous month',
	nextMonthAria: 'Next month',
	thisMonth: 'This month',
	emptyShiftsTitle: 'No shifts in this range',
	emptyShiftsDescription: 'Upcoming driver shifts for the selected week or month appear here.',
	detailDriverTitle: 'Driver',
	detailShiftTitle: 'Shift',
	sectionProfile: 'Profile',
	sectionScheduleRow: 'Schedule',
	sectionVehicle: 'Vehicle',
	sectionNotes: 'Changes',
	readOnlyShiftNote:
		'Editing roster rows is not available in this view. Use your operations scheduling workflow or database tools where permitted.',
	noPhone: 'No phone on file',
	selectShiftHint: 'Select a shift on the calendar to see run details.',
	shiftsForDriverHeading: 'Shifts in this range',
	gridMonthAria: 'Month calendar, driver shifts as chips',
	moreShiftsLabel: (n: number) => `+${n} more`,
	showLess: 'Show less',
	expandDayShiftsAria: (ymd: string, n: number) => `Show ${n} more shifts for ${ymd}`,
	collapseDayShiftsAria: (ymd: string) => `Collapse extra shifts for ${ymd}`,
} as const
