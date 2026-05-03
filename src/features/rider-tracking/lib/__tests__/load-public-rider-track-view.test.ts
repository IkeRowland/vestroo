import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createServerClient } from '@/lib/supabase/server'
import { verifyRiderTrackToken } from '@/lib/tracking-tokens'

import { loadPublicRiderTrackView } from '../load-public-rider-track-view'

vi.mock('@/lib/tracking-tokens', () => ({
	verifyRiderTrackToken: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
	createServerClient: vi.fn(),
}))

function chainTripMaybeSingle(data: unknown, error: unknown = null) {
	return {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockResolvedValue({ data, error }),
	}
}

function chainProfileMaybeSingle(data: unknown) {
	return {
		select: vi.fn().mockReturnThis(),
		eq: vi.fn().mockReturnThis(),
		maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
	}
}

describe('loadPublicRiderTrackView', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns token_invalid when verify fails (no Supabase)', async () => {
		vi.mocked(verifyRiderTrackToken).mockReturnValue({ valid: false, reason: 'malformed' })
		const res = await loadPublicRiderTrackView('bad')
		expect(res).toEqual({ ok: false, gate: 'token_invalid' })
		expect(createServerClient).not.toHaveBeenCalled()
	})

	it('returns token_invalid when trip row missing', async () => {
		vi.mocked(verifyRiderTrackToken).mockReturnValue({
			valid: true,
			payload: {
				trip_id: '00000000-0000-4000-8000-000000000099',
				purpose: 'rider_track',
				exp: Date.now() + 60_000,
			},
		})
		const from = vi.fn((table: string) => {
			if (table === 'trips') return chainTripMaybeSingle(null, null)
			return chainProfileMaybeSingle(null)
		})
		vi.mocked(createServerClient).mockResolvedValue({ from } as never)
		const res = await loadPublicRiderTrackView('tok')
		expect(res).toEqual({ ok: false, gate: 'token_invalid' })
	})

	it('returns DTO when trip loads', async () => {
		vi.mocked(verifyRiderTrackToken).mockReturnValue({
			valid: true,
			payload: {
				trip_id: '00000000-0000-4000-8000-000000000099',
				purpose: 'rider_track',
				exp: Date.now() + 60_000,
			},
		})
		const tripRow = {
			id: '00000000-0000-4000-8000-000000000099',
			status: 'booking',
			time_start_estimate: null,
			time_end_estimate: null,
			created_at: '2026-04-01T08:00:00.000Z',
			chauffeur_id: null,
			vehicle_id: null,
			service_run_id: null,
			service_type: 'Charter',
		}
		const from = vi.fn((table: string) => {
			if (table === 'trips') return chainTripMaybeSingle(tripRow, null)
			if (table === 'booking_trips') return chainTripMaybeSingle(null, null)
			if (table === 'vehicles') return chainProfileMaybeSingle(null)
			if (table === 'profiles') return chainProfileMaybeSingle(null)
			throw new Error(`unexpected table ${table}`)
		})
		vi.mocked(createServerClient).mockResolvedValue({ from } as never)
		const res = await loadPublicRiderTrackView('tok')
		expect(res.ok).toBe(true)
		if (res.ok) {
			expect(res.data.status).toBe('booking')
			expect(res.data.serviceTypeLabel).toBe('Charter')
			expect(res.data.livePosition).toBeNull()
		}
	})
})
