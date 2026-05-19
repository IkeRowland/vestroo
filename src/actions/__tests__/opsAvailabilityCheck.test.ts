import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getOpsStaffForAction = vi.hoisted(() => vi.fn())
const createUserServerClient = vi.hoisted(() => vi.fn())
const appendOpsAuditLog = vi.hoisted(() => vi.fn())
const redirectMock = vi.hoisted(() => vi.fn(() => undefined))
const revalidatePathMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/ops-auth', () => ({
	getOpsStaffForAction,
}))

vi.mock('@/lib/supabase/server', () => ({
	createUserServerClient,
}))

vi.mock('@/lib/ops-audit', () => ({
	appendOpsAuditLog,
}))

vi.mock('next/cache', () => ({
	revalidatePath: revalidatePathMock,
}))

vi.mock('next/navigation', () => ({
	redirect: redirectMock,
}))

import { RATIONALE_MAX_LENGTH } from '@/lib/ops-availability-check-input'

import { submitAvailabilityCheckAction } from '../opsAvailabilityCheck'

const BOOKING_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const STAFF_USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
const VEHICLE_A = 'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1'
const VEHICLE_B = 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2'
const DRIVER_A = 'dddddd11-dddd-4ddd-8ddd-ddddddddddd1'
const DRIVER_B = 'dddddd22-dddd-4ddd-8ddd-ddddddddddd2'

type BookingFixture = {
	id: string
	client_type: 'walk_in' | 'account_client'
	pickup_datetime: string | null
	estimated_duration: number | null
	passenger_count: number | null
}

type TripRow = {
	id: string
	vehicle_id?: string | null
	chauffeur_id?: string | null
	time_start_estimate: string
	time_end_estimate: string
	status: string | null
}

type ChauffeurAssignmentRow = {
	id: string
	chauffeur_id: string
	start_time: string
	end_time: string
	status: string | null
}

type Mocks = {
	booking: BookingFixture | null
	bookingError?: { message: string } | null
	tripsByVehicle?: TripRow[]
	tripsByDriver?: TripRow[]
	assignmentsByDriver?: ChauffeurAssignmentRow[]
	tripsError?: { message: string } | null
	vehicleProfile?: { id: string; is_fleet_active?: boolean } | null
	vehicleProfileError?: { message: string } | null
	driverProfile?: { id: string; role: string; status: string } | null
	driverProfileError?: { message: string } | null
	updateError?: { message: string } | null
	updateRowExists?: boolean
	captures: {
		bookingUpdate?: Record<string, unknown>
		bookingUpdateFilters: Array<{ column: string; value: unknown }>
		tripsByVehicleQuery?: { in?: { column: string; values: unknown[] }; range?: { lt: string; gt: string } }
		tripsByDriverQuery?: { in?: { column: string; values: unknown[] }; range?: { lt: string; gt: string } }
		assignmentsQuery?: { in?: { column: string; values: unknown[] }; range?: { lt: string; gt: string } }
	}
}

