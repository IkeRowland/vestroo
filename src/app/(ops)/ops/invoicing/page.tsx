import { redirect } from 'next/navigation'

import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsInvoicingHooksPanel } from '@/features/ops/components/OpsInvoicingHooksPanel'
import { OpsInvoicingKpiBand } from '@/features/ops/components/OpsInvoicingKpiBand'
import { OpsInvoicingQueueClient } from '@/features/ops/components/OpsInvoicingQueueClient'
import { OpsInvoicingTabNav } from '@/features/ops/components/OpsInvoicingTabNav'
import { OpsPageHeader } from '@/features/ops/components/OpsPageHeader'
import { opsInvoicingCopy } from '@/features/ops/copy/ops-invoicing-copy'
import { fetchInvoicingKpiSnapshot } from '@/lib/ops-invoicing-kpis'
import {
	fetchInvoicingQueueBookings,
	type OpsInvoicingQueueRow,
} from '@/lib/ops-invoicing-queue'
import {
	buildInvoicingBucketRedirectUrl,
	parseOpsInvoicingBucketParam,
	parseOpsInvoicingPageSearchParams,
	serializeOpsInvoicingPaginationQuery,
} from '@/lib/ops-invoicing-url'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(raw: string | string[] | undefined): string | undefined {
	return Array.isArray(raw) ? raw[0] : raw
}

export default async function OpsInvoicingPage({ searchParams }: PageProps) {
	const raw = await searchParams

	const bucketRedirect = buildInvoicingBucketRedirectUrl(raw)
	if (bucketRedirect) {
		redirect(bucketRedirect)
	}

	const parsed = parseOpsInvoicingPageSearchParams(raw)
	const tab = parsed.tab

	const bucketRaw = firstParam(raw.bucket)?.trim() ?? ''
	const ignoredBucket =
		bucketRaw.length > 0 && parseOpsInvoicingBucketParam(raw.bucket) === undefined

	const fetchedAtIso = new Date().toISOString()
	const supabase = await createUserServerClient()

	let queueRows: OpsInvoicingQueueRow[] = []
	let queueError: string | null = null

	const [kpiSnapshot, queueRes] = await Promise.all([
		fetchInvoicingKpiSnapshot(supabase),
		tab === 'ready' ?
			fetchInvoicingQueueBookings(supabase, 'ready_to_invoice')
		: tab === 'invoiced' ?
			fetchInvoicingQueueBookings(supabase, 'invoiced')
		:	Promise.resolve({ rows: [] as OpsInvoicingQueueRow[], errorMessage: null as string | null }),
	])

	if (tab === 'ready' || tab === 'invoiced') {
		queueRows = queueRes.rows
		queueError = queueRes.errorMessage
	}

	const totalPages =
		queueRows.length === 0 ? 0 : Math.ceil(queueRows.length / parsed.per)
	const maxPage = Math.max(totalPages, 1)
	const safePage = Math.min(Math.max(1, parsed.page), maxPage)

	if ((tab === 'ready' || tab === 'invoiced') && parsed.page !== safePage) {
		const qs = serializeOpsInvoicingPaginationQuery({
			tab,
			page: safePage,
			per: parsed.per,
		})
		redirect(qs.length > 0 ? `/ops/invoicing?${qs}` : '/ops/invoicing')
	}

	return (
		<div className="space-y-4">
			<OpsPageHeader
				title={opsInvoicingCopy.pageTitle}
				description={
					<>
						{opsInvoicingCopy.pageDescriptionLead}{' '}
						<strong className="font-medium">{opsInvoicingCopy.pageDescriptionSegments.ready}</strong>,{' '}
						<strong className="font-medium">{opsInvoicingCopy.pageDescriptionSegments.invoiced}</strong>, and{' '}
						{opsInvoicingCopy.pageDescriptionSegments.hooks}. {opsInvoicingCopy.pageDescriptionFootnote}
					</>
				}
			/>
			<OpsDataFreshnessBar fetchedAtIso={fetchedAtIso} />
			<OpsInvoicingTabNav active={tab} />
			<OpsInvoicingKpiBand snapshot={kpiSnapshot} />
			{ignoredBucket ? (
				<p
					className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-ops-foreground"
					role="status"
				>
					Unknown <code className="rounded bg-ops-canvas px-1 font-mono text-xs">bucket</code> query —
					ignored. Supported aliases:{' '}
					<code className="rounded bg-ops-canvas px-1 font-mono text-xs">completed</code>,{' '}
					<code className="rounded bg-ops-canvas px-1 font-mono text-xs">awaiting</code>,{' '}
					<code className="rounded bg-ops-canvas px-1 font-mono text-xs">overdue</code>.
				</p>
			) : null}
			{tab === 'hooks' ?
				<OpsInvoicingHooksPanel />
			:					<OpsInvoicingQueueClient
					mode={tab}
					rows={queueRows}
					fetchError={queueError}
					page={safePage}
					per={parsed.per}
					totalPages={totalPages}
				/>}
		</div>
	)
}
