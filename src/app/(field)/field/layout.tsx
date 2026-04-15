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
			<div className="min-h-screen bg-slate-950 text-slate-100 antialiased pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
				{children}
			</div>
		)
	}

	const fieldFocusRing =
		'rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100 antialiased pt-[env(safe-area-inset-top,0px)]">
			<a
				href="#field-main"
				className="absolute left-[-10000px] top-auto z-[100] h-px w-px overflow-hidden focus:left-4 focus:top-4 focus:z-[100] focus:h-auto focus:w-auto focus:overflow-visible focus:rounded-md focus:border focus:border-slate-600 focus:bg-slate-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-slate-100 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
			>
				Skip to main content
			</a>
			<header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md supports-[backdrop-filter]:bg-slate-950/85">
				<div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
					<Link
						href="/field"
						className={`inline-flex min-h-11 min-w-11 items-center text-lg font-semibold tracking-tight text-white ${fieldFocusRing}`}
					>
						Vestroo Field
					</Link>
					<div className="flex flex-wrap items-center gap-2">
						<FieldSignOutButton />
					</div>
				</div>
			</header>
			<main
				id="field-main"
				className="mx-auto w-full min-w-0 max-w-3xl px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] md:px-6 md:py-6"
				tabIndex={-1}
			>
				{children}
			</main>
		</div>
	)
}
