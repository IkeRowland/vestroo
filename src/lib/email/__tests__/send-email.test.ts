import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockSend = vi.hoisted(() => vi.fn())

vi.mock('resend', () => ({
	Resend: class {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		constructor(_key: string) {}
		get emails() {
			return { send: mockSend }
		}
	},
}))

import { sendEmail } from '../send'
import { isResendTestApiKey } from '../resend-test-api-key'

describe('isResendTestApiKey', () => {
	it('returns true for Resend test key prefix', () => {
		expect(isResendTestApiKey('re_test_abc123')).toBe(true)
		expect(isResendTestApiKey('  re_test_x  ')).toBe(true)
	})

	it('returns false for non-test keys and empty', () => {
		expect(isResendTestApiKey('re_abc123')).toBe(false)
		expect(isResendTestApiKey('')).toBe(false)
		expect(isResendTestApiKey('   ')).toBe(false)
	})
})

describe('sendEmail', () => {
	beforeEach(() => {
		mockSend.mockReset()
		process.env.RESEND_FROM_EMAIL = 'noreply@test.example'
		process.env.RESEND_API_KEY = 're_test_placeholder'
		vi.stubEnv('NODE_ENV', 'test')
	})

	afterEach(() => {
		vi.unstubAllEnvs()
		vi.restoreAllMocks()
	})

	it('returns simulated Resend failure when E2E_SIMULATE_RESEND_API_FAILURE=1 (non-production)', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		process.env.RESEND_API_KEY = 're_test_ignored_when_simulating'
		process.env.E2E_SIMULATE_RESEND_API_FAILURE = '1'
		const res = await sendEmail({
			to: 'guest@example.com',
			subject: 'Hello',
			html: '<p>x</p>',
		})
		expect(res).toEqual({
			ok: false,
			error: { kind: 'resend_api', message: 'Simulated Resend API failure (E2E)' },
		})
		expect(mockSend).not.toHaveBeenCalled()
		delete process.env.E2E_SIMULATE_RESEND_API_FAILURE
	})

	it('does not call Resend when NODE_ENV is not production and key matches re_test_', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		process.env.RESEND_API_KEY = 're_test_abc'
		const logSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

		const res = await sendEmail({
			to: 'guest@example.com',
			subject: 'Hello',
			html: '<p>x</p>',
		})

		expect(res).toEqual({ ok: true, mode: 'skipped_test_mode' })
		expect(mockSend).not.toHaveBeenCalled()
		expect(logSpy).toHaveBeenCalledWith(
			'[vestroo:email] skipped_test_mode (no Resend API call)',
			expect.objectContaining({
				to: 'guest@example.com',
				subject: 'Hello',
				from: 'noreply@test.example',
			}),
		)
		logSpy.mockRestore()
	})

	it('does not log full HTML at info for test-mode skip', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		process.env.RESEND_API_KEY = 're_test_abc'
		const logSpy = vi.spyOn(console, 'info').mockImplementation(() => {})

		await sendEmail({
			to: 'guest@example.com',
			subject: 'Subj',
			html: '<p>secret-body-do-not-log</p>',
		})

		const payload = logSpy.mock.calls[0]?.[1] as Record<string, unknown> | undefined
		expect(payload).toBeDefined()
		expect(JSON.stringify(logSpy.mock.calls)).not.toContain('secret-body')
		logSpy.mockRestore()
	})

	it('invokes Resend send once on live path (non-test key)', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		process.env.RESEND_API_KEY = 're_abcdef123456789'
		mockSend.mockResolvedValueOnce({ data: { id: 'msg-1' }, error: null })

		const res = await sendEmail({
			to: 'guest@example.com',
			subject: 'Quote',
			html: '<p>body</p>',
		})

		expect(res).toEqual({ ok: true, mode: 'sent', messageId: 'msg-1' })
		expect(mockSend).toHaveBeenCalledTimes(1)
		const arg = mockSend.mock.calls[0]?.[0] as { to: string; subject: string; html: string }
		expect(arg.to).toBe('guest@example.com')
		expect(arg.subject).toBe('Quote')
		expect(JSON.stringify(mockSend.mock.calls)).not.toMatch(/re_abcdef/)
	})

	it('returns structured missing_env when RESEND_API_KEY absent on live path', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		delete process.env.RESEND_API_KEY

		const res = await sendEmail({
			to: 'guest@example.com',
			subject: 'S',
			html: '<p>h</p>',
		})

		expect(res).toEqual({
			ok: false,
			error: {
				kind: 'missing_env',
				message: expect.stringMatching(/RESEND_API_KEY/) as string,
			},
		})
		expect(mockSend).not.toHaveBeenCalled()
	})

	it('returns structured missing_env when production and RESEND_FROM_EMAIL missing', async () => {
		vi.stubEnv('NODE_ENV', 'production')
		process.env.RESEND_API_KEY = 're_live_or_non_test_key_xxxxxxxx'
		delete process.env.RESEND_FROM_EMAIL

		const res = await sendEmail({
			to: 'guest@example.com',
			subject: 'S',
			html: '<p>h</p>',
		})

		expect(res).toEqual({
			ok: false,
			error: {
				kind: 'missing_env',
				message: expect.stringMatching(/RESEND_FROM_EMAIL/) as string,
			},
		})
		expect(mockSend).not.toHaveBeenCalled()
	})

	it('returns resend_api when SDK reports error', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		process.env.RESEND_API_KEY = 're_non_test_xxxxxxxx'
		mockSend.mockResolvedValueOnce({
			data: null,
			error: { message: 'Invalid domain' },
		})

		const res = await sendEmail({
			to: 'guest@example.com',
			subject: 'S',
			html: '<p>h</p>',
		})

		expect(res).toEqual({
			ok: false,
			error: { kind: 'resend_api', message: 'Invalid domain' },
		})
	})

	it('public result shape for skip path has no secret fields', async () => {
		vi.stubEnv('NODE_ENV', 'development')
		process.env.RESEND_API_KEY = 're_test_secret_suffix'
		vi.spyOn(console, 'info').mockImplementation(() => {})
		const res = await sendEmail({
			to: 'guest@example.com',
			subject: 'S',
			html: '<p>h</p>',
		})
		expect(res).toEqual({ ok: true, mode: 'skipped_test_mode' })
		expect(JSON.stringify(res)).not.toContain('secret_suffix')
	})
})
