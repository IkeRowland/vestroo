import Link from 'next/link'

import { FieldLoginForm } from '@/features/field/components/FieldLoginForm'

type SearchParams = Promise<{ next?: string }>

export default async function FieldLoginPage({
	searchParams,
}: {
	searchParams: SearchParams
}) {
	const sp = await searchParams
	const nextPath =
		sp.next && sp.next.startsWith('/field') ? sp.next : '/field'

	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-4">
			<div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900/80 p-6 shadow-xl">
				<h1 className="text-xl font-semibold text-white">Field sign-in</h1>
				<p className="mt-1 text-sm text-slate-400">
					Chauffeur profiles only. Uses Supabase Auth with your project role.
				</p>
				<div className="mt-6">
					<FieldLoginForm nextPath={nextPath} />
				</div>
				<p className="mt-6 text-center text-sm text-slate-500">
					<Link href="/" className="underline underline-offset-2 hover:text-slate-300">
						Back to site
					</Link>
				</p>
			</div>
		</div>
	)
}
