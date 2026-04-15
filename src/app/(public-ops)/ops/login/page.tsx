import Link from 'next/link'

import { OpsLoginForm } from '@/features/ops/components/OpsLoginForm'

type SearchParams = Promise<{ next?: string }>

export default async function OpsLoginPage({
	searchParams,
}: {
	searchParams: SearchParams
}) {
	const sp = await searchParams
	const nextPath = sp.next && sp.next.startsWith('/ops') ? sp.next : '/ops/board'

	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 px-4">
			<div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
				<h1 className="text-xl font-semibold">Operations sign-in</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Dispatcher and admin roles only. Uses Supabase Auth with your project
					profile role.
				</p>
				<div className="mt-6">
					<OpsLoginForm nextPath={nextPath} />
				</div>
				<p className="mt-6 text-center text-sm text-muted-foreground">
					<Link href="/" className="underline underline-offset-2 hover:text-foreground">
						Back to site
					</Link>
				</p>
			</div>
		</div>
	)
}
