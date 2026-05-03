import { describe, it, expect, vi, beforeEach } from 'vitest'

const getOpsStaffForAction = vi.hoisted(() => vi.fn())
const createUserServerClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/ops-auth', () => ({
	getOpsStaffForAction,
}))

vi.mock('@/lib/supabase/server', () => ({
	createUserServerClient,
}))

vi.mock('@/lib/ops-audit', () => ({
	appendOpsAuditLog: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('next/cache', () => ({
	revalidatePath: vi.fn(),
}))

import {
	closeProtectionEngagementStatusSchema,
	createCloseProtectionEngagementSchema,
	updateCloseProtectionEngagementSchema,
} from '@/lib/ops-close-protection-schemas'

import {
	createCloseProtectionEngagementAction,
	listCloseProtectionEngagementsAction,
} from '../opsCloseProtection'

describe('opsCloseProtection Zod', () => {
	it('accepts valid status values', () => {
		for (const s of ['draft', 'active', 'completed', 'cancelled'] as const) {
			expect(closeProtectionEngagementStatusSchema.safeParse(s).success).toBe(true)
		}
	})

	it('rejects invalid status', () => {
		expect(closeProtectionEngagementStatusSchema.safeParse('pending').success).toBe(false)
	})

	it('createCloseProtectionEngagementSchema requires uuid bookingId', () => {
		expect(createCloseProtectionEngagementSchema.safeParse({ bookingId: 'not-uuid' }).success).toBe(
			false,
		)
		expect(
			createCloseProtectionEngagementSchema.safeParse({
				bookingId: 'b1111111-1111-4111-8111-111111111111',
			}).success,
		).toBe(true)
	})

	it('updateCloseProtectionEngagementSchema requires engagementId', () => {
		expect(updateCloseProtectionEngagementSchema.safeParse({}).success).toBe(false)
		expect(
			updateCloseProtectionEngagementSchema.safeParse({
				engagementId: 'e1111111-1111-4111-8111-111111111111',
				status: 'active',
			}).success,
		).toBe(true)
	})
})

describe('opsCloseProtection auth branches', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('createCloseProtectionEngagementAction returns Forbidden when not staff', async () => {
		getOpsStaffForAction.mockResolvedValue({ ok: false, message: 'Forbidden' })
		const res = await createCloseProtectionEngagementAction({
			bookingId: 'b1111111-1111-4111-8111-111111111111',
		})
		expect(res.ok).toBe(false)
		if (!res.ok) expect(res.error.message).toBe('Forbidden')
		expect(createUserServerClient).not.toHaveBeenCalled()
	})

	it('createCloseProtectionEngagementAction inserts when staff and booking exists', async () => {
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})

		const singleMock = vi.fn().mockResolvedValue({
			data: { id: 'c1111111-1111-4111-8111-111111111111' },
			error: null,
		})

		const fromMock = vi.fn((table: string) => {
			if (table === 'bookings') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: { id: 'b1111111-1111-4111-8111-111111111111' },
						error: null,
					}),
				}
			}
			if (table === 'close_protection_engagements') {
				return {
					insert: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					single: singleMock,
				}
			}
			if (table === 'ops_audit_log') {
				return {
					insert: vi.fn().mockResolvedValue({ error: null }),
				}
			}
			throw new Error(`unexpected table ${table}`)
		})

		createUserServerClient.mockResolvedValue({ from: fromMock })

		const res = await createCloseProtectionEngagementAction({
			bookingId: 'b1111111-1111-4111-8111-111111111111',
		})
		expect(res.ok).toBe(true)
		if (res.ok) expect(res.engagementId).toBe('c1111111-1111-4111-8111-111111111111')
		expect(singleMock).toHaveBeenCalled()
	})

	it('listCloseProtectionEngagementsAction returns empty when unauthenticated', async () => {
		getOpsStaffForAction.mockResolvedValue({ ok: false, message: 'Not authenticated' })
		const res = await listCloseProtectionEngagementsAction({ limit: 10 })
		expect(res.ok).toBe(false)
		expect(res.rows).toEqual([])
	})
})
