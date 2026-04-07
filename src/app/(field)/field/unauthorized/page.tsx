import Link from 'next/link'

export default function FieldUnauthorizedPage() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
			<h1 className="text-xl font-semibold text-white">Access denied</h1>
			<p className="mt-2 max-w-md text-sm text-slate-400">
				The field app is restricted to chauffeur profiles. Customer, dispatcher, and
				admin accounts use the booking site or ops console instead.
			</p>
			<Link
				href="/"
				className="mt-6 inline-flex min-h-11 items-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-500"
			>
				Return home
			</Link>
		</div>
	)
}
