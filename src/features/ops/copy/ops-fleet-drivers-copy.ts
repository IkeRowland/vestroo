/**
 * Copy for **`/ops/fleet/drivers`** (Story 17.15, **NFR.17.8**). Shuttle / driver ops vocabulary (**NFR.17.7**).
 */
import type { FleetDriverShiftStatus, FleetDriverTripStatus } from '@/features/ops/lib/ops-fleet-drivers-availability'

export const opsFleetDriversCopy = {
	pageTitle: 'Drivers',
	pageDescription:
		'Drivers with assigned trips in the week or month calendar. Select a trip for details or a driver to edit profile.',
	driversCalendarHint:
		'Calendar shows trips in the selected period (same data model as Trips / Calendar). Driver shift templates from removed service runs are not shown here.',
	viewToggleAria: 'Drivers calendar layout',
	driversViewToggleAria: 'Driver list layout',
	viewList: 'List',
	viewGrid: 'Grid',
	driversTableCaption: 'Drivers',
	columnActions: 'Actions',
	activeTripsColumn: 'Active trips',
	columnTripStatus: 'Trip status',
	columnShiftStatus: 'Shift status',
	driverAvailabilityIdle: 'Idle',
	driverAvailabilityBusy: 'Busy',
	driverAvailabilityUnavailable: 'Unavailable',
	shiftStatusActive: 'Active',
	shiftStatusInactive: 'Inactive',
	driversGridRegionAria: 'Drivers, card grid',
	driversSectionHeading: 'Drivers',
	driverRowOpenDetailAria: (name: string) => `Open driver details for ${name}`,
	openDriverDetail: 'Open',
	viewWeek: 'Week',
	viewMonth: 'Month',
	prevWeekAria: 'Previous week',
	nextWeekAria: 'Next week',
	thisWeek: 'This week',
	prevMonthAria: 'Previous month',
	nextMonthAria: 'Next month',
	thisMonth: 'This month',
	emptyTripsTitle: 'No trips in this range',
	emptyTripsDescription: 'Trips with pickup times in the selected week or month appear on the calendar.',
	detailDriverTitle: 'Driver',
	sectionProfile: 'Profile',
	sectionVehicle: 'Vehicle',
	noPhone: 'No phone on file',
	detailTripStatusHeading: 'Trip status',
	detailShiftStatusHeading: 'Shift status',
	sectionDefaultVehicle: 'Default vehicle',
	noDefaultVehicleAssigned: 'No default vehicle — set one when editing the driver.',
	fieldFullName: 'Full name',
	fieldPhone: 'Phone',
	fieldShiftStatus: 'Shift status',
	fieldEmail: 'Email',
	fieldDefaultVehicle: 'Default vehicle',
	noDefaultVehicle: 'None',
	defaultVehicleHint:
		'Used automatically when you assign a trip to this driver without picking a different vehicle.',
	editDriver: 'Edit',
	saveDriver: 'Save',
	cancelEdit: 'Cancel',
	archiveDriver: 'Archive',
	archiveDriverTitle: 'Archive this driver?',
	archiveDriverDescription:
		'The driver will be set to inactive and will disappear from active dispatch lists. Existing trips are unchanged.',
	assignDriverToTrip: 'Assign to trip',
	driverSaved: 'Driver updated.',
	driverPhotoHeading: 'Photo',
	driverPhotoAdd: 'Add photo',
	driverPhotoReplace: 'Replace photo',
	driverPhotoRemove: 'Remove photo',
	driverPhotoInputAria: 'Choose driver photo',
	driverPhotoBusy: 'Saving…',
	driverPhotoError: 'Could not update photo.',
	driverPhotoRemoved: 'Photo removed.',
	driverPhotoSaved: 'Photo updated.',
	driverPhotoAlignment: 'Photo alignment',
	driverPhotoAlignmentHint:
		'Choose which part of the image stays in view inside the circle (list, grid, and detail).',
	gridMonthAria: 'Month calendar, trips as chips',
	moreShiftsLabel: (n: number) => `+${n} more`,
	showLess: 'Show less',
	expandDayShiftsAria: (ymd: string, n: number) => `Show ${n} more shifts for ${ymd}`,
	collapseDayShiftsAria: (ymd: string) => `Collapse extra shifts for ${ymd}`,
} as const

/** Label for fleet drivers **Trip status** column. */
export function fleetDriverTripStatusLabel(a: FleetDriverTripStatus): string {
	switch (a) {
		case 'idle':
			return opsFleetDriversCopy.driverAvailabilityIdle
		case 'busy':
			return opsFleetDriversCopy.driverAvailabilityBusy
		case 'unavailable':
			return opsFleetDriversCopy.driverAvailabilityUnavailable
	}
}

/** Label for fleet drivers **Shift status** column (profile active / inactive). */
export function fleetDriverShiftStatusLabel(a: FleetDriverShiftStatus): string {
	return a === 'active' ? opsFleetDriversCopy.shiftStatusActive : opsFleetDriversCopy.shiftStatusInactive
}

/** Human label for **`profiles.avatar_object_position`** (fleet drivers UI). */
export function opsFleetDriverAvatarPositionLabel(pos: string): string {
	switch (pos) {
		case 'center':
			return 'Center'
		case 'top':
			return 'Top'
		case 'bottom':
			return 'Bottom'
		case 'left':
			return 'Left'
		case 'right':
			return 'Right'
		case 'top left':
			return 'Top left'
		case 'top right':
			return 'Top right'
		case 'bottom left':
			return 'Bottom left'
		case 'bottom right':
			return 'Bottom right'
		default:
			return 'Center'
	}
}
