/**
 * FE.17.3 / NFR.17.8 — user-visible strings for ops sidebar chrome (legacy region, promo fallbacks, badge hints).
 */
export const opsSidebarCopy = {
	legacyPill: 'Legacy',
	promoFallbackTitle: 'Ops sidebar promo',
	promoFallbackBody: 'Set NEXT_PUBLIC_OPS_SIDEBAR_PROMO_JSON with title (and optional body, href, imageUrl).',
	promoImageAlt: 'Promo',
} as const

/** Appended to link `title` when a count badge is shown (supplemental context). */
export function opsSidebarNavBadgeTitleSuffix(count: number): string {
	return ` (${count})`
}
