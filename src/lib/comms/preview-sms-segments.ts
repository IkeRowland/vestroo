/**
 * Epic 15 / **15C.4** — SMS length / segment **approximation** for ops preview (not a billing-grade calculator).
 *
 * - **GSM-7** path when every Unicode scalar is U+0000–U+007F (ASCII). Segments: 160 (single) / 153 (concatenated).
 * - Otherwise **UCS-2**: 70 / 67 per segment (common SMS UCS-2 rules).
 *
 * Extended GSM-7 characters that consume two septets are **not** modelled; those messages may be slightly underestimated
 * when still ASCII-only — called out in UI helper text.
 */
export type SmsPreviewSegmentInfo = {
	encoding: 'GSM-7' | 'UCS-2'
	/** Count of Unicode scalar values (spread operator / code points). */
	characters: number
	segments: number
}

function isAsciiOnlyScalars(text: string): boolean {
	for (const ch of text) {
		const cp = ch.codePointAt(0)
		if (cp === undefined || cp > 0x7f) {
			return false
		}
	}
	return true
}

export function estimateSmsPreviewSegments(body: string): SmsPreviewSegmentInfo {
	const characters = [...body].length
	if (characters === 0) {
		return { encoding: 'GSM-7', characters: 0, segments: 0 }
	}
	const gsm7 = isAsciiOnlyScalars(body)
	if (gsm7) {
		const segments = characters <= 160 ? 1 : Math.ceil(characters / 153)
		return { encoding: 'GSM-7', characters, segments }
	}
	const segments = characters <= 70 ? 1 : Math.ceil(characters / 67)
	return { encoding: 'UCS-2', characters, segments }
}
