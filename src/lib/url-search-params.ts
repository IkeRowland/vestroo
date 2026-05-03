/** First scalar string for a Next.js `searchParams` entry (may be `string[]`). */
export function pickFirstSearchParam(
	raw: Record<string, string | string[] | undefined>,
	key: string,
): string | undefined {
	const v = raw[key]
	if (v === undefined) return undefined
	const x = Array.isArray(v) ? v[0] : v
	return typeof x === 'string' ? x : undefined
}
