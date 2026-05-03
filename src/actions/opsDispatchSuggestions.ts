'use server'

import { z } from 'zod'

import { suggestVehiclesForBooking, type Suggestion } from '@/lib/dispatch-suggestions'
import { isDispatchSuggestionsEnabled } from '@/lib/dispatch-suggestions-env'
import { createDispatchSuggestionsDeps } from '@/lib/dispatch-suggestions-supabase-deps'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { createUserServerClient } from '@/lib/supabase/server'

const bookingIdSchema = z.object({
	bookingId: z.string().uuid(),
})

export type VehicleDispatchSuggestionsResult =
	| { ok: true; suggestions: Suggestion[] }
	| { ok: false; message: string }

const MAX_SUGGESTIONS_UI = 3

/**
 * Fulfil assign flow — **Theme E `15D.2`**. Loads ranked vehicle suggestions (**`15D.1`**).
 * Gated by **`DISPATCH_SUGGESTIONS_ENABLED`**; returns **[]** when disabled (defence in depth).
 */
export async function fetchVehicleDispatchSuggestions(
	raw: z.infer<typeof bookingIdSchema>,
): Promise<VehicleDispatchSuggestionsResult> {
	if (!isDispatchSuggestionsEnabled()) {
		return { ok: true, suggestions: [] }
	}
	const parsed = bookingIdSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false, message: 'Invalid booking' }
	}
	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false, message: gate.message }
	}
	const supabase = await createUserServerClient()
	const deps = createDispatchSuggestionsDeps(supabase)
	try {
		const suggestions = await suggestVehiclesForBooking(parsed.data.bookingId, deps)
		const sorted = [...suggestions].sort((a, b) => {
			if (b.score !== a.score) return b.score - a.score
			return a.vehicleId.localeCompare(b.vehicleId)
		})
		return { ok: true, suggestions: sorted.slice(0, MAX_SUGGESTIONS_UI) }
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'Suggestions could not be loaded'
		return { ok: false, message: msg }
	}
}
