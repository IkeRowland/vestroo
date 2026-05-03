import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getOpsStaffForAction = vi.hoisted(() => vi.fn())
const createUserServerClient = vi.hoisted(() => vi.fn())
const appendOpsAuditLog = vi.hoisted(() => vi.fn())

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
	revalidatePath: vi.fn(),
}))

import { markBookingPaymentReceivedAction } from '../markBookingPaymentReceived'

const BOOKING_ID = 'b1111111-1111-4111-8111-111111111111'
const STAFF_USER_ID = 'd2222222-2222-4222-8222-222222222222'
const QUOTE_ID = 'q3333333-3333-4333-8333-333333333333'

type BookingFixture = {
	id: string
	client_type: 'walk_in' | 'account_client'
	status: string
	payment_status: string | null
	payment_received_at: string | null
	payment_evidence_ref: string | null
	total_amount: number | string | null
	current_quote_id: string | null
}

type QuoteFixture = { total_zar: number | string }

type Mocks = {
	booking: BookingFixture | null
	bookingQuote?: QuoteFixture | null
	viewQuote?: QuoteFixture | null
	updateError?: { message: string } | null
	updateRowsAffected?: boolean
	captures: {
		bookingUpdate?: Record<string, unknown>
		bookingUpdateFilters: Array<{ column: string; value: unknown }>
	}
}

function buildSupabaseMock(state: Mocks) {
	state.captures.bookingUpdateFilters = []

	function bookingsTable() {
		return {
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					maybeSingle: vi.fn().mockResolvedValue({ data: state.booking, error: null }),
				}),
			}),
			update: vi.fn((payload: Record<string, unknown>) => {
				state.captures.bookingUpdate = payload
				const builder: Record<string, unknown> = {}
				const eq = vi.fn((column: string, value: unknown) => {
					state.captures.bookingUpdateFilters.push({ column, value })
					return builder
				})
				const select = vi.fn().mockReturnValue({
					maybeSingle: vi.fn().mockResolvedValue(
						state.updateError
							? { data: null, error: state.updateError }
							: state.updateRowsAffected === false
								? { data: null, error: null }
								: { data: { id: state.booking?.id ?? BOOKING_ID }, error: null },
					),
				})
				builder.eq = eq
				builder.select = select
				return builder
			}),
		}
	}

	function bookingQuotesTable() {
		return {
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					maybeSingle: vi.fn().mockResolvedValue({
						data: state.bookingQuote ?? null,
						error: null,
					}),
				}),
			}),
		}
	}

	function viewBookingCurrentQuoteTable() {
		return {
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					maybeSingle: vi.fn().mockResolvedValue({
						data: state.viewQuote ?? null,
						error: null,
					}),
				}),
			}),
		}
	}

	const from = vi.fn((table: string) => {
		switch (table) {
			case 'bookings':
				return bookingsTable()
			case 'booking_quotes':
				return bookingQuotesTable()
			case 'v_booking_current_quote':
				return viewBookingCurrentQuoteTable()
			default:
				throw new Error(`unexpected table ${table}`)
		}
	})

	return { from }
}

function makeWalkInBooking(overrides: Partial<BookingFixture> = {}): BookingFixture {
	return {
		id: BOOKING_ID,
		client_type: 'walk_in',
		status: 'awaiting_payment',
		payment_status: 'pending',
		payment_received_at: null,
		payment_evidence_ref: null,
		total_amount: null,
		current_quote_id: QUOTE_ID,
		...overrides,
	}
}

function makeAccountBooking(overrides: Partial<BookingFixture> = {}): BookingFixture {
	return {
		id: BOOKING_ID,
		client_type: 'account_client',
		status: 'invoiced',
		payment_status: 'pending',
		payment_received_at: null,
		payment_evidence_ref: null,
		total_amount: 4500,
		current_quote_id: null,
		...overrides,
	}
}

function staffSession(role: 'dispatcher' | 'admin' = 'dispatcher') {
	return {
		ok: true as const,
		session: { userId: STAFF_USER_ID, role, email: 'ops@example.com' },
	}
}

beforeEach(() => {
	vi.clearAllMocks()
	appendOpsAuditLog.mockResolvedValue({ ok: true })
})

afterEach(() => {
	vi.useRealTimers()
})

describe('markBookingPaymentReceivedAction — validation + auth', () => {
	it('rejects invalid payload', async () => {
		const res = await markBookingPaymentReceivedAction({ bookingId: 'not-uuid' })
		expect(res.ok).toBe(false)
		if (!res.ok) expect(res.error.code).toBe('VALIDATION')
	})

	it('rejects when caller is not staff', async () => {
		getOpsStaffForAction.mockResolvedValue({ ok: false, message: 'Forbidden' })
		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 1500,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})
		expect(res.ok).toBe(false)
		if (!res.ok) expect(res.error.code).toBe('FORBIDDEN')
		expect(createUserServerClient).not.toHaveBeenCalled()
	})

	it('rejects future-dated receivedAt', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const future = new Date(Date.now() + 60 * 60 * 1000).toISOString()
		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 1500,
			receivedAt: future,
		})
		expect(res.ok).toBe(false)
		if (!res.ok) expect(res.error.code).toBe('FUTURE_RECEIVED_AT')
		expect(createUserServerClient).not.toHaveBeenCalled()
	})

	it('rejects unparseable receivedAt', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 1500,
			receivedAt: 'not-a-date',
		})
		expect(res.ok).toBe(false)
		if (!res.ok) expect(res.error.code).toBe('INVALID_RECEIVED_AT')
	})

	it('rejects non-positive amount via Zod', async () => {
		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 0,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})
		expect(res.ok).toBe(false)
		if (!res.ok) expect(res.error.code).toBe('VALIDATION')
	})
})

