/**
 * Normalized domain from an email local-part@domain (lowercase, trimmed).
 * Returns null if the address has no usable domain segment.
 */
export function extractEmailDomain(email: string): string | null {
	const trimmed = email.trim()
	const at = trimmed.lastIndexOf('@')
	if (at <= 0 || at === trimmed.length - 1) {
		return null
	}
	const domain = trimmed.slice(at + 1).trim().toLowerCase()
	if (!domain || domain.includes(' ') || domain.includes('@')) {
		return null
	}
	return domain
}
