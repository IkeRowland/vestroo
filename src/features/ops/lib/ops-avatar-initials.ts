/**
 * Deterministic avatar initials from display **`name`** (Story 17.7 / FE.17.8).
 * — trim → split on whitespace (drop empties)
 * — **≥ 2** words: first letter of first word + first letter of **last** word
 * — **1** word: first **two** letters (ASCII slice)
 * — **max 2** characters, **`toUpperCase()`** for display
 */
export function opsAvatarInitialsFromName(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean)
	if (parts.length === 0) {
		return '?'
	}
	if (parts.length >= 2) {
		const a = parts[0].charAt(0)
		const b = parts[parts.length - 1].charAt(0)
		return `${a}${b}`.toUpperCase().slice(0, 2)
	}
	return parts[0].slice(0, 2).toUpperCase()
}