describe('markBookingPaymentReceivedAction — happy paths', () => {
	it('walk-in: awaiting_payment → ready_to_assign with matching quote total', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeWalkInBooking(),
			bookingQuote: { total_zar: 1500 },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const receivedAt = new Date(Date.now() - 60_000).toISOString()
		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: '  EFT-REF-001 ',
			amountZar: 1500,
			receivedAt,
		})

		expect(res.ok).toBe(true)
		if (!res.ok) return
		expect(res.idempotent).toBe(false)
		expect(res.variance).toBe(false)
		expect(res.priorStatus).toBe('awaiting_payment')
		expect(res.newStatus).toBe('ready_to_assign')

		expect(state.captures.bookingUpdate).toMatchObject({
			payment_status: 'paid',
			payment_evidence_ref: 'EFT-REF-001',
			status: 'ready_to_assign',
		})
		expect(state.captures.bookingUpdate?.payment_received_at).toEqual(
			new Date(receivedAt).toISOString(),
		)

		expect(appendOpsAuditLog).toHaveBeenCalledTimes(1)
		const auditCall = appendOpsAuditLog.mock.calls[0][1]
		expect(auditCall.action).toBe('payment_received_eft')
		expect(auditCall.entity).toBe('booking')
		expect(auditCall.entityId).toBe(BOOKING_ID)
		expect(auditCall.actorRole).toBe('dispatcher')
		expect(auditCall.payload).toMatchObject({
			evidence_ref: 'EFT-REF-001',
			amount_zar: 1500,
			prior_status: 'awaiting_payment',
			new_status: 'ready_to_assign',
			expected_amount_zar: 1500,
			expected_amount_source: 'booking_quote',
			client_type: 'walk_in',
		})
		expect(auditCall.payload.variance_reason).toBeUndefined()
	})

	it('account: invoiced → paid with matching booking total_amount', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession('admin'))
		const state: Mocks = {
			booking: makeAccountBooking({ total_amount: 4500 }),
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-INV-2026-0042',
			amountZar: 4500,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})

		expect(res.ok).toBe(true)
		if (!res.ok) return
		expect(res.priorStatus).toBe('invoiced')
		expect(res.newStatus).toBe('paid')

		const auditCall = appendOpsAuditLog.mock.calls[0][1]
		expect(auditCall.actorRole).toBe('admin')
		expect(auditCall.payload).toMatchObject({
			expected_amount_source: 'booking_total_amount',
			expected_amount_zar: 4500,
			client_type: 'account_client',
			new_status: 'paid',
		})
	})

	it('walk-in: falls back to v_booking_current_quote when current_quote_id row is missing', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeWalkInBooking(),
			bookingQuote: null,
			viewQuote: { total_zar: 1500 },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 1500,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})

		expect(res.ok).toBe(true)
		if (!res.ok) return
		expect(res.variance).toBe(false)
		const auditCall = appendOpsAuditLog.mock.calls[0][1]
		expect(auditCall.payload.expected_amount_source).toBe('booking_quote')
	})
})

describe('markBookingPaymentReceivedAction — rejects', () => {
	it('rejects when current status is not markable (walk-in not in awaiting_payment)', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeWalkInBooking({ status: 'quote_sent' }),
			bookingQuote: { total_zar: 1500 },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 1500,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})

		expect(res.ok).toBe(false)
		if (res.ok) return
		expect(res.error.code).toBe('INVALID_STATUS_FOR_PAYMENT_MARK')
		expect(appendOpsAuditLog).not.toHaveBeenCalled()
		expect(state.captures.bookingUpdate).toBeUndefined()
	})

	it('rejects when booking does not exist', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = { booking: null, captures: { bookingUpdateFilters: [] } }
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 1500,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})

		expect(res.ok).toBe(false)
		if (res.ok) return
		expect(res.error.code).toBe('NOT_FOUND')
	})

	it('rejects account_client when status is not invoiced', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession('admin'))
		const state: Mocks = {
			booking: makeAccountBooking({ status: 'awaiting_payment' }),
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-INV-001',
			amountZar: 4500,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})

		expect(res.ok).toBe(false)
		if (res.ok) return
		expect(res.error.code).toBe('INVALID_STATUS_FOR_PAYMENT_MARK')
		expect(appendOpsAuditLog).not.toHaveBeenCalled()
	})
})

