import { registerAccountInviteSigningKeyFromEnvInInstrumentation } from '@/lib/account-invite-tokens'
import { registerQuoteLinkSigningKeyFromEnvInInstrumentation } from '@/lib/quote-tokens'

export function register(): void {
	// `NEXT_RUNTIME` is often `nodejs` here but can be unset in some `next dev` paths — only skip
	// Edge, where Node `crypto` signing is not loaded for this bundle.
	if (process.env.NEXT_RUNTIME === 'edge') {
		return
	}
	registerQuoteLinkSigningKeyFromEnvInInstrumentation()
	registerAccountInviteSigningKeyFromEnvInInstrumentation()
}
