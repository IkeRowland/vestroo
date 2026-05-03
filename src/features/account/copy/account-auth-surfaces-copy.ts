/**
 * Non-i18n strings for public account auth routes (**Story 18.11** / **FE.18.10**).
 * Pre-auth surfaces only — not **`/account/help`** (**Story 18.10** / **FE.18.9**).
 */
export const accountAuthSurfacesCopy = {
	/** Home link wrapping **`VestrooMark`** (keyboard / SR). */
	brandHomeAria: 'Vestroo — back to marketing site',

	login: {
		title: 'Account portal sign-in',
		description:
			'For organisation members (admin, booker, or rider) on a customer account. Uses the same Supabase credentials as other Vestroo apps.',
		emailLabel: 'Email',
		passwordLabel: 'Password',
		submit: 'Sign in',
		submitPending: 'Signing in…',
	},

	help: {
		needHelpSigningIn: 'Need help signing in?',
		/** Secondary — no deep link; **`/account/help`** is member-only. */
		afterSignInNote: 'After you sign in, open Help from the account portal menu for FAQs and contact options.',
	},

	footer: {
		backToSite: 'Back to site',
		accountSignIn: 'Account sign-in',
	},

	invalidInvite: {
		title: 'Invitation unavailable',
		missingToken:
			'This page needs a valid invitation link. Ask your organisation admin to resend the invite.',
		expired: 'This invitation has expired. Ask your organisation admin for a new invite.',
		invalid: 'This invitation link is invalid. Ask your organisation admin for a new invite.',
	},

	unauthorized: {
		title: 'Access denied',
		body:
			'The account portal is only available if you are an accepted member (admin, booker, or rider) on a customer account. Your profile may not be linked yet, or your invite may still be pending acceptance.',
		returnHome: 'Return home',
	},

	invite: {
		title: 'Accept your invitation',
		orgLabel: 'Organisation',
		roleLabel: 'Your role',
		emailLabel: 'Invited email',
		loading: 'Loading…',
		wrongSessionIntro: 'You are signed in as',
		wrongSessionMid: 'but this invite is for',
		wrongSessionOutro:
			'Sign out and sign in with the invited address, or ask an admin to invite your current email.',
		signedInLead: 'Signed in as',
		signedInTrail: 'Complete the invite to open the account portal.',
		completeInvitation: 'Complete invitation',
		completingInvitation: 'Completing…',
		alreadyHaveAccountTitle: 'Already have an account?',
		alreadyHaveAccountBody: 'Sign in with the invited email, then return here if prompted.',
		signInSecondary: 'Sign in',
		createPasswordHeading: 'Create a password',
		createPasswordHint:
			'Use the invited email below (read-only). After sign-up you may need to confirm your email before finishing the invite.',
		emailFieldLabel: 'Email',
		passwordFieldLabel: 'Password',
		confirmPasswordFieldLabel: 'Confirm password',
		createAccount: 'Create account',
		creatingAccount: 'Creating account…',
		passwordMinError: 'Password must be at least 8 characters.',
		passwordMismatchError: 'Passwords do not match.',
		emailConfirmHint:
			'If email confirmation is required, check your inbox and then return to this link after confirming.',
		backToSite: 'Back to site',
	},
} as const
