import { redirect } from 'next/navigation'

/** Preserves query string when moving legacy **`/ops/*`** routes to their canonical URL. */
export function redirectLegacyOpsRoute(
	basePath: string,
	raw: Record<string, string | string[] | undefined>,
): never {
	const params = new URLSearchParams()
	for (const [key, val] of Object.entries(raw)) {
		if (val === undefined) continue
		if (Array.isArray(val)) {
			for (const item of val) {
				params.append(key, item)
			}
		} else {
			params.append(key, val)
		}
	}
	const q = params.toString()
	redirect(q ? `${basePath}?${q}` : basePath)
}
