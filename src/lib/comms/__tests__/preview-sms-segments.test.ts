import { describe, expect, it } from 'vitest'

import { estimateSmsPreviewSegments } from '@/lib/comms/preview-sms-segments'

describe('estimateSmsPreviewSegments', () => {
	it('returns zero segments for empty body', () => {
		const r = estimateSmsPreviewSegments('')
		expect(r.characters).toBe(0)
		expect(r.segments).toBe(0)
	})

	it('uses GSM-7 single segment for short ASCII', () => {
		const r = estimateSmsPreviewSegments('Hello preview')
		expect(r.encoding).toBe('GSM-7')
		expect(r.characters).toBe(13)
		expect(r.segments).toBe(1)
	})

	it('uses UCS-2 when non-ASCII present', () => {
		const r = estimateSmsPreviewSegments('Café preview')
		expect(r.encoding).toBe('UCS-2')
		expect(r.segments).toBe(1)
	})
})
