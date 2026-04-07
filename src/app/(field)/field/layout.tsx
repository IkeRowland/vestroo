import { headers } from 'next/headers'
import Link from 'next/link'

import { FieldSignOutButton } from '@/features/field/components/FieldSignOutButton'
import { requireChauffeurPage } from '@/lib/field-auth'

export default async function FieldShellLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const h = await headers()
	const path = h.get('x-pathname') ?? ''
	const isPublicField =
		path === '/field/login' || path === '/field/unauthorized'

	if (!isPublicField) {
		await requireChauffeurPage()
	}

	if (isPublicField) {
		return (
			<div className="min-h-screen bg-slate-950 text-slate-100 antialiased">{children}</div>
		)
	}

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
			<header className="border-b border-slate-800">
				<div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
					<Link
						href="/field"
						className="inline-flex min-h-11 items-center text-lg font-semibold tracking-tight text-white"
					>
						Vestroo Field
					</Link>
					<div className="flex flex-wrap items-center gap-2">
						<FieldSignOutButton />
					</div>
				</div>
			</header>
			<main className="mx-auto max-w-3xl px-4 py-4 md:px-6 md:py-6">{children}</main>
		</div>
	)
}
