import { describe, expect, it } from 'vitest'

import { buildCommsRegistryActivityFeed } from '@/features/ops/lib/comms-registry-activity'
import type { CommsDispatchRuleRowDb } from '@/types/database.types'

describe('buildCommsRegistryActivityFeed', () => {
	it('sorts by updated_at descending and respects limit', () => {
		const rules: CommsDispatchRuleRowDb[] = [
			makeRule('a', '2020-01-01T00:00:00.000Z'),
			makeRule('b', '2022-01-01T00:00:00.000Z'),
		]
		const templates = [
			makeTpl('t1', '2021-06-01T00:00:00.000Z'),
			makeTpl('t2', '2023-01-01T00:00:00.000Z'),
		]
		const feed = buildCommsRegistryActivityFeed(rules, templates, 2)
		expect(feed).toHaveLength(2)
		expect(feed[0]?.headline).toContain('Template')
		expect(feed[0]?.occurredAt).toBe('2023-01-01T00:00:00.000Z')
		expect(feed[1]?.occurredAt).toBe('2022-01-01T00:00:00.000Z')
	})
})

function makeRule(id: string, updated_at: string): CommsDispatchRuleRowDb {
	return {
		id,
		event_key: 'test.event',
		channel: 'email',
		recipient_role: 'booker',
		recipient_filter: {},
		active: true,
		created_at: updated_at,
		updated_at,
	}
}

function makeTpl(id: string, updated_at: string) {
	return {
		id,
		event_key: 'test.event',
		channel: 'sms',
		subject: null as string | null,
		active: true,
		version: 1,
		created_at: updated_at,
		updated_at,
	}
}
