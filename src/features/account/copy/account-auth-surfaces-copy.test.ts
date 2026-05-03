import { accountAuthSurfacesCopy } from '@/features/account/copy/account-auth-surfaces-copy'

describe('accountAuthSurfacesCopy (Story 18.11 / FE.18.10)', () => {
	it('exports login title and pre-auth help label', () => {
		expect(accountAuthSurfacesCopy.login.title).toBe('Account portal sign-in')
		expect(accountAuthSurfacesCopy.help.needHelpSigningIn).toBe('Need help signing in?')
		expect(accountAuthSurfacesCopy.help.afterSignInNote).toContain('Help')
	})
})
