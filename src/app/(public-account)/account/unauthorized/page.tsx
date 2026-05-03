import Link from 'next/link'

import { Button } from '@/components/ui/button'

import { AccountPublicAuthCard } from '@/features/account/components/AccountPublicAuthCard'
import { accountAuthSurfacesCopy } from '@/features/account/copy/account-auth-surfaces-copy'

export default function AccountUnauthorizedPage() {
	return (
		<AccountPublicAuthCard
			title={accountAuthSurfacesCopy.unauthorized.title}
			description={
				<p className="text-sm leading-relaxed">{accountAuthSurfacesCopy.unauthorized.body}</p>
			}
		>
			<Button
				asChild
				className="min-h-11 w-full bg-account-accent text-account-accent-foreground hover:bg-account-accent/90 focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas"
			>
				<Link href="/">{accountAuthSurfacesCopy.unauthorized.returnHome}</Link>
			</Button>
		</AccountPublicAuthCard>
	)
}
