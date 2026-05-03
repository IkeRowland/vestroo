import { describe, expect, it } from 'vitest'

import {
	clampCalibrationWindowDays,
	OPS_SUGGESTIONS_CALIBRATION_DEFAULT_WINDOW_DAYS,
	summarizeCalibrationAssignAudits,
} from '@/lib/ops-suggestions-calibration-report'

describe('clampCalibrationWindowDays', () => {
	it('defaults empty or invalid to 30', () => {
		expect(clampCalibrationWindowDays(undefined)).toBe(
			OPS_SUGGESTIONS_CALIBRATION_DEFAULT_WINDOW_DAYS,
		)
		expect(clampCalibrationWindowDays('')).toBe(OPS_SUGGESTIONS_CALIBRATION_DEFAULT_WINDOW_DAYS)
		expect(clampCalibrationWindowDays('abc')).toBe(OPS_SUGGESTIONS_CALIBRATION_DEFAULT_WINDOW_DAYS)
	})

	it('clamps to 1–366', () => {
		expect(clampCalibrationWindowDays('1')).toBe(1)
		expect(clampCalibrationWindowDays('366')).toBe(366)
		expect(clampCalibrationWindowDays('0')).toBe(1)
		expect(clampCalibrationWindowDays('999')).toBe(366)
	})
})

describe('summarizeCalibrationAssignAudits', () => {
	it('computes counts, percentages, mean/median rank, and histogram', () => {
		const rows = [
			{ action: 'assignment_from_suggestion', payload: { rank: 1 } },
			{ action: 'assignment_from_suggestion', payload: { rank: 2 } },
			{ action: 'assignment_from_suggestion', payload: { rank: 3 } },
			{ action: 'assignment_free_pick', payload: {} },
		]
		const s = summarizeCalibrationAssignAudits(rows)
		expect(s.totalDenominator).toBe(4)
		expect(s.fromSuggestionCount).toBe(3)
		expect(s.freePickCount).toBe(1)
		expect(s.pctFromSuggestion).toBeCloseTo(75, 5)
		expect(s.pctFreePick).toBeCloseTo(25, 5)
		expect(s.meanRank).toBeCloseTo(2, 5)
		expect(s.medianRank).toBe(2)
		expect(s.rankObservedCount).toBe(3)
		expect(s.rankHistogram).toEqual({ rank1: 1, rank2: 1, rank3: 1, other: 0 })
	})

	it('returns null percents and zeros when empty', () => {
		const s = summarizeCalibrationAssignAudits([])
		expect(s.totalDenominator).toBe(0)
		expect(s.pctFromSuggestion).toBeNull()
		expect(s.pctFreePick).toBeNull()
		expect(s.meanRank).toBeNull()
		expect(s.medianRank).toBeNull()
		expect(s.rankObservedCount).toBe(0)
	})

	it('only free-pick yields null rank stats', () => {
		const s = summarizeCalibrationAssignAudits([
			{ action: 'assignment_free_pick', payload: {} },
		])
		expect(s.totalDenominator).toBe(1)
		expect(s.fromSuggestionCount).toBe(0)
		expect(s.meanRank).toBeNull()
		expect(s.medianRank).toBeNull()
		expect(s.rankObservedCount).toBe(0)
	})

	it('mean rank ignores suggestion rows without numeric rank', () => {
		const s = summarizeCalibrationAssignAudits([
			{ action: 'assignment_from_suggestion', payload: { rank: 2 } },
			{ action: 'assignment_from_suggestion', payload: {} },
		])
		expect(s.fromSuggestionCount).toBe(2)
		expect(s.rankObservedCount).toBe(1)
		expect(s.meanRank).toBe(2)
	})
})
