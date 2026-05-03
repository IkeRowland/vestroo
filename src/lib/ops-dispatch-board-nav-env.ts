/**
 * Epic 16 / Theme A — **US-A3**: show **`/ops/dispatch`** in the ops sidebar only when the Theme C
 * board route is shipped **and** ops wants the link live. When unset/false, the nav item is omitted
 * so production never ships a dead primary link (Story **16.22** / Reconciliation).
 *
 * Client-safe **`NEXT_PUBLIC_*`** — parsed with the same truthy convention as SMS / dispatch suggestions.
 */
export function isOpsDispatchBoardNavEnabled(): boolean {
	const v = process.env.NEXT_PUBLIC_OPS_DISPATCH_BOARD_NAV_ENABLED
	if (v === undefined) return false
	const t = v.trim().toLowerCase()
	return t === '1' || t === 'true' || t === 'yes' || t === 'on'
}