function buildSupabaseMock(state: Mocks) {
	state.captures.bookingUpdateFilters = []

	function bookingsTable() {
		return {
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					maybeSingle: vi.fn().mockResolvedValue({
						data: state.booking,
						error: state.bookingError ?? null,
					}),
				})),
			})),
			update: vi.fn((payload: Record<string, unknown>) => {
				state.captures.bookingUpdate = payload
				const builder: Record<string, unknown> = {}
				const eq = vi.fn((column: string, value: unknown) => {
					state.captures.bookingUpdateFilters.push({ column, value })
					return builder
				})
				const select = vi.fn(() => ({
					maybeSingle: vi.fn().mockResolvedValue(
						state.updateError
							? { data: null, error: state.updateError }
							: state.updateRowExists === false
								? { data: null, error: null }
								: { data: { id: state.booking?.id ?? BOOKING_ID }, error: null },
					),
				}))
				builder.eq = eq
				builder.select = select
				return builder
			}),
		}
	}

	function tripsTable() {
		return {
			select: vi.fn((cols: string) => {
				const isVehicleQuery = cols.includes('vehicle_id') && !cols.includes('chauffeur_id')
				const isDriverQuery = cols.includes('chauffeur_id')
				const builder: Record<string, unknown> = {}
				const inFn = vi.fn((column: string, values: unknown[]) => {
					if (isVehicleQuery) {
						state.captures.tripsByVehicleQuery = {
							...(state.captures.tripsByVehicleQuery ?? {}),
							in: { column, values },
						}
					} else if (isDriverQuery) {
						state.captures.tripsByDriverQuery = {
							...(state.captures.tripsByDriverQuery ?? {}),
							in: { column, values },
						}
					}
					return builder
				})
				const lt = vi.fn((_col: string, val: string) => {
					if (isVehicleQuery) {
						state.captures.tripsByVehicleQuery = {
							...(state.captures.tripsByVehicleQuery ?? {}),
							range: { ...(state.captures.tripsByVehicleQuery?.range ?? { lt: '', gt: '' }), lt: val },
						}
					} else if (isDriverQuery) {
						state.captures.tripsByDriverQuery = {
							...(state.captures.tripsByDriverQuery ?? {}),
							range: { ...(state.captures.tripsByDriverQuery?.range ?? { lt: '', gt: '' }), lt: val },
						}
					}
					return builder
				})
				const gt = vi.fn((_col: string, val: string) => {
					if (isVehicleQuery) {
						state.captures.tripsByVehicleQuery = {
							...(state.captures.tripsByVehicleQuery ?? {}),
							range: { ...(state.captures.tripsByVehicleQuery?.range ?? { lt: '', gt: '' }), gt: val },
						}
					} else if (isDriverQuery) {
						state.captures.tripsByDriverQuery = {
							...(state.captures.tripsByDriverQuery ?? {}),
							range: { ...(state.captures.tripsByDriverQuery?.range ?? { lt: '', gt: '' }), gt: val },
						}
					}
					return Promise.resolve({
						data: state.tripsError
							? null
							: isVehicleQuery
								? state.tripsByVehicle ?? []
								: state.tripsByDriver ?? [],
						error: state.tripsError ?? null,
					})
				})
				builder.in = inFn
				builder.lt = lt
				builder.gt = gt
				return builder
			}),
		}
	}

	function chauffeurAssignmentsTable() {
		return {
			select: vi.fn(() => {
				const builder: Record<string, unknown> = {}
				const inFn = vi.fn((column: string, values: unknown[]) => {
					state.captures.assignmentsQuery = {
						...(state.captures.assignmentsQuery ?? {}),
						in: { column, values },
					}
					return builder
				})
				const lt = vi.fn((_col: string, val: string) => {
					state.captures.assignmentsQuery = {
						...(state.captures.assignmentsQuery ?? {}),
						range: { ...(state.captures.assignmentsQuery?.range ?? { lt: '', gt: '' }), lt: val },
					}
					return builder
				})
				const gt = vi.fn((_col: string, val: string) => {
					state.captures.assignmentsQuery = {
						...(state.captures.assignmentsQuery ?? {}),
						range: { ...(state.captures.assignmentsQuery?.range ?? { lt: '', gt: '' }), gt: val },
					}
					return Promise.resolve({
						data: state.tripsError ? null : state.assignmentsByDriver ?? [],
						error: state.tripsError ?? null,
					})
				})
				builder.in = inFn
				builder.lt = lt
				builder.gt = gt
				return builder
			}),
		}
	}

	function vehiclesTable() {
		return {
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					maybeSingle: vi.fn().mockResolvedValue({
						data: state.vehicleProfile ?? null,
						error: state.vehicleProfileError ?? null,
					}),
				})),
			})),
		}
	}

	function profilesTable() {
		return {
			select: vi.fn(() => ({
				eq: vi.fn(() => ({
					maybeSingle: vi.fn().mockResolvedValue({
						data: state.driverProfile ?? null,
						error: state.driverProfileError ?? null,
					}),
				})),
			})),
		}
	}

	const from = vi.fn((table: string) => {
		switch (table) {
			case 'bookings':
				return bookingsTable()
			case 'trips':
				return tripsTable()
			case 'chauffeur_assignments':
				return chauffeurAssignmentsTable()
			case 'vehicles':
				return vehiclesTable()
			case 'profiles':
				return profilesTable()
			default:
				throw new Error(`unexpected table ${table}`)
		}
	})

	return { from }
}

