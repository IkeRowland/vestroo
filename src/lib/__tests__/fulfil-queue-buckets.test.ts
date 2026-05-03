import {
	classifyFulfilBookingBucket,
	matchesPaidBucket,
	matchesPendingBucket,
	matchesTripRequestBucket,
	type FulfilBookingBucketInput,
	type FulfilQueueBucket,
} from '@/lib/fulfil-queue-buckets'

function row(p: Partial<FulfilBookingBucketInput> & Pick<FulfilBookingBucketInput, 'hasBookingTripLink'>): FulfilBookingBucketInput {
	return {
		booking_intent: p.booking_intent ?? null,
		status: p.status ?? null,
		payment_status: p.payment_status ?? null,
		hasBookingTripLink: p.hasBookingTripLink,
	}
}

describe('fulfil-queue-buckets exclusivity', () => {
	const grids: FulfilBookingBucketInput[] = []
	for (const intent of ['trip_request', 'point_to_point', null] as const) {
		for (const status of ['pending', 'paid', 'ready_to_assign', 'cancelled'] as const) {
			for (const payment of ['pending', 'paid', 'failed'] as const) {
				for (const linked of [false, true]) {
					grids.push(row({ booking_intent: intent, status, payment_status: payment, hasBookingTripLink: linked }))
				}
			}
		}
	}

	it('classifyFulfilBookingBucket matches paid-first ordering (paid excludes trip_request tab only when paid)', () => {
		for (const g of grids) {
			const expected: FulfilQueueBucket | null = matchesPaidBucket(g)
				? 'paid'
				: matchesTripRequestBucket(g)
					? 'trip_request'
					: matchesPendingBucket(g)
						? 'pending'
						: null
			expect(classifyFulfilBookingBucket(g)).toBe(expected)
		}
	})

	it('trip_request intent only matches trip_request bucket', () => {
		const r = row({
			booking_intent: 'trip_request',
			status: 'pending',
			payment_status: 'pending',
			hasBookingTripLink: false,
		})
		expect(matchesTripRequestBucket(r)).toBe(true)
		expect(matchesPaidBucket(r)).toBe(false)
		expect(matchesPendingBucket(r)).toBe(false)
	})

	it('trip_request + ready_to_assign + paid + unlinked matches paid assignment queue', () => {
		const r = row({
			booking_intent: 'trip_request',
			status: 'ready_to_assign',
			payment_status: 'paid',
			hasBookingTripLink: false,
		})
		expect(matchesPaidBucket(r)).toBe(true)
		expect(classifyFulfilBookingBucket(r)).toBe('paid')
	})

	it('trip_request + ready_to_assign + unpaid + unlinked stays trip_request, not paid', () => {
		const r = row({
			booking_intent: 'trip_request',
			status: 'ready_to_assign',
			payment_status: 'pending',
			hasBookingTripLink: false,
		})
		expect(matchesPaidBucket(r)).toBe(false)
		expect(classifyFulfilBookingBucket(r)).toBe('trip_request')
	})

	it('legacy paid+paid+unlinked non–trip_request is not assignment queue (awaits ready_to_assign)', () => {
		const r = row({
			booking_intent: 'point_to_point',
			status: 'paid',
			payment_status: 'paid',
			hasBookingTripLink: false,
		})
		expect(classifyFulfilBookingBucket(r)).toBe(null)
		expect(matchesPaidBucket(r)).toBe(false)
		expect(matchesPendingBucket(r)).toBe(false)
	})

	it('ready_to_assign+unlinked non–trip_request matches paid, not pending', () => {
		const r = row({
			booking_intent: 'point_to_point',
			status: 'ready_to_assign',
			payment_status: 'paid',
			hasBookingTripLink: false,
		})
		expect(classifyFulfilBookingBucket(r)).toBe('paid')
		expect(matchesPendingBucket(r)).toBe(false)
	})

	it('ready_to_assign+linked non–trip_request matches no fulfil bucket', () => {
		const r = row({
			booking_intent: 'hourly_hire',
			status: 'ready_to_assign',
			payment_status: 'paid',
			hasBookingTripLink: true,
		})
		expect(classifyFulfilBookingBucket(r)).toBe(null)
		expect(matchesPaidBucket(r)).toBe(false)
		expect(matchesPendingBucket(r)).toBe(false)
	})

	it('paid+paid+linked non–trip_request matches no primary bucket', () => {
		const r = row({
			booking_intent: 'hourly_hire',
			status: 'paid',
			payment_status: 'paid',
			hasBookingTripLink: true,
		})
		expect(classifyFulfilBookingBucket(r)).toBe(null)
	})

	it('pending payment matches pending bucket, not paid', () => {
		const r = row({
			booking_intent: 'point_to_point',
			status: 'pending',
			payment_status: 'paid',
			hasBookingTripLink: false,
		})
		expect(classifyFulfilBookingBucket(r)).toBe('pending')
		expect(matchesPaidBucket(r)).toBe(false)
	})
})