describe('markBookingPaymentReceivedAction — idempotency', () => {
	it('walk-in: re-mark when already paid + ready_to_assign returns success without audit row', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeWalkInBooking({
				status: 'ready_to_assign',
				payment_status: 'paid',
				payment_received_at: new Date(Date.now() - 3600_000).toISOString(),
				payment_evidence_ref: 'EFT-REF-OLD',
			}),
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 1500,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})

		expect(res.ok).toBe(true)
		if (!res.ok) return
		expect(res.idempotent).toBe(true)
		expect(res.newStatus).toBe('ready_to_assign')
		expect(state.captures.bookingUpdate).toBeUndefined()
		expect(appendOpsAuditLog).not.toHaveBeenCalled()
	})

	it('account: re-mark when already paid returns success without audit row', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeAccountBooking({
				status: 'paid',
				payment_status: 'paid',
				payment_received_at: new Date(Date.now() - 3600_000).toISOString(),
				payment_evidence_ref: 'EFT-INV-2026-0042',
			}),
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-INV-2026-0042',
			amountZar: 4500,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})

		expect(res.ok).toBe(true)
		if (!res.ok) return
		expect(res.idempotent).toBe(true)
		expect(res.newStatus).toBe('paid')
		expect(appendOpsAuditLog).not.toHaveBeenCalled()
	})
})

describe('markBookingPaymentReceivedAction — variance', () => {
	it('rejects when amount differs by more than R 0.01 without varianceReason', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeWalkInBooking(),
			bookingQuote: { total_zar: 1500 },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 1450,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})

		expect(res.ok).toBe(false)
		if (res.ok) return
		expect(res.error.code).toBe('VARIANCE_REASON_REQUIRED')
		expect(state.captures.bookingUpdate).toBeUndefined()
		expect(appendOpsAuditLog).not.toHaveBeenCalled()
	})

	it('rejects when variance reason is shorter than 10 characters', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeWalkInBooking(),
			bookingQuote: { total_zar: 1500 },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 1450,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
			varianceReason: 'short',
		})

		expect(res.ok).toBe(false)
		if (res.ok) return
		expect(res.error.code).toBe('VARIANCE_REASON_REQUIRED')
	})

	it('accepts when variance reason length >= 10 and persists reason on audit payload', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeWalkInBooking(),
			bookingQuote: { total_zar: 1500 },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 1450,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
			varianceReason: 'Customer paid R50 less due to disputed surcharge',
		})

		expect(res.ok).toBe(true)
		if (!res.ok) return
		expect(res.variance).toBe(true)
		const auditCall = appendOpsAuditLog.mock.calls[0][1]
		expect(auditCall.payload.variance_reason).toBe(
			'Customer paid R50 less due to disputed surcharge',
		)
		expect(auditCall.payload.expected_amount_zar).toBe(1500)
		expect(auditCall.payload.amount_zar).toBe(1450)
	})

	it('does not require varianceReason within R 0.01 tolerance', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeAccountBooking({ total_amount: 4500.0 }),
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-INV-2026-0042',
			amountZar: 4500.005,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})

		expect(res.ok).toBe(true)
		if (!res.ok) return
		expect(res.variance).toBe(false)
	})

	it('returns DATABASE when booking update fails', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeWalkInBooking(),
			bookingQuote: { total_zar: 1500 },
			updateError: { message: 'connection reset' },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 1500,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})

		expect(res.ok).toBe(false)
		if (res.ok) return
		expect(res.error.code).toBe('DATABASE')
		expect(appendOpsAuditLog).not.toHaveBeenCalled()
	})

	it('returns AUDIT when ops audit append fails after successful update', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeWalkInBooking(),
			bookingQuote: { total_zar: 1500 },
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))
		appendOpsAuditLog.mockResolvedValue({ ok: false, message: 'audit insert failed' })

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 1500,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})

		expect(res.ok).toBe(false)
		if (res.ok) return
		expect(res.error.code).toBe('AUDIT')
	})

	it('does not require varianceReason when expected amount is unknown (e.g. walk-in without quote)', async () => {
		getOpsStaffForAction.mockResolvedValue(staffSession())
		const state: Mocks = {
			booking: makeWalkInBooking({ current_quote_id: null }),
			bookingQuote: null,
			viewQuote: null,
			captures: { bookingUpdateFilters: [] },
		}
		createUserServerClient.mockResolvedValue(buildSupabaseMock(state))

		const res = await markBookingPaymentReceivedAction({
			bookingId: BOOKING_ID,
			evidenceRef: 'EFT-REF-001',
			amountZar: 1500,
			receivedAt: new Date(Date.now() - 60_000).toISOString(),
		})

		expect(res.ok).toBe(true)
		if (!res.ok) return
		expect(res.variance).toBe(false)
		const auditCall = appendOpsAuditLog.mock.calls[0][1]
		expect(auditCall.payload.expected_amount_zar).toBeNull()
		expect(auditCall.payload.expected_amount_source).toBe('unknown')
	})
})
