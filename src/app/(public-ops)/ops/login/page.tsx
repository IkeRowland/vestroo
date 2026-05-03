import Link from 'next/link'

import { VestrooMark } from '@/components/brand/VestrooMark'
import { OpsLoginForm } from '@/features/ops/components/OpsLoginForm'
import { opsLoginCopy } from '@/features/ops/copy/ops-login-copy'

type SearchParams = Promise<{ next?: string }>

const C = opsLoginCopy

export default async function OpsLoginPage({
	searchParams,
}: {
	searchParams: SearchParams
}) {
	const sp = await searchParams
	const nextPath = sp.next && sp.next.startsWith('/ops') ? sp.next : '/ops'

	return (
		<main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
			<div className="flex w-full max-w-md flex-col items-center">
				<div className="mb-8 flex justify-center" role="img" aria-label={C.brandAria}>
					<VestrooMark className="shadow-ops-1" />
				</div>

				<div className="w-full rounded-ops-card border border-ops-border bg-ops-surface p-6 shadow-ops-2">
					<header className="text-center">
						<h1 className="text-ops-page-title text-ops-foreground">{C.pageTitle}</h1>
						<p className="mt-1 text-sm font-medium text-ops-accent">{C.subtitle}</p>
						<p className="mt-2 text-sm text-ops-muted">{C.staffHint}</p>
					</header>

					<div className="mt-6">
						<OpsLoginForm nextPath={nextPath} />
					</div>

					<p className="mt-6 border-t border-ops-border pt-4 text-center text-sm text-ops-muted">
						{C.footerNeedAccount}
					</p>

					<p className="mt-4 text-center text-sm text-ops-muted">
						<Link
							href={C.backToSiteHref}
							className="font-medium text-ops-accent underline-offset-4 hover:text-ops-accent/90 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ops-surface"
						>
							{C.backToSite}
						</Link>
					</p>
				</div>
			</div>
		</main>
	)
}
