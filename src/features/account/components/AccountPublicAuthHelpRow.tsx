import { resolveSupportEmailAddress } from '@/lib/email/email-copy'

import { accountAuthSurfacesCopy } from '@/features/account/copy/account-auth-surfaces-copy'

import { accountPublicAuthSecondaryLinkClassName } from '@/features/account/components/AccountPublicAuthCard'

/**
 * Pre-auth help: primary **`mailto:`** to support inbox (**Story 18.11** — **`/account/help`** is member-only).
 */
export function AccountPublicAuthHelpRow() {
	const email = resolveSupportEmailAddress()
	return (
		<div className="mt-6 space-y-2 border-t border-account-border pt-6">
			<p className="text-center text-sm">
				<a href={`mailto:${email}`} className={accountPublicAuthSecondaryLinkClassName}>
					{accountAuthSurfacesCopy.help.needHelpSigningIn}
				</a>
			</p>
			<p className="text-center text-xs leading-relaxed text-account-muted">
				{accountAuthSurfacesCopy.help.afterSignInNote}
			</p>
		</div>
	)
}
