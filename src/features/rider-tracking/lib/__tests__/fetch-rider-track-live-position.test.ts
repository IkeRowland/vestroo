import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveChauffeurAssignmentIdForTrip } from '@/lib/resolve-chauffeur-assignment'

import { fetchLatestRiderTrackLivePosition } from '../fetch-rider-track-live-position'

vi.mock('@/lib/resolve-chauffeur-assignment', () => ({
	resolveChauffeurAssignmentIdForTrip: vi.fn(),
}))

function makeSupabaseMock(row: { current_location: unknown; updated_at: string } | null) {
	return {
		from: vi.fn(() => ({
			select: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
		})),
	} as never
}

describe('fetchLatestRiderTrackLivePosition', () => {
	beforeEach(() => {
		vi.mocked(resolveChauffeurAssignmentIdForTrip).mockReset()
	})

	it('returns null without chauffeur or vehicle', async () => {
		const supabase = makeSupabaseMock(null)
		const r = await fetchLatestRiderTrackLivePosition(supabase, {
			id: 'trip-1',
			chauffeur_id: null,
			vehicle_id: 'v1',
		})
		expect(r).toBeNull()
		expect(resolveChauffeurAssignmentIdForTrip).not.toHaveBeenCalled()
	})

	it('returns narrow DTO when row resolves', async () => {
		vi.mocked(resolveChauffeurAssignmentIdForTrip).mockResolvedValue('asg-1')
		const supabase = makeSupabaseMock({
			current_location: { lat: -26.2, lng: 28.1 },
			updated_at: '2026-04-01T12:00:00.000Z',
		})
		const r = await fetchLatestRiderTrackLivePosition(supabase, {
			id: 'trip-1',
			chauffeur_id: 'c1',
			vehicle_id: 'v1',
		})
		expect(r).toEqual({
			lat: -26.2,
			lng: 28.1,
			updatedAtIso: '2026-04-01T12:00:00.000Z',
		})
	})
})
