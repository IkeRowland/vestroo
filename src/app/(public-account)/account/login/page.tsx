import Link from 'next/link'

import { AccountLoginForm } from '@/features/account/components/AccountLoginForm'
import {
	AccountPublicAuthCard,
	accountPublicAuthSecondaryLinkClassName,
} from '@/features/account/components/AccountPublicAuthCard'
import { AccountPublicAuthHelpRow } from '@/features/account/components/AccountPublicAuthHelpRow'
import { accountAuthSurfacesCopy } from '@/features/account/copy/account-auth-surfaces-copy'

type SearchParams = Promise<{ next?: string; returnUrl?: string }>

export default async function AccountLoginPage({
	searchParams,
}: {
	searchParams: SearchParams
}) {
	const sp = await searchParams
	/** `next` is the project convention; `returnUrl` is an **15C.6** alias (same contract). */
	const rawNext = sp.next ?? sp.returnUrl
	const nextPath =
		rawNext &&
		rawNext.startsWith('/account') &&
		!rawNext.startsWith('/account/login') &&
		!rawNext.startsWith('/account/unauthorized')
			? rawNext
			: '/account'

	return (
		<AccountPublicAuthCard
			title={accountAuthSurfacesCopy.login.title}
			description={accountAuthSurfacesCopy.login.description}
			ancillary={<AccountPublicAuthHelpRow />}
			footer={
				<p className="mt-6 text-center text-sm">
					<Link href="/" className={accountPublicAuthSecondaryLinkClassName}>
						{accountAuthSurfacesCopy.footer.backToSite}
					</Link>
				</p>
			}
		>
			<AccountLoginForm nextPath={nextPath} />
		</AccountPublicAuthCard>
	)
}
