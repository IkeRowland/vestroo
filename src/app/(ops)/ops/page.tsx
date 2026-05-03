import { Suspense } from 'react'

import { OpsDashboardView } from '@/features/ops/components/OpsDashboardView'
import { OpsLoadingRegion } from '@/features/ops/components/OpsLoadingRegion'

export const dynamic = 'force-dynamic'

function OpsDashboardFallback() {
	return (
		<div className="min-w-0 max-w-full space-y-4">
			<div className="h-9 max-w-xs animate-pulse rounded-md bg-ops-surface/50" aria-hidden />
			<div className="h-4 max-w-md animate-pulse rounded-md bg-ops-surface/40" aria-hidden />
			<OpsLoadingRegion label="Loading dashboard metrics…" className="mt-4" />
		</div>
	)
}

export default function OpsIndexPage() {
	return (
		<Suspense fallback={<OpsDashboardFallback />}>
			<OpsDashboardView />
		</Suspense>
	)
}