const PICKUP_ISO = '2026-04-30T10:00:00.000Z'

function makeBooking(overrides: Partial<BookingFixture> = {}): BookingFixture {
	return {
		id: BOOKING_ID,
		client_type: 'walk_in',
		pickup_datetime: PICKUP_ISO,
		estimated_duration: 60,
		passenger_count: 2,
		...overrides,
	}
}

function staffSession(role: 'dispatcher' | 'admin' = 'dispatcher') {
	return {
		ok: true as const,
		session: { userId: STAFF_USER_ID, role, email: 'ops@example.com' },
	}
}

function validInput(overrides: Partial<Parameters<typeof submitAvailabilityCheckAction>[0]> = {}) {
	return {
		bookingId: BOOKING_ID,
		scope: 'walk_in' as const,
		selectedVehicleId: VEHICLE_A,
		selectedDriverId: DRIVER_A,
		candidatesConsidered: {
			vehicleIds: [VEHICLE_A, VEHICLE_B],
			driverIds: [DRIVER_A, DRIVER_B],
		},
		...overrides,
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	appendOpsAuditLog.mockResolvedValue({ ok: true })
})

afterEach(() => {
	vi.useRealTimers()
})

describe('submitAvailabilityCheckAction — validation + auth', () => {
	it('rejects malformed payload', async () => {
		const res = await submitAvailabilityCheckAction({ bookingId: 'not-a-uuid' })
		expect(res).toBeDefined()
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('VALIDATION')
		} else {
			throw new Error('expected failure')
		}
	})

	it('rejects rationale longer than RATIONALE_MAX_LENGTH', async () => {
		const longRationale = 'x'.repeat(RATIONALE_MAX_LENGTH + 1)
		const res = await submitAvailabilityCheckAction(validInput({ rationale: longRationale }))
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('VALIDATION')
		} else {
			throw new Error('expected failure')
		}
		expect(getOpsStaffForAction).not.toHaveBeenCalled()
	})

	it('rejects when caller is not staff', async () => {
		getOpsStaffForAction.mockResolvedValue({ ok: false, message: 'Forbidden' })
		const res = await submitAvailabilityCheckAction(validInput())
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('FORBIDDEN')
		} else {
			throw new Error('expected failure')
		}
		expect(createUserServerClient).not.toHaveBeenCalled()
	})

	it('rejects when selectedVehicleId is not in candidates_considered', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = { booking: makeBooking(), captures: { bookingUpdateFilters: [] } }
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))
		const res = await submitAvailabilityCheckAction(
			validInput({
				selectedVehicleId: '99999999-9999-4999-8999-999999999999',
			}),
		)
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('SELECTED_VEHICLE_NOT_CONSIDERED')
		} else {
			throw new Error('expected failure')
		}
		expect(state.captures.bookingUpdate).toBeUndefined()
	})

	it('rejects when selectedDriverId is not in candidates_considered', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = { booking: makeBooking(), captures: { bookingUpdateFilters: [] } }
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))
		const res = await submitAvailabilityCheckAction(
			validInput({
				selectedDriverId: '88888888-8888-4888-8888-888888888888',
			}),
		)
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('SELECTED_DRIVER_NOT_CONSIDERED')
		} else {
			throw new Error('expected failure')
		}
		expect(state.captures.bookingUpdate).toBeUndefined()
	})

	it('returns NOT_FOUND when booking row missing', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = { booking: null, captures: { bookingUpdateFilters: [] } }
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))
		const res = await submitAvailabilityCheckAction(validInput())
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('NOT_FOUND')
		} else {
			throw new Error('expected failure')
		}
	})

	it('returns INVALID_CLIENT_TYPE when route scope mismatches booking client_type', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeBooking({ client_type: 'account_client' }),
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))
		const res = await submitAvailabilityCheckAction(validInput())
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('INVALID_CLIENT_TYPE')
		} else {
			throw new Error('expected failure')
		}
	})

	it('returns MISSING_PICKUP_WINDOW when booking has no pickup', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeBooking({ pickup_datetime: null }),
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))
		const res = await submitAvailabilityCheckAction(validInput())
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('MISSING_PICKUP_WINDOW')
		} else {
			throw new Error('expected failure')
		}
	})
})

