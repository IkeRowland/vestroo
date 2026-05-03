/**
 * Story 18.8 / FE.18.7 — billing entity picklist for `/account/preferences` (admin-only).
 * Options are distinct `bookings.billing_entity_ref` values for the account plus the current default.
 */

export function mergeBillingEntityOptionList(
	fromBookings: readonly string[],
	current: string | null,
): string[] {
	const set = new Set<string>()
	for (const raw of fromBookings) {
		const t = raw?.trim()
		if (t) set.add(t)
	}
	const cur = current?.trim()
	if (cur) set.add(cur)
	return [...set].sort((a, b) => a.localeCompare(b))
}
