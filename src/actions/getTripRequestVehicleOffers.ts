'use server'

import {
	classificationFromFleetCategoryName,
	tripOfferVehicleSchema,
	type TripOfferVehicle,
} from '@/features/booking/components/trip-request/trip-offer-vehicle'
import { fetchCatalogVehiclesForTripRequest } from '@/lib/trip-request-vehicle-catalog'

function mapCatalogRowToTripOffer(row: {
	id: string
	name: string
	description: string
	passengerCapacity: number
	imageUrl: string | null
}): TripOfferVehicle | null {
	if (row.passengerCapacity < 1) return null
	const headline = row.description.trim() || row.name.trim() || 'Vehicle class'
	const candidate: TripOfferVehicle = {
		id: row.id,
		name: headline,
		classification: classificationFromFleetCategoryName(row.name, row.passengerCapacity),
		passengerCapacity: row.passengerCapacity,
		luggageCapacityLabel: `${Math.max(0, Math.floor(row.passengerCapacity / 2))} suitcases (capacity guide)`,
		imageUrl: row.imageUrl?.trim() ? row.imageUrl : null,
	}
	return tripOfferVehicleSchema.parse(candidate)
}

export type GetTripRequestVehicleOffersInput = {
	/** Minimum seats required (from Slide 1 passengers). */
	minPassengers: number
}

export async function getTripRequestVehicleOffers(
	input: GetTripRequestVehicleOffersInput,
): Promise<
	{ ok: true; vehicles: TripOfferVehicle[] } | { ok: false; error: string }
> {
	try {
		const min = Math.max(1, Math.min(20, Math.floor(Number(input.minPassengers)) || 1))
		const rows = await fetchCatalogVehiclesForTripRequest(min)
		const vehicles = rows
			.map((r) =>
				mapCatalogRowToTripOffer({
					id: r.id,
					name: r.name,
					description: r.description,
					passengerCapacity: r.passengerCapacity,
					imageUrl: r.imageUrl,
				}),
			)
			.filter((v): v is TripOfferVehicle => v !== null)
		return { ok: true, vehicles }
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Unable to load vehicle classes'
		return { ok: false, error: msg }
	}
}
