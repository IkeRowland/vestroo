import { describe, it, expect, vi, beforeEach } from 'vitest'

const getOpsStaffForAction = vi.hoisted(() => vi.fn())
const createUserServerClient = vi.hoisted(() => vi.fn())
const appendOpsAuditLog = vi.hoisted(() => vi.fn())
const suggestVehiclesForBooking = vi.hoisted(() => vi.fn())
const isDispatchSuggestionsEnabled = vi.hoisted(() => vi.fn())

vi.mock('@/lib/ops-auth', () => ({
	getOpsStaffForAction,
}))

vi.mock('@/lib/supabase/server', () => ({
	createUserServerClient,
}))

vi.mock('@/lib/ops-audit', () => ({
	appendOpsAuditLog,
}))

vi.mock('@/lib/dispatch-suggestions', () => ({
	suggestVehiclesForBooking,
}))

vi.mock('@/lib/dispatch-suggestions-env', () => ({
	isDispatchSuggestionsEnabled,
}))

vi.mock('@/lib/dispatch-suggestions-supabase-deps', () => ({
	createDispatchSuggestionsDeps: vi.fn(() => ({})),
}))

vi.mock('next/cache', () => ({
	revalidatePath: vi.fn(),
}))

vi.mock('@/lib/operational-notifications', () => ({
	buildAssignmentNotifications: vi.fn(() => []),
	insertOperationalNotifications: vi.fn().mockResolvedValue({ ok: true }),
}))

import { assignBookingToRun } from '../opsDispatch'

const staffUserId = 'a1111111-1111-4111-8111-111111111101'
const bookingId = 'a1111111-1111-4111-8111-111111111102'
const driverProfileId = 'a1111111-1111-4111-8111-111111111104'
const vehicleId = 'a1111111-1111-4111-8111-111111111105'
const tripId = 'a1111111-1111-4111-8111-111111111106'
const otherVehicleId = 'a1111111-1111-4111-8111-111111111108'

function bookingRow() {
	return {
		id: bookingId,
		customer_id: null,
		client_type: 'walk_in',
		status: 'paid',
		payment_status: 'paid',
		total_amount: 100,
		booking_intent: 'point_to_point',
		pickup_datetime: new Date().toISOString(),
		trip_date: '2026-04-26',
		estimated_duration: 60,
		customer_account_id: null,
		account_snapshot: null,
		booking_metadata: null,
		booking_trips: [],
	}
}

function buildSupabaseFrom() {
	return vi.fn((table: string) => {
		if (table === 'bookings') {
			return {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({ data: bookingRow(), error: null }),
			}
		}
		if (table === 'booking_trips') {
			return {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
				insert: vi.fn().mockResolvedValue({ error: null }),
				delete: vi.fn().mockReturnThis(),
			}
		}
		if (table === 'vehicles') {
			return {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({
					data: {
						id: vehicleId,
						seats: 4,
						vehicle_categories: { name: 'Sedan' },
					},
					error: null,
				}),
			}
		}
		if (table === 'trips') {
			const chain: Record<string, unknown> = {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				insert: vi.fn().mockReturnThis(),
				delete: vi.fn().mockReturnThis(),
			}
			chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
			chain.single = vi.fn().mockResolvedValue({ data: { id: tripId }, error: null })
			return chain
		}
		if (table === 'profiles') {
			return {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({
					data: { role: 'chauffeur', status: 'active', default_vehicle_id: vehicleId },
					error: null,
				}),
			}
		}
		if (table === 'chauffeur_schedules') {
			return {
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				order: vi.fn().mockReturnThis(),
				limit: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({
					data: { id: 'a1111111-1111-4111-8111-111111111109' },
					error: null,
				}),
				insert: vi.fn().mockReturnThis(),
				single: vi.fn().mockResolvedValue({
					data: { id: 'a1111111-1111-4111-8111-111111111109' },
					error: null,
				}),
			}
		}
		if (table === 'chauffeur_assignments') {
			return {
				insert: vi.fn().mockResolvedValue({ error: null }),
				delete: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
			}
		}
		throw new Error(`unexpected table ${table}`)
	})
}

describe('assignBookingToRun calibration audit (15.29)', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		appendOpsAuditLog.mockResolvedValue({ ok: true })
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: staffUserId, role: 'dispatcher' },
		})
		createUserServerClient.mockResolvedValue({ from: buildSupabaseFrom() })
	})

	it('logs assignment_from_suggestion after assign_booking_to_run when hints validate', async () => {
		isDispatchSuggestionsEnabled.mockReturnValue(true)
		suggestVehiclesForBooking.mockResolvedValue([
			{
				vehicleId,
				score: 91,
				rank: 1,
				rationale: 'x',
			},
		])

		const res = await assignBookingToRun({
			bookingId,
			driverProfileId,
			vehicleId,
			fromSuggestion: { vehicleId, score: 5, rank: 2 },
		})

		expect(res.ok).toBe(true)
		const auditActions = appendOpsAuditLog.mock.calls.map((c) => c[1].action)
		expect(auditActions).toContain('assign_booking_to_run')
		expect(auditActions).toContain('assignment_from_suggestion')
		const cal = appendOpsAuditLog.mock.calls.find((c) => c[1].action === 'assignment_from_suggestion')
		expect(cal?.[1].payload).toMatchObject({
			vehicle_id: vehicleId,
			score: 91,
			rank: 1,
			booking_id: bookingId,
			trip_id: tripId,
		})
		expect(suggestVehiclesForBooking).toHaveBeenCalled()
	})

	it('logs assignment_free_pick when fromSuggestion is absent', async () => {
		isDispatchSuggestionsEnabled.mockReturnValue(true)
		suggestVehiclesForBooking.mockResolvedValue([])

		const res = await assignBookingToRun({
			bookingId,
			driverProfileId,
			vehicleId,
		})

		expect(res.ok).toBe(true)
		const cal = appendOpsAuditLog.mock.calls.find((c) => c[1].action === 'assignment_free_pick')
		expect(cal).toBeDefined()
		expect(suggestVehiclesForBooking).not.toHaveBeenCalled()
	})

	it('ignores fromSuggestion when suggestions flag is off', async () => {
		isDispatchSuggestionsEnabled.mockReturnValue(false)

		const res = await assignBookingToRun({
			bookingId,
			driverProfileId,
			vehicleId,
			fromSuggestion: { vehicleId, score: 99, rank: 1 },
		})

		expect(res.ok).toBe(true)
		expect(suggestVehiclesForBooking).not.toHaveBeenCalled()
		const cal = appendOpsAuditLog.mock.calls.find((c) => c[1].action === 'assignment_free_pick')
		expect(cal).toBeDefined()
	})

	it('degrades to assignment_free_pick when vehicle not in server top-3', async () => {
		isDispatchSuggestionsEnabled.mockReturnValue(true)
		suggestVehiclesForBooking.mockResolvedValue([
			{
				vehicleId: otherVehicleId,
				score: 99,
				rank: 1,
				rationale: 'a',
			},
		])

		const res = await assignBookingToRun({
			bookingId,
			driverProfileId,
			vehicleId,
			fromSuggestion: { vehicleId, score: 99, rank: 1 },
		})

		expect(res.ok).toBe(true)
		const cal = appendOpsAuditLog.mock.calls.find((c) => c[1].action === 'assignment_free_pick')
		expect(cal).toBeDefined()
		expect(cal?.[1].payload).not.toHaveProperty('score')
	})
})
