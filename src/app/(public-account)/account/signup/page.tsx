import Link from 'next/link'

import { AccountInviteSignupPanel } from '@/features/account/components/AccountInviteSignupPanel'
import {
	AccountPublicAuthCard,
	accountPublicAuthSecondaryLinkClassName,
} from '@/features/account/components/AccountPublicAuthCard'
import { accountAuthSurfacesCopy } from '@/features/account/copy/account-auth-surfaces-copy'
import { verifyAccountInviteToken } from '@/lib/account-invite-tokens'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ token?: string }>

function InvalidInvite({ message }: { message: string }) {
	return (
		<AccountPublicAuthCard
			title={accountAuthSurfacesCopy.invalidInvite.title}
			description={<p className="text-sm leading-relaxed">{message}</p>}
			footer={
				<p className="mt-6 text-center text-sm">
					<Link href="/account/login" className={accountPublicAuthSecondaryLinkClassName}>
						{accountAuthSurfacesCopy.footer.accountSignIn}
					</Link>
					<span className="text-account-muted" aria-hidden>
						{' · '}
					</span>
					<Link href="/" className={accountPublicAuthSecondaryLinkClassName}>
						{accountAuthSurfacesCopy.footer.backToSite}
					</Link>
				</p>
			}
		/>
	)
}

export default async function AccountSignupInvitePage({ searchParams }: { searchParams: SearchParams }) {
	const sp = await searchParams
	const raw = typeof sp.token === 'string' ? sp.token.trim() : ''
	if (!raw) {
		return <InvalidInvite message={accountAuthSurfacesCopy.invalidInvite.missingToken} />
	}

	const verified = verifyAccountInviteToken(raw)
	if (!verified.valid) {
		return (
			<InvalidInvite
				message={
					verified.reason === 'expired'
						? accountAuthSurfacesCopy.invalidInvite.expired
						: accountAuthSurfacesCopy.invalidInvite.invalid
				}
			/>
		)
	}

	return (
		<AccountPublicAuthCard>
			<AccountInviteSignupPanel
				token={raw}
				organisationName={verified.payload.accountName}
				invitedEmail={verified.payload.email}
				roleLabel={verified.payload.roleLabel}
			/>
		</AccountPublicAuthCard>
	)
}
