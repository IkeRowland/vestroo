import Link from 'next/link'

import { Button } from '@/components/ui/button'

export default function OpsUnauthorizedPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-ops-canvas px-4 text-center text-ops-foreground">
			<h1 className="text-xl font-semibold">Access denied</h1>
			<p className="mt-2 max-w-md text-sm text-ops-muted">
				This console is restricted to dispatcher and admin profiles. Customer and driver accounts cannot
				open operational routes.
			</p>
			<Button
				asChild
				className="mt-6 min-h-11 border-0 bg-ops-accent text-ops-accent-foreground hover:bg-ops-accent/90 focus-visible:ring-ops-accent"
			>
				<Link href="/">Return home</Link>
			</Button>
		</div>
	)
}
