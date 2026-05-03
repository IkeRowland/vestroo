/**
 * Epic 15 / **15C.4** — deterministic `{{ name }}` substitution for ops template preview.
 *
 * **Delimiter:** matches production matrix sends (`src/lib/comms/dispatch-email.ts` `replaceBookingRefPlaceholders`):
 * `{{token}}`, `{{ token }}`, case-insensitive token name. Only **`[A-Za-z0-9_]+`** names are matched.
 *
 * **Missing keys:** the original placeholder substring is left unchanged (ops-visible signal).
 */
const PLACEHOLDER = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g

export function substituteCommsTemplatePlaceholders(
	input: string,
	vars: Record<string, string>,
): string {
	return input.replace(PLACEHOLDER, (full, rawName: string) => {
		const key = rawName.toLowerCase()
		const value = vars[key]
		if (value === undefined) {
			return full
		}
		return value
	})
}
