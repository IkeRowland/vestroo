import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import type { OpsBookingIntentFilterValue } from '@/lib/ops-booking-grid-query'
import {
	allParamValues,
	getIgnoredBookingsQueueParamKeys,
	parseOpsBookingsQueueSearchParams,
} from '@/lib/ops-bookings-queue-query'

/**
 * Walk-in workflow slice of **`/ops/bookings`** (`client=walk_in` + status filters).
 *
 * Legacy **`/ops/walk-in`** routes redirect here (bookmark preservation).
 */

/** @deprecated Legacy pathname — prefer {@link OPS_BOOKINGS_PATH} with `client=walk_in`. */
export const OPS_WALK_IN_PATH = '/ops/walk-in' as const

export const OPS_WALK_IN_NEW_QUEUE_HREF = `${OPS_BOOKINGS_PATH}?client=walk_in&status=submitted` as const

export type OpsWalkInStageKey =
	| 'new'
	| 'triaged'
	| 'availability_checked'
	| 'quote_sent'
	| 'awaiting_payment'
	| 'ready_to_assign'
	| 'in_progress'
	| 'completed'

export const OPS_WALK_IN_STAGE_ORDER: readonly OpsWalkInStageKey[] = [
	'new',
	'triaged',
	'availability_checked',
	'quote_sent',
	'awaiting_payment',
	'ready_to_assign',
	'in_progress',
	'completed',
] as const

const STAGE_SET = new Set<string>(OPS_WALK_IN_STAGE_ORDER)

export type OpsWalkInQueueParsed = {
	stage: OpsWalkInStageKey
	intents: OpsBookingIntentFilterValue[]
}

function uniqueSortedIntentSlice(
	intents: OpsBookingIntentFilterValue[],
): OpsBookingIntentFilterValue[] {
	if (intents.length <= 1) {
		return intents
	}
	return [intents[0]]
}

/**
 * Parses `stage` (default **`new`**) and optional **`intent`** (first recognised token only when multiples are present — defer full multi-intent parity to F1/A4).
 */
export function parseOpsWalkInQueueSearchParams(
	raw: Record<string, string | string[] | undefined>,
): OpsWalkInStageKey {
	const stageVals = allParamValues(raw, 'stage')
	const first = stageVals[0]?.trim()
	if (first && STAGE_SET.has(first)) {
		return first as OpsWalkInStageKey
	}
	return 'new'
}

export function parseOpsWalkInQueueFull(
	raw: Record<string, string | string[] | undefined>,
): OpsWalkInQueueParsed {
	const bookingParsed = parseOpsBookingsQueueSearchParams(raw)
	return {
		stage: parseOpsWalkInQueueSearchParams(raw),
		intents: uniqueSortedIntentSlice(bookingParsed.intents),
	}
}

export function getIgnoredWalkInQueueParamKeys(
	raw: Record<string, string | string[] | undefined>,
): ('stage' | 'intent')[] {
	const ignored: ('stage' | 'intent')[] = []
	const stageVals = allParamValues(raw, 'stage')
	if (stageVals.some((s) => s.trim() !== '' && !STAGE_SET.has(s.trim()))) {
		ignored.push('stage')
	}
	const bookingIgnored = getIgnoredBookingsQueueParamKeys(raw)
	if (bookingIgnored.includes('intent')) {
		ignored.push('intent')
	}
	return ignored
}

/** Maps walk-in queue tab → `/ops/bookings` `status` keys (best-effort vs tab SQL). */
export function walkInStageToBookingsStatuses(stage: OpsWalkInStageKey): string[] {
	switch (stage) {
		case 'new':
			return ['submitted']
		case 'triaged':
		case 'availability_checked':
			return ['triaged']
		case 'quote_sent':
			return ['quote_sent']
		case 'awaiting_payment':
			return ['awaiting_payment']
		case 'ready_to_assign':
			return ['ready_to_assign']
		case 'in_progress':
			return ['in_progress']
		case 'completed':
			return ['completed']
		default: {
			const _e: never = stage
			return _e
		}
	}
}

export function walkInQueueHref(overrides: Partial<OpsWalkInQueueParsed>): string {
	const stage = overrides.stage ?? 'new'
	const u = new URLSearchParams()
	u.set('client', 'walk_in')
	for (const s of walkInStageToBookingsStatuses(stage)) {
		u.append('status', s)
	}
	const intents = overrides.intents
	if (intents !== undefined) {
		for (const i of intents) {
			u.append('intent', i)
		}
	}
	const qs = u.toString()
	return qs ? `${OPS_BOOKINGS_PATH}?${qs}` : OPS_BOOKINGS_PATH
}

export function opsWalkInStageLabel(stage: OpsWalkInStageKey): string {
	switch (stage) {
		case 'new':
			return 'New'
		case 'triaged':
			return 'Triaged'
		case 'availability_checked':
			return 'Availability checked'
		case 'quote_sent':
			return 'Quote sent'
		case 'awaiting_payment':
			return 'Awaiting payment'
		case 'ready_to_assign':
			return 'Ready to assign'
		case 'in_progress':
			return 'In progress'
		case 'completed':
			return 'Completed'
		default: {
			const _e: never = stage
			return _e
		}
	}
}

/** Minimal booking row fields for deriving walk-in stage on a mixed queue (e.g. `/ops/bookings`). */
export type OpsWalkInStageDeriveInput = {
	client_type: string | null
	status: string | null
	availability_checked_at: string | null
}

/**
 * Maps a **walk-in** row to the same {@link OpsWalkInStageKey} model as `/ops/walk-in` tabs.
 * Returns **`null`** when `client_type` is not walk-in or status is outside the walk-in funnel.
 */
export function deriveWalkInQueueStageForBookingRow(
	row: OpsWalkInStageDeriveInput,
): OpsWalkInStageKey | null {
	if (row.client_type !== 'walk_in') {
		return null
	}
	const st = row.status ?? ''
	if (st === 'submitted') {
		return 'new'
	}
	if (st === 'quote_rejected') {
		return 'triaged'
	}
	if (st === 'triaged') {
		const hasAvail =
			row.availability_checked_at != null && String(row.availability_checked_at).trim() !== ''
		return hasAvail ? 'availability_checked' : 'triaged'
	}
	if (st === 'quote_sent' || st === 'quote_accepted') {
		return 'quote_sent'
	}
	if (st === 'awaiting_payment') {
		return 'awaiting_payment'
	}
	if (st === 'ready_to_assign') {
		return 'ready_to_assign'
	}
	if (st === 'in_progress') {
		return 'in_progress'
	}
	if (st === 'completed') {
		return 'completed'
	}
	return null
}
