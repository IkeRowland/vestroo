/**
 * `/ops/login` strings (Story 17.19 / FE.17.11) — NFR.17.8.
 *
 * **Forgot password:** No in-app Supabase `resetPasswordForEmail` route yet — link targets
 * **`/contact`** so staff can request assistance (parity § 17.19).
 */
export const opsLoginCopy = {
	brandAria: 'Vestroo',
	pageTitle: 'Sign in',
	subtitle: 'Vestroo Operations',
	staffHint: 'Dispatcher or admin profile required.',
	forgotPassword: 'Forgot password?',
	/** Interim: contact until a dedicated password-reset route exists */
	forgotPasswordHref: '/contact',
	footerNeedAccount: 'Need an account? Contact your administrator.',
	backToSite: 'Back to site',
	backToSiteHref: '/',
	fieldEmail: 'Email',
	fieldPassword: 'Password',
	submit: 'Sign in',
	submitPending: 'Signing in…',
} as const
