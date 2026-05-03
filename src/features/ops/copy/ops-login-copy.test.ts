import { opsLoginCopy } from '@/features/ops/copy/ops-login-copy'

describe('opsLoginCopy (Story 17.19)', () => {
	it('exports epic subtitle and footer strings', () => {
		expect(opsLoginCopy.subtitle).toBe('Vestroo Operations')
		expect(opsLoginCopy.footerNeedAccount).toContain('Contact your administrator')
		expect(opsLoginCopy.forgotPasswordHref).toBe('/contact')
	})
})
