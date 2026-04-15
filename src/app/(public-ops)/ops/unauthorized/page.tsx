import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function OpsUnauthorizedPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4 text-center">
			<h1 className="text-xl font-semibold text-foreground">Access denied</h1>
			<p className="mt-2 max-w-md text-sm text-muted-foreground">
				This console is restricted to dispatcher and admin profiles. Customer and
				chauffeur accounts cannot open operational routes.
			</p>
			<Button asChild className="mt-6 min-h-11">
				<Link href="/">Return home</Link>
			</Button>
		</div>
	)
}