describe('submitAvailabilityCheckAction — conflict / rationale rule', () => {
	it('requires rationale when any considered vehicle has an overlapping trip', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeBooking(),
			tripsByVehicle: [
				{
					id: 'trip-1',
					vehicle_id: VEHICLE_B,
					time_start_estimate: '2026-04-30T09:30:00.000Z',
					time_end_estimate: '2026-04-30T10:30:00.000Z',
					status: 'confirmed',
				},
			],
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await submitAvailabilityCheckAction(validInput())
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('RATIONALE_REQUIRED')
		} else {
			throw new Error('expected failure')
		}
		expect(state.captures.bookingUpdate).toBeUndefined()
		expect(appendOpsAuditLog).not.toHaveBeenCalled()
	})

	it('requires rationale when any considered driver has an overlapping chauffeur_assignment', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeBooking(),
			assignmentsByDriver: [
				{
					id: 'asg-1',
					chauffeur_id: DRIVER_A,
					start_time: '2026-04-30T09:00:00.000Z',
					end_time: '2026-04-30T11:00:00.000Z',
					status: 'scheduled',
				},
			],
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await submitAvailabilityCheckAction(validInput())
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('RATIONALE_REQUIRED')
		} else {
			throw new Error('expected failure')
		}
	})

	it('does NOT require rationale when overlapping commitments are cancelled (terminal)', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeBooking(),
			tripsByVehicle: [
				{
					id: 'trip-1',
					vehicle_id: VEHICLE_B,
					time_start_estimate: '2026-04-30T09:30:00.000Z',
					time_end_estimate: '2026-04-30T10:30:00.000Z',
					status: 'cancelled',
				},
			],
			vehicleProfile: { id: VEHICLE_A, is_fleet_active: true },
			driverProfile: { id: DRIVER_A, role: 'chauffeur', status: 'active' },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		await submitAvailabilityCheckAction(validInput())
		expect(state.captures.bookingUpdate).toBeDefined()
		expect(redirectMock).toHaveBeenCalledWith(`/ops/bookings/${BOOKING_ID}`)
	})
})

