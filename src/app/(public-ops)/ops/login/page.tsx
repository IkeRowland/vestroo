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
		<div className="flex min-h-screen flex-col items-center justify-center px-4">
			<div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900/80 p-6 shadow-xl">
				<h1 className="text-xl font-semibold text-white">Operations sign-in</h1>
				<p className="mt-1 text-sm text-zinc-400">
					Dispatcher and admin roles only. Uses Supabase Auth with your project
					profile role.
				</p>
				<div className="mt-6">
					<OpsLoginForm nextPath={nextPath} />
				</div>
				<p className="mt-6 text-center text-sm text-zinc-500">
					<Link href="/" className="underline underline-offset-2 hover:text-zinc-300">
						Back to site
					</Link>
				</p>
			</div>
		</div>
	)
}
