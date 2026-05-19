/** Row shape for `public.referrers` (ops / finance UI). */
export type ReferrerRow = {
	id: string
	name: string
	code: string | null
	email: string | null
	status: 'active' | 'inactive'
	commission_rate: number | null
	created_at: string
}

export type ReferrerOption = Pick<ReferrerRow, 'id' | 'name' | 'code' | 'status'>

export function formatReferrerLabel(row: Pick<ReferrerRow, 'name' | 'code'>): string {
	const code = row.code?.trim()
	if (code) {
		return `${row.name} (${code})`
	}
	return row.name
}

/** PostgREST embed on bookings queue (`referrers (...)`). */
export function referrerLabelFromBookingEmbed(raw: unknown): string {
	if (!raw || typeof raw !== 'object') {
		return '—'
	}
	const obj = Array.isArray(raw) ? raw[0] : raw
	if (!obj || typeof obj !== 'object') {
		return '—'
	}
	const name = (obj as { name?: unknown }).name
	const code = (obj as { code?: unknown }).code
	if (typeof name !== 'string' || !name.trim()) {
		return '—'
	}
	return formatReferrerLabel({
		name: name.trim(),
		code: typeof code === 'string' ? code : null,
	})
}
