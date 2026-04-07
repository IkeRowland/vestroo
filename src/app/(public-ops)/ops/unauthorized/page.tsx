import Link from 'next/link'

export default function OpsUnauthorizedPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
			<h1 className="text-xl font-semibold text-white">Access denied</h1>
			<p className="mt-2 max-w-md text-sm text-zinc-400">
				This console is restricted to dispatcher and admin profiles. Customer and
				chauffeur accounts cannot open operational routes.
			</p>
			<Link
				href="/"
				className="mt-6 inline-flex min-h-11 items-center rounded-md bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
			>
				Return home
			</Link>
		</div>
	)
}
