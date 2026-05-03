import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { logOpsAction } from '@/lib/ops-action-log'

describe('logOpsAction', () => {
	let logSpy: ReturnType<typeof vi.spyOn>

	beforeEach(() => {
		logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
	})

	afterEach(() => {
		logSpy.mockRestore()
	})

	it('emits JSON with scope and redacts long meta strings', () => {
		logSpy.mockClear()
		logOpsAction({
			action: 'testAction',
			outcome: 'success',
			level: 'info',
			correlationId: 'cid',
			meta: { note: 'x'.repeat(200) },
		})
		expect(logSpy).toHaveBeenCalledTimes(1)
		const line = logSpy.mock.calls[0][0] as string
		const obj = JSON.parse(line) as Record<string, unknown>
		expect(obj.scope).toBe('ops_action')
		expect(obj.action).toBe('testAction')
		expect(obj.correlationId).toBe('cid')
		const meta = obj.meta as Record<string, unknown>
		expect(String(meta.note)).toContain('redacted')
	})
})
