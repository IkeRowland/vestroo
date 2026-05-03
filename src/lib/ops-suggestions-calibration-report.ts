import type { SupabaseClient } from '@supabase/supabase-js'

/** Default rolling window for Epic 15 / **15D.4** calibration report (`?days=` overrides). */
export const OPS_SUGGESTIONS_CALIBRATION_DEFAULT_WINDOW_DAYS = 30

export const OPS_SUGGESTIONS_CALIBRATION_MIN_DAYS = 1
export const OPS_SUGGESTIONS_CALIBRATION_MAX_DAYS = 366

/** **15D.3** — actions written on successful assign for calibration segmentation. */
export const OPS_CALIBRATION_ASSIGN_AUDIT_ACTIONS = [
	'assignment_from_suggestion',
	'assignment_free_pick',
] as const

export type CalibrationAuditRow = {
	action: string
	payload: unknown
}

export type CalibrationSummary = {
	totalDenominator: number
	fromSuggestionCount: number
	freePickCount: number
	/** `null` when denominator is zero — callers show N/A, not NaN. */
	pctFromSuggestion: number | null
	pctFreePick: number | null
	/**
	 * Suggestion-path rows whose payload contained a parseable numeric **`rank`** (used for mean /
	 * median / histogram).
	 */
	rankObservedCount: number
	/** Mean of server-bound `rank` where observed; `null` when no numeric ranks. */
	meanRank: number | null
	medianRank: number | null
	/** Counts for ranks 1–3 on suggestion rows; keys outside 1–3 are folded to `other`. */
	rankHistogram: { rank1: number; rank2: number; rank3: number; other: number }
}

function isRecord(v: unknown): v is Record<string, unknown> {
	return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Reads **`rank`** from **`15D.3`** suggestion-path payloads (JSON in **`ops_audit_log.payload`**).
 */
export function rankFromCalibrationPayload(payload: unknown): number | null {
	if (!isRecord(payload)) return null
	const raw = payload.rank
	if (typeof raw === 'number' && Number.isFinite(raw)) return raw
	if (typeof raw === 'string') {
		const n = Number(raw)
		if (Number.isFinite(n)) return n
	}
	return null
}

export function clampCalibrationWindowDays(raw: string | undefined): number {
	const fallback = OPS_SUGGESTIONS_CALIBRATION_DEFAULT_WINDOW_DAYS
	if (raw === undefined || raw.trim() === '') return fallback
	const n = Number.parseInt(raw, 10)
	if (!Number.isFinite(n)) return fallback
	return Math.min(
		OPS_SUGGESTIONS_CALIBRATION_MAX_DAYS,
		Math.max(OPS_SUGGESTIONS_CALIBRATION_MIN_DAYS, n),
	)
}

function medianSorted(sorted: number[]): number | null {
	if (sorted.length === 0) return null
	const mid = Math.floor(sorted.length / 2)
	if (sorted.length % 2 === 1) return sorted[mid]!
	const a = sorted[mid - 1]!
	const b = sorted[mid]!
	return (a + b) / 2
}

/**
 * **AC4 (A):** denominator = rows with **`action`** in **`OPS_CALIBRATION_ASSIGN_AUDIT_ACTIONS`** only
 * (same set as the Supabase filter). Every row is exactly one of suggestion vs free-pick.
 */
export function summarizeCalibrationAssignAudits(
	rows: readonly CalibrationAuditRow[],
): CalibrationSummary {
	let fromSuggestionCount = 0
	let freePickCount = 0
	const suggestionRanks: number[] = []
	const hist = { rank1: 0, rank2: 0, rank3: 0, other: 0 }

	for (const row of rows) {
		if (row.action === 'assignment_from_suggestion') {
			fromSuggestionCount += 1
			const r = rankFromCalibrationPayload(row.payload)
			if (r !== null) {
				suggestionRanks.push(r)
				if (r === 1) hist.rank1 += 1
				else if (r === 2) hist.rank2 += 1
				else if (r === 3) hist.rank3 += 1
				else hist.other += 1
			}
		} else if (row.action === 'assignment_free_pick') {
			freePickCount += 1
		}
	}

	const totalDenominator = fromSuggestionCount + freePickCount
	const pctFromSuggestion =
		totalDenominator > 0 ? (100 * fromSuggestionCount) / totalDenominator : null
	const pctFreePick =
		totalDenominator > 0 ? (100 * freePickCount) / totalDenominator : null

	const rankObservedCount = suggestionRanks.length
	const sortedRanks = [...suggestionRanks].sort((a, b) => a - b)
	let meanRank: number | null = null
	if (rankObservedCount > 0) {
		const sum = suggestionRanks.reduce((a, b) => a + b, 0)
		meanRank = sum / rankObservedCount
	}

	return {
		totalDenominator,
		fromSuggestionCount,
		freePickCount,
		pctFromSuggestion,
		pctFreePick,
		rankObservedCount,
		meanRank,
		medianRank: medianSorted(sortedRanks),
		rankHistogram: hist,
	}
}

/** Rounds for display; keeps one decimal without contradicting integer counts at typical volumes. */
export function formatCalibrationPercent(value: number | null): string {
	if (value === null) return '—'
	return `${value.toFixed(1)}%`
}

export function formatCalibrationRankStat(value: number | null): string {
	if (value === null) return 'N/A'
	return value.toFixed(2)
}

/**
 * Loads **`ops_audit_log`** rows for the calibration assign set in **`[fromIso, ∞)`** (staff session / RLS).
 * Paginates at 1000 rows so large windows stay within PostgREST limits.
 */
export async function fetchCalibrationAssignAuditRows(
	supabase: SupabaseClient,
	fromIso: string,
): Promise<
	{ ok: true; rows: CalibrationAuditRow[] } | { ok: false; message: string }
> {
	const accumulated: CalibrationAuditRow[] = []
	const pageSize = 1000
	let rangeStart = 0
	const actionList = [...OPS_CALIBRATION_ASSIGN_AUDIT_ACTIONS]

	for (;;) {
		const { data, error } = await supabase
			.from('ops_audit_log')
			.select('action, payload')
			.in('action', actionList)
			.gte('created_at', fromIso)
			.order('created_at', { ascending: true })
			.range(rangeStart, rangeStart + pageSize - 1)

		if (error) {
			return { ok: false, message: error.message }
		}

		const chunk = data ?? []
		for (const row of chunk) {
			accumulated.push({
				action: typeof row.action === 'string' ? row.action : '',
				payload: row.payload,
			})
		}

		if (chunk.length < pageSize) {
			break
		}
		rangeStart += pageSize
	}

	return { ok: true, rows: accumulated }
}
