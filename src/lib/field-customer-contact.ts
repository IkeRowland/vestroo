/**
 * POPIA-oriented minimal contact surface for field app.
 * Display is masked; `tel:` uses the stored number for the device dialer only.
 */

const CONTACT_ELIGIBLE_STATUSES = new Set(['assigned', 'en_route'])

export function tripStatusAllowsCustomerContact(status: string): boolean {
	return CONTACT_ELIGIBLE_STATUSES.has(status)
}

/** E.g. `***8214` for display when digits allow. */
export function maskCustomerPhoneForDisplay(phone: string | null): string | null {
	if (!phone?.trim()) return null
	const digits = phone.replace(/\D/g, '')
	if (digits.length < 4) {
		return '***'
	}
	const last4 = digits.slice(-4)
	return `***${last4}`
}

/** `tel:` href; strips characters that break dialer handlers. */
export function buildTelHref(phone: string | null): string | null {
	if (!phone?.trim()) return null
	const cleaned = phone.replace(/[^\d+]/g, '')
	if (!cleaned) return null
	return `tel:${cleaned}`
}
