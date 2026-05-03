/**
 * URL contract for **`/ops/clients`** (Story 17.11 / FE.17.12 item 5).
 * Future **`page` / `per`** (pagination) merge here additively — do not reuse **`id`** for other semantics.
 */
export const OPS_CLIENTS_PATH = '/ops/clients' as const

export function getRawOpsClientsSelectedId(
	raw: Record<string, string | string[] | undefined>,
): string | null {
	const v = raw.id
	const s = Array.isArray(v) ? v[0] : v
	const id = (s ?? '').trim()
	return id.length > 0 ? id : null
}

/** Returns **`null`** when absent or not in the known-id allowlist (caller may redirect). */
export function parseOpsClientsPageSearchParams(
	raw: Record<string, string | string[] | undefined>,
	knownAccountIds: ReadonlySet<string>,
): string | null {
	const rawId = getRawOpsClientsSelectedId(raw)
	if (!rawId) return null
	return knownAccountIds.has(rawId) ? rawId : null
}

export function buildOpsClientsHref(opts: { id?: string | null }): string {
	if (!opts.id) return OPS_CLIENTS_PATH
	const p = new URLSearchParams()
	p.set('id', opts.id)
	return `${OPS_CLIENTS_PATH}?${p.toString()}`
}