describe('submitAvailabilityCheckAction — happy path', () => {
	it('persists snake_case snapshot, audits, revalidates, and redirects (no conflicts)', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeBooking(),
			vehicleProfile: { id: VEHICLE_A, is_fleet_active: true },
			driverProfile: { id: DRIVER_A, role: 'chauffeur', status: 'active' },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		await submitAvailabilityCheckAction(validInput())

		const update = state.captures.bookingUpdate as
			| { availability_check?: Record<string, unknown>; availability_checked_at?: string; availability_checked_by?: string }
			| undefined
		expect(update?.availability_checked_at).toEqual(expect.any(String))
		expect(update?.availability_checked_by).toEqual(STAFF_USER_ID)
		const snapshot = update?.availability_check as Record<string, unknown>
		expect(snapshot).toMatchObject({
			selected_vehicle_id: VEHICLE_A,
			selected_driver_id: DRIVER_A,
			candidates_considered: {
				vehicle_ids: [VEHICLE_A, VEHICLE_B],
				driver_ids: [DRIVER_A, DRIVER_B],
			},
			rationale: null,
			has_conflict: false,
		})
		expect(snapshot.window).toMatchObject({
			start: expect.any(String),
			end: expect.any(String),
		})

		expect(state.captures.bookingUpdateFilters).toEqual(
			expect.arrayContaining([
				{ column: 'id', value: BOOKING_ID },
				{ column: 'client_type', value: 'walk_in' },
			]),
		)

		expect(appendOpsAuditLog).toHaveBeenCalledTimes(1)
		const auditCall = appendOpsAuditLog.mock.calls[0][1]
		expect(auditCall.action).toBe('submit_availability_check')
		expect(auditCall.entity).toBe('booking')
		expect(auditCall.entityId).toBe(BOOKING_ID)
		expect(auditCall.actorRole).toBe('dispatcher')
		expect(auditCall.payload).toMatchObject({
			selected_vehicle_id: VEHICLE_A,
			selected_driver_id: DRIVER_A,
			has_conflict: false,
			client_type: 'walk_in',
		})

		expect(revalidatePathMock).toHaveBeenCalledWith(`/ops/bookings/${BOOKING_ID}`)
		expect(revalidatePathMock).toHaveBeenCalledWith('/ops/bookings')

		expect(redirectMock).toHaveBeenCalledWith(`/ops/bookings/${BOOKING_ID}`)
	})

	it('persists rationale on snapshot when conflicts exist and rationale is provided', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession('admin'))
		const state: Mocks = {
			booking: makeBooking({ client_type: 'account_client' }),
			tripsByVehicle: [
				{
					id: 'trip-1',
					vehicle_id: VEHICLE_A,
					time_start_estimate: '2026-04-30T09:30:00.000Z',
					time_end_estimate: '2026-04-30T10:30:00.000Z',
					status: 'confirmed',
				},
			],
			vehicleProfile: { id: VEHICLE_A, is_fleet_active: true },
			driverProfile: { id: DRIVER_A, role: 'chauffeur', status: 'active' },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const rationale = 'Customer needs same vehicle as outbound trip; coordinated with assigned driver.'
		await submitAvailabilityCheckAction(
			validInput({
				scope: 'account_client',
				rationale,
			}),
		)

		const update = state.captures.bookingUpdate as { availability_check: Record<string, unknown> }
		expect(update.availability_check).toMatchObject({
			rationale,
			has_conflict: true,
		})

		const auditCall = appendOpsAuditLog.mock.calls[0][1]
		expect(auditCall.actorRole).toBe('admin')
		expect(auditCall.payload).toMatchObject({
			rationale,
			has_conflict: true,
			client_type: 'account_client',
		})

		expect(revalidatePathMock).toHaveBeenCalledWith('/ops/bookings')
		expect(revalidatePathMock).toHaveBeenCalledWith(`/ops/bookings/${BOOKING_ID}`)
	})

	it('returns INVALID_VEHICLE when selected vehicle row cannot be verified', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeBooking(),
			vehicleProfile: null,
			driverProfile: { id: DRIVER_A, role: 'chauffeur', status: 'active' },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await submitAvailabilityCheckAction(validInput())
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('INVALID_VEHICLE')
		} else {
			throw new Error('expected failure')
		}
	})

	it('returns INVALID_DRIVER when selected driver is not an active chauffeur profile', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeBooking(),
			vehicleProfile: { id: VEHICLE_A, is_fleet_active: true },
			driverProfile: { id: DRIVER_A, role: 'customer', status: 'active' },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await submitAvailabilityCheckAction(validInput())
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('INVALID_DRIVER')
		} else {
			throw new Error('expected failure')
		}
	})

	it('returns DATABASE when booking update fails', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeBooking(),
			vehicleProfile: { id: VEHICLE_A, is_fleet_active: true },
			driverProfile: { id: DRIVER_A, role: 'chauffeur', status: 'active' },
			updateError: { message: 'permission denied' },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await submitAvailabilityCheckAction(validInput())
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('DATABASE')
		} else {
			throw new Error('expected failure')
		}
		expect(appendOpsAuditLog).not.toHaveBeenCalled()
	})

	it('returns AUDIT when audit log append fails', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		appendOpsAuditLog.mockResolvedValue({ ok: false, message: 'audit failed' })
		const state: Mocks = {
			booking: makeBooking(),
			vehicleProfile: { id: VEHICLE_A, is_fleet_active: true },
			driverProfile: { id: DRIVER_A, role: 'chauffeur', status: 'active' },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await submitAvailabilityCheckAction(validInput())
		if (res && 'ok' in res && res.ok === false) {
			expect(res.error.code).toBe('AUDIT')
		} else {
			throw new Error('expected failure')
		}
	})
})
