import Link from 'next/link'

import { OpsLoginForm } from '@/features/ops/components/OpsLoginForm'
import { OpsPublicAuthPage } from '@/features/ops/components/OpsPublicAuthPage'
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
		<OpsPublicAuthPage
			title={C.pageTitle}
			subtitle={C.subtitle}
			hint={C.staffHint}
			footer={
				<>
					<p className="text-center text-sm text-ops-muted">{C.footerNeedAccount}</p>
					<p className="mt-4 text-center text-sm text-ops-muted">
						<Link
							href={C.backToSiteHref}
							className="font-medium text-ops-accent underline-offset-4 hover:text-ops-accent/90 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ops-surface"
						>
							{C.backToSite}
						</Link>
					</p>
				</>
			}
		>
			<OpsLoginForm nextPath={nextPath} />
		</OpsPublicAuthPage>
	)
}
