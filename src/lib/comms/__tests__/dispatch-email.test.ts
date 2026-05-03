import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/comms/matrix-queries', () => ({
	fetchActiveCommsDispatchRules: vi.fn(),
	fetchActiveCommsTemplate: vi.fn(),
}))

vi.mock('@/lib/comms/recipient-resolve', () => ({
	resolveCommsEmailRecipient: vi.fn(),
}))

vi.mock('@/lib/email/send', () => ({
	sendEmail: vi.fn(),
}))

vi.mock('@/lib/ops-audit', () => ({
	appendOpsAuditLog: vi.fn(),
}))

import {
	fetchActiveCommsDispatchRules,
	fetchActiveCommsTemplate,
} from '@/lib/comms/matrix-queries'
import { resolveCommsEmailRecipient } from '@/lib/comms/recipient-resolve'
import {
	loadCommsEmailMatrixGate,
	sendCommsMatrixEmailDispatches,
} from '@/lib/comms/dispatch-email'
import { sendEmail } from '@/lib/email/send'

const fetchRules = vi.mocked(fetchActiveCommsDispatchRules)
const fetchTemplate = vi.mocked(fetchActiveCommsTemplate)
const resolveRecipient = vi.mocked(resolveCommsEmailRecipient)
const sendEmailMock = vi.mocked(sendEmail)

describe('loadCommsEmailMatrixGate', () => {
	const sb = {} as never

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('returns no_rules when there are no active rules', async () => {
		fetchRules.mockResolvedValue([])
		const r = await loadCommsEmailMatrixGate(sb, 'payment_received', 'email')
		expect(r.ok).toBe(false)
		if (!r.ok) expect(r.kind).toBe('no_rules')
	})

	it('returns no_template when rules exist but no active template', async () => {
		fetchRules.mockResolvedValue([
			{
				id: 'd1',
				event_key: 'payment_received',
				channel: 'email',
				recipient_role: 'customer',
				recipient_filter: {},
				active: true,
				created_at: '',
				updated_at: '',
			},
		])
		fetchTemplate.mockResolvedValue(null)
		const r = await loadCommsEmailMatrixGate(sb, 'payment_received', 'email')
		expect(r.ok).toBe(false)
		if (!r.ok) expect(r.kind).toBe('no_template')
	})

	it('returns snapshot when rules and template exist', async () => {
		fetchRules.mockResolvedValue([
			{
				id: 'd1',
				event_key: 'payment_received',
				channel: 'email',
				recipient_role: 'customer',
				recipient_filter: {},
				active: true,
				created_at: '',
				updated_at: '',
			},
		])
		fetchTemplate.mockResolvedValue({
			id: 't1',
			event_key: 'payment_received',
			channel: 'email',
			subject: 'S',
			body_html: '<p>x</p>',
			body_text: null,
			sms_body: null,
			version: 1,
			active: true,
			created_at: '',
			updated_at: '',
		})
		const r = await loadCommsEmailMatrixGate(sb, 'payment_received', 'email')
		expect(r.ok).toBe(true)
	})
})

