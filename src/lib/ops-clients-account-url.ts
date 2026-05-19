/** Full-page account client profile under Ops → Clients. */
export const OPS_CLIENTS_ACCOUNTS_PATH_PREFIX = '/ops/clients/accounts' as const

export function opsAccountClientDetailPath(accountId: string): string {
	return `${OPS_CLIENTS_ACCOUNTS_PATH_PREFIX}/${encodeURIComponent(accountId)}`
}

export function opsAccountClientDetailHref(
	accountId: string,
	query?: string,
): string {
	const base = opsAccountClientDetailPath(accountId)
	if (!query || query.length === 0) return base
	return `${base}?${query}`
}
