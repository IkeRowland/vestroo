import { describe, expect, it } from 'vitest'

import {
	isCommsDispatchRecipientRole,
	parseCommsRecipientFilterJson,
} from '@/lib/ops-comms-registry-validate'

describe('parseCommsRecipientFilterJson', () => {
	it('accepts empty object', () => {
		expect(parseCommsRecipientFilterJson('{}')).toEqual({ ok: true, value: {} })
	})

	it('accepts object with keys', () => {
		expect(parseCommsRecipientFilterJson('{"a":1}')).toEqual({
			ok: true,
			value: { a: 1 },
		})
	})

	it('rejects empty string', () => {
		const r = parseCommsRecipientFilterJson('   ')
		expect(r.ok).toBe(false)
	})

	it('rejects invalid json', () => {
		const r = parseCommsRecipientFilterJson('{')
		expect(r.ok).toBe(false)
		if (!r.ok) expect(r.message).toMatch(/valid json/i)
	})

	it('rejects array root', () => {
		const r = parseCommsRecipientFilterJson('[]')
		expect(r.ok).toBe(false)
	})

	it('rejects null', () => {
		const r = parseCommsRecipientFilterJson('null')
		expect(r.ok).toBe(false)
	})
})

describe('isCommsDispatchRecipientRole', () => {
	it('accepts booker', () => {
		expect(isCommsDispatchRecipientRole('booker')).toBe(true)
	})

	it('rejects unknown', () => {
		expect(isCommsDispatchRecipientRole('nope')).toBe(false)
	})
})
