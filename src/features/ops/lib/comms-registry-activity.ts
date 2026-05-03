import type { CommsDispatchRuleRowDb } from '@/types/database.types'

export type CommsRegistryActivityKind = 'dispatch_rule' | 'template'

export type CommsRegistryActivityItem = {
	id: string
	kind: CommsRegistryActivityKind
	occurredAt: string
	headline: string
	detail: string
}

type TemplateMeta = {
	id: string
	event_key: string
	channel: string
	updated_at: string
	version: number
	active: boolean
}

/**
 * Read-only activity ordering from **existing** registry payload only — no fabricated events (**NFR.17.6**).
 */
export function buildCommsRegistryActivityFeed(
	rules: CommsDispatchRuleRowDb[],
	templates: TemplateMeta[],
	limit = 24,
): CommsRegistryActivityItem[] {
	const items: CommsRegistryActivityItem[] = []

	for (const r of rules) {
		items.push({
			id: `rule:${r.id}`,
			kind: 'dispatch_rule',
			occurredAt: r.updated_at,
			headline: `Dispatch rule · ${r.event_key}`,
			detail: `${r.channel} · ${r.active ? 'active' : 'inactive'}`,
		})
	}

	for (const t of templates) {
		items.push({
			id: `tpl:${t.id}`,
			kind: 'template',
			occurredAt: t.updated_at,
			headline: `Template · ${t.event_key}`,
			detail: `${t.channel} · v${t.version} · ${t.active ? 'active' : 'inactive'}`,
		})
	}

	items.sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt))
	return items.slice(0, Math.max(0, limit))
}
