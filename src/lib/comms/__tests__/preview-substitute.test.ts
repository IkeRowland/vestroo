import { describe, expect, it } from 'vitest'

import { buildCommsPreviewVarMap } from '@/lib/comms/preview-seed'
import { substituteCommsTemplatePlaceholders } from '@/lib/comms/preview-substitute'

/** Representative matrix-style template body (inline fixture for **15C.4** / AC10). */
const REPRESENTATIVE_TEMPLATE_FIXTURE = `<p>Hello {{ customer_name }}, ref {{booking_ref}}.</p>
<p>Unknown: {{made_up_token}} stays.</p>`

describe('substituteCommsTemplatePlaceholders', () => {
	it('replaces known seeded keys and leaves unknown tokens literal (AC4)', () => {
		const vars = buildCommsPreviewVarMap('quote_sent_account')
		const out = substituteCommsTemplatePlaceholders(REPRESENTATIVE_TEMPLATE_FIXTURE, vars)
		expect(out).toContain('Preview Customer')
		expect(out).toContain('PREVIEW-REF-9001')
		expect(out).toContain('{{made_up_token}}')
		expect(out).not.toContain('{{ customer_name }}')
		expect(out).not.toContain('{{booking_ref}}')
	})

	it('matches spaced and compact delimiters like dispatch-email booking_ref helper', () => {
		const vars = { booking_ref: 'XYZ' }
		expect(substituteCommsTemplatePlaceholders('{{ booking_ref }}', vars)).toBe('XYZ')
		expect(substituteCommsTemplatePlaceholders('{{BOOKING_REF}}', vars)).toBe('XYZ')
	})

	it('is case-insensitive on variable names for lookup', () => {
		const vars = { booking_ref: 'lowercase-key' }
		expect(substituteCommsTemplatePlaceholders('{{Booking_Ref}}', vars)).toBe('lowercase-key')
	})
})
