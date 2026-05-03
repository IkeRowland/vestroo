import {
	buildTelHref,
	maskCustomerPhoneForDisplay,
	tripStatusAllowsCustomerContact,
} from '@/lib/field-customer-contact'
import type { TripFulfilmentStatusDb } from '@/types/database.types'

import type { RiderTrackLivePositionDto } from './fetch-rider-track-live-position'
import { deriveRiderTrackMilestones, type RiderTrackMilestoneUi } from './milestones'
import { maskVehiclePlateForRiderDisplay } from './mask-plate'

export type PublicRiderTrackDto = {
	status: TripFulfilmentStatusDb
	serviceTypeLabel: string
	milestones: RiderTrackMilestoneUi[]
	driverFirstName: string | null
	vehicleLine: string
	plateMasked: string | null
	driverAvatarUrl: string | null
	showCallDriver: boolean
	callDriverMaskedPhone: string | null
	callDriverTelHref: string | null
	cancelled: boolean
	/**
	 * Latest position for read-only map — only populated server-side when Q22 gates + `en_route`.
	 * `null` on completed / other statuses or when opt-in off (no placeholder UI).
	 */
	livePosition: RiderTrackLivePositionDto | null
}

function parseTripStatus(raw: string): TripFulfilmentStatusDb {
	if (
		raw === 'booking' ||
		raw === 'assigned' ||
		raw === 'en_route' ||
		raw === 'completed' ||
		raw === 'cancelled'
	) {
		return raw
	}
	return 'booking'
}

export function driverFirstNameFromFullName(fullName: string | null): string | null {
	if (fullName == null || fullName.trim() === '') return null
	const first = fullName.trim().split(/\s+/)[0]
	return first ?? null
}

export function buildPublicRiderTrackDto(input: {
	status: string
	serviceType: string | null
	createdAtIso: string
	timeStartEstimateIso: string | null
	timeEndEstimateIso: string | null
	vehicleName: string | null
	licensePlate: string | null
	driverFullName: string | null
	driverPhone: string | null
	driverAvatarUrl: string | null
	livePosition?: RiderTrackLivePositionDto | null
}): PublicRiderTrackDto {
	const status = parseTripStatus(input.status)
	const allowCall = tripStatusAllowsCustomerContact(status) && status !== 'cancelled'
	const rawPhone = input.driverPhone?.trim() ? input.driverPhone : null
	const showCallDriver = allowCall && Boolean(rawPhone)
	const callDriverMaskedPhone = showCallDriver ? maskCustomerPhoneForDisplay(rawPhone) : null
	const callDriverTelHref = showCallDriver ? buildTelHref(rawPhone) : null

	const vehicleLine =
		input.vehicleName != null && input.vehicleName.trim() !== ''
			? input.vehicleName.trim()
			: 'Vehicle'

	const livePosition =
		status === 'en_route' && input.livePosition != null ? input.livePosition : null

	return {
		status,
		cancelled: status === 'cancelled',
		serviceTypeLabel: (input.serviceType ?? 'Trip').trim() || 'Trip',
		milestones: deriveRiderTrackMilestones({
			status,
			createdAtIso: input.createdAtIso,
			timeStartEstimateIso: input.timeStartEstimateIso,
			timeEndEstimateIso: input.timeEndEstimateIso,
		}),
		driverFirstName: driverFirstNameFromFullName(input.driverFullName),
		vehicleLine,
		plateMasked: maskVehiclePlateForRiderDisplay(input.licensePlate),
		driverAvatarUrl:
			input.driverAvatarUrl != null && input.driverAvatarUrl.trim() !== ''
				? input.driverAvatarUrl.trim()
				: null,
		showCallDriver: Boolean(showCallDriver && callDriverTelHref && callDriverMaskedPhone),
		callDriverMaskedPhone: showCallDriver ? callDriverMaskedPhone : null,
		callDriverTelHref: showCallDriver ? callDriverTelHref : null,
		livePosition,
	}
}
