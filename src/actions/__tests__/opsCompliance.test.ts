import { describe, it, expect, vi, beforeEach } from 'vitest'

const getOpsStaffForAction = vi.hoisted(() => vi.fn())
const getOpsAdminForAction = vi.hoisted(() => vi.fn())
const createUserServerClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/ops-auth', () => ({
	getOpsStaffForAction,
	getOpsAdminForAction,
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
	complianceIncidentCategorySchema,
	dsrAnonymiseRequestSchema,
	dsrExportRequestSchema,
} from '@/lib/ops-compliance-schemas'

import {
	listComplianceIncidentsAction,
	createComplianceIncidentAction,
	exportDataSubjectAction,
	anonymiseDataSubjectAction,
} from '../opsCompliance'

describe('opsCompliance Zod', () => {
	it('complianceIncidentCategorySchema accepts known categories', () => {
		expect(complianceIncidentCategorySchema.safeParse('privacy').success).toBe(true)
		expect(complianceIncidentCategorySchema.safeParse('invalid').success).toBe(false)
	})

	it('dsrExportRequestSchema requires profileId or email', () => {
		expect(dsrExportRequestSchema.safeParse({}).success).toBe(false)
		expect(
			dsrExportRequestSchema.safeParse({ profileId: 'b1111111-1111-4111-8111-111111111111' }).success,
		).toBe(true)
		expect(dsrExportRequestSchema.safeParse({ email: 'a@b.co' }).success).toBe(true)
	})

	it('dsrAnonymiseRequestSchema requires exact confirm phrase', () => {
		expect(
			dsrAnonymiseRequestSchema.safeParse({
				profileId: 'b1111111-1111-4111-8111-111111111111',
				confirmPhrase: 'no',
			}).success,
		).toBe(false)
		expect(
			dsrAnonymiseRequestSchema.safeParse({
				profileId: 'b1111111-1111-4111-8111-111111111111',
				confirmPhrase: 'ANONYMISE',
			}).success,
		).toBe(true)
	})
})

describe('opsCompliance auth branches', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('listComplianceIncidentsAction fails when not staff', async () => {
		getOpsStaffForAction.mockResolvedValue({ ok: false, message: 'Forbidden' })
		const res = await listComplianceIncidentsAction({ limit: 10 })
		expect(res.ok).toBe(false)
		expect(res.rows).toEqual([])
		expect(createUserServerClient).not.toHaveBeenCalled()
	})

	it('createComplianceIncidentAction inserts when dispatcher', async () => {
		getOpsStaffForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'u1111111-1111-4111-8111-111111111111', role: 'dispatcher' },
		})

		const singleMock = vi.fn().mockResolvedValue({
			data: { id: 'i1111111-1111-4111-8111-111111111111' },
			error: null,
		})

		const fromMock = vi.fn((table: string) => {
			if (table === 'compliance_incidents') {
				return {
					insert: vi.fn().mockReturnThis(),
					select: vi.fn().mockReturnThis(),
					single: singleMock,
				}
			}
			if (table === 'ops_audit_log') {
				return { insert: vi.fn().mockResolvedValue({ error: null }) }
			}
			throw new Error(`unexpected table ${table}`)
		})

		createUserServerClient.mockResolvedValue({ from: fromMock })

		const res = await createComplianceIncidentAction({
			category: 'operational',
			summary: 'Test',
			occurredAt: '2026-04-01T10:00:00.000Z',
		})
		expect(res.ok).toBe(true)
	})

	it('exportDataSubjectAction rejects dispatcher (admin only)', async () => {
		getOpsAdminForAction.mockResolvedValue({ ok: false, message: 'Admin only' })
		const res = await exportDataSubjectAction({
			profileId: 'c1111111-1111-4111-8111-111111111111',
		})
		expect(res.ok).toBe(false)
		expect(res.export).toBe(null)
		expect(res.error.message).toBe('Admin only')
		expect(createUserServerClient).not.toHaveBeenCalled()
	})

	it('exportDataSubjectAction returns payload for admin customer profile', async () => {
		getOpsAdminForAction.mockResolvedValue({
			ok: true,
			session: { userId: 'a1111111-1111-4111-8111-111111111111', role: 'admin' },
		})

		const profileRow = {
			id: 'c1111111-1111-4111-8111-111111111111',
			full_name: 'Pat',
			phone: '1',
			email: 'pat@example.com',
			avatar_url: null,
			role: 'customer',
			status: 'active',
			created_at: 't0',
			updated_at: 't1',
			retention_class: null,
			retention_until: null,
			data_subject_anonymised_at: null,
		}

		let bookingsSelectCall = 0
		const fromMock = vi.fn((table: string) => {
			if (table === 'profiles') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockReturnValue({
							maybeSingle: vi.fn().mockResolvedValue({ data: profileRow, error: null }),
						}),
					}),
				}
			}
			if (table === 'bookings') {
				return {
					select: vi.fn().mockImplementation(() => {
						bookingsSelectCall += 1
						if (bookingsSelectCall === 1) {
							return {
								eq: vi.fn().mockResolvedValue({ data: [], error: null }),
							}
						}
						return {
							is: vi.fn().mockReturnValue({
								ilike: vi.fn().mockResolvedValue({ data: [], error: null }),
							}),
						}
					}),
				}
			}
			if (table === 'trips') {
				return {
					select: vi.fn().mockReturnValue({
						eq: vi.fn().mockResolvedValue({ data: [], error: null }),
					}),
				}
			}
			throw new Error(`unexpected table ${table}`)
		})

		createUserServerClient.mockResolvedValue({ from: fromMock })

		const res = await exportDataSubjectAction({
			profileId: 'c1111111-1111-4111-8111-111111111111',
		})
		expect(res.ok).toBe(true)
		expect(res.export?.version).toBe('vst12_dsr_minimal_v1')
		expect(res.export?.subject_profile_id).toBe('c1111111-1111-4111-8111-111111111111')
	})

	it('anonymiseDataSubjectAction rejects dispatcher', async () => {
		getOpsAdminForAction.mockResolvedValue({ ok: false, message: 'Admin only' })
		const res = await anonymiseDataSubjectAction({
			profileId: 'c1111111-1111-4111-8111-111111111111',
			confirmPhrase: 'ANONYMISE',
		})
		expect(res.ok).toBe(false)
		expect(res.error.message).toBe('Admin only')
	})
})
