/**
 * Maps `profiles.full_name` ↔ first / last fields for the account profile UI.
 * Convention: first token = first name; remainder (trimmed) = last name (may be empty).
 */
export function splitProfileFullName(fullName: string): { firstName: string; lastName: string } {
	const t = fullName.trim()
	if (!t) return { firstName: '', lastName: '' }
	const sp = t.search(/\s/)
	if (sp === -1) return { firstName: t, lastName: '' }
	return { firstName: t.slice(0, sp).trim(), lastName: t.slice(sp + 1).trim() }
}

export function joinProfileFullName(firstName: string, lastName: string): string {
	return `${firstName.trim()} ${lastName.trim()}`.trim()
}
