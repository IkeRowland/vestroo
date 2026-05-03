import Link from 'next/link'

import { opsSettingsCopy } from '@/features/ops/copy/ops-settings-copy'
import { OpsPageHeader } from '@/features/ops/components/ops-primitives'
import { requireOpsStaffPage } from '@/lib/ops-auth'

export const dynamic = 'force-dynamic'

const C = opsSettingsCopy.index

export default async function OpsSettingsIndexPage() {
	await requireOpsStaffPage()

	return (
		<div className="min-w-0 max-w-full space-y-6">
			<OpsPageHeader title={C.pageTitle} description={C.pageDescription} />

			<section aria-labelledby="settings-nav-heading" className="space-y-3">
				<h2 id="settings-nav-heading" className="text-sm font-semibold uppercase tracking-wide text-ops-muted">
					{C.sectionHeading}
				</h2>
				<ul className="grid gap-3 sm:grid-cols-2" aria-label={C.sectionNavLandmark}>
					<li>
						<Link
							href={C.cardBankHref}
							className="group flex h-full flex-col rounded-lg border border-ops-border bg-ops-surface/20 p-4 text-left transition-colors hover:bg-ops-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent"
						>
							<span className="text-base font-semibold text-ops-foreground">{C.cardBankTitle}</span>
							<span className="mt-1 flex-1 text-sm text-ops-muted">{C.cardBankBody}</span>
							<span className="mt-3 text-sm font-medium text-ops-accent underline-offset-4 group-hover:underline">
								{C.cardCtaLabel}
							</span>
						</Link>
					</li>
				</ul>
			</section>
		</div>
	)
}