describe('sendCommsMatrixEmailDispatches', () => {
	const userSb = {} as never
	const serviceSb = {} as never

	const snapshot = {
		rules: [
			{
				id: 'd1',
				event_key: 'payment_received',
				channel: 'email' as const,
				recipient_role: 'customer',
				recipient_filter: {},
				active: true,
				created_at: '',
				updated_at: '',
			},
		],
		template: {
			id: 't1',
			event_key: 'payment_received',
			channel: 'email' as const,
			subject: null,
			body_html: null,
			body_text: null,
			sms_body: null,
			version: 1,
			active: true,
			created_at: '',
			updated_at: '',
		},
	}

	beforeEach(() => {
		vi.clearAllMocks()
		resolveRecipient.mockResolvedValue({ ok: true, email: 'a@b.co' })
		sendEmailMock.mockResolvedValue({ ok: true, mode: 'sent', messageId: 'm1' })
	})

	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('uses fallback subject/html when template fields are empty', async () => {
		const res = await sendCommsMatrixEmailDispatches({
			serviceSupabase: serviceSb,
			userSupabase: userSb,
			staffActorId: 'u1111111-1111-4111-8111-111111111111',
			eventKey: 'payment_received',
			channel: 'email',
			entity: 'booking',
			entityId: 'b1111111-1111-4111-8111-111111111111',
			bookingId: 'b1111111-1111-4111-8111-111111111111',
			booking: {
				client_type: 'walk_in',
				customer_email: 'a@b.co',
				customer_id: null,
				customer_account_id: null,
				account_snapshot: null,
			},
			bookingRefLabel: 'REF',
			snapshot,
			getFallbackEmail: async () => ({ subject: 'SubFB', html: '<p>FB</p>' }),
			baseIdempotencyKey: 'pay:1',
		})

		expect(res.outcome).toBe('sent')
		const call = sendEmailMock.mock.calls[0]
		const payload = call[0] as { html: string; subject: string; to: string; idempotencyKey: string }
		expect(payload.to).toBe('a@b.co')
		expect(payload.subject).toBe('SubFB')
		expect(payload.idempotencyKey).toBe('pay:1:d1')
		expect(payload.html).toContain('<p>FB</p>')
		expect(payload.html).toMatch(/operational notice/i)
		expect(
			(call[0] as { headers?: Record<string, string> }).headers,
		).toBeUndefined()
	})

	/**
	 * 15.26 (15C.8 / §6) — `payment_received` is transactional: no member `comms_preferences` read in
	 * `sendCommsMatrixEmailDispatches` or `resolveCommsEmailRecipient`; `sendEmail` is still called when
	 * a recipient resolves (no marketing suppression).
	 * §6 / AC5: assembled HTML must not leave literal `{{` after variable substitution.
	 */
	it('15C.8: payment_received substitutes {{customer_name}}; outbound HTML has no raw `{{`', async () => {
		const withPlaceholders = {
			...snapshot,
			rules: snapshot.rules.map((r) => ({ ...r, event_key: 'payment_received' })),
			template: {
				...snapshot.template,
				event_key: 'payment_received',
				subject: 'Paid — {{customer_name}}',
				body_html: '<p>Hi {{customer_name}}, ref {{ booking_ref }}.</p>',
			},
		}
		const res = await sendCommsMatrixEmailDispatches({
			serviceSupabase: serviceSb,
			userSupabase: userSb,
			staffActorId: 'u1111111-1111-4111-8111-111111111111',
			eventKey: 'payment_received',
			channel: 'email',
			entity: 'booking',
			entityId: 'b1111111-1111-4111-8111-111111111111',
			bookingId: 'b1111111-1111-4111-8111-111111111111',
			booking: {
				client_type: 'walk_in',
				customer_email: 'a@b.co',
				customer_id: null,
				customer_account_id: null,
				account_snapshot: null,
			},
			bookingRefLabel: 'REF-9001',
			templateVariableMap: { customer_name: 'Test Customer' },
			snapshot: withPlaceholders as never,
			getFallbackEmail: async () => ({ subject: 'SubFB', html: '<p>FB</p>' }),
			baseIdempotencyKey: 'pay:15c8',
		})
		expect(res.outcome).toBe('sent')
		const payload = sendEmailMock.mock.calls[0][0] as { html: string; subject: string }
		expect(payload.html).not.toMatch(/\{\{/)
		expect(payload.html).toContain('Test Customer')
		expect(payload.subject).not.toMatch(/\{\{/)
		expect(payload.subject).toContain('Test Customer')
	})

	it('for informational + account booker, adds List-Unsubscribe and preference footer', async () => {
		vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.vestroo.com')
		const res = await sendCommsMatrixEmailDispatches({
			serviceSupabase: serviceSb,
			userSupabase: userSb,
			staffActorId: 'u1111111-1111-4111-8111-111111111111',
			eventKey: 'quote_sent_account',
			channel: 'email',
			entity: 'quote',
			entityId: 'q1',
			bookingId: 'b1111111-1111-4111-8111-111111111111',
			booking: {
				client_type: 'account_client',
				customer_email: 'a@b.co',
				customer_id: 'p1111111-1111-4111-8111-111111111111',
				customer_account_id: 'a1111111-1111-4111-8111-111111111111',
				account_snapshot: null,
			},
			bookingRefLabel: 'REF',
			snapshot: {
				...snapshot,
				rules: snapshot.rules.map((r) => ({ ...r, event_key: 'quote_sent_account' })),
			} as never,
			getFallbackEmail: async () => ({ subject: 'Q', html: '<p>quote</p>' }),
			baseIdempotencyKey: 'q:1',
		})
		expect(res.outcome).toBe('sent')
		const payload = sendEmailMock.mock.calls[0][0] as {
			html: string
			headers?: Record<string, string>
		}
		expect(payload.html).toMatch(/Manage email preferences/i)
		expect(payload.html).toMatch(/company|vestroo/i)
		const unsub = payload.headers?.['List-Unsubscribe'] ?? ''
		expect(unsub).toContain('https://app.vestroo.com/account/preferences')
		expect(unsub).toContain('category=informational')
	})

	it('16.16: appendBeforeComplianceFooterHtml is merged before compliance footer', async () => {
		const res = await sendCommsMatrixEmailDispatches({
			serviceSupabase: serviceSb,
			userSupabase: userSb,
			staffActorId: 'u1111111-1111-4111-8111-111111111111',
			eventKey: 'payment_received',
			channel: 'email',
			entity: 'booking',
			entityId: 'b1111111-1111-4111-8111-111111111111',
			bookingId: 'b1111111-1111-4111-8111-111111111111',
			booking: {
				client_type: 'walk_in',
				customer_email: 'a@b.co',
				customer_id: null,
				customer_account_id: null,
				account_snapshot: null,
			},
			bookingRefLabel: 'REF',
			appendBeforeComplianceFooterHtml:
				'<table data-test="eft-append"><tr><td>EFT block</td></tr></table>',
			snapshot,
			getFallbackEmail: async () => ({ subject: 'SubFB', html: '<p>FB</p>' }),
			baseIdempotencyKey: 'pay:append',
		})
		expect(res.outcome).toBe('sent')
		const payload = sendEmailMock.mock.calls[0][0] as { html: string }
		expect(payload.html).toContain('data-test="eft-append"')
		expect(payload.html).toContain('<p>FB</p>')
		expect(payload.html.indexOf('EFT block')).toBeLessThan(payload.html.indexOf('operational notice'))
	})
})
