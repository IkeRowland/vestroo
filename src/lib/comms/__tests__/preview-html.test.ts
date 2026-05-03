import { describe, expect, it } from 'vitest'

import { sanitizeCommsPreviewHtml } from '@/lib/comms/preview-html'

describe('sanitizeCommsPreviewHtml', () => {
	it('strips script tags from substituted HTML', () => {
		const dirty = '<p>Hi</p><script>alert(1)</script><p>Bye</p>'
		const clean = sanitizeCommsPreviewHtml(dirty)
		expect(clean.toLowerCase()).not.toContain('<script')
		expect(clean).toContain('Hi')
	})
})
