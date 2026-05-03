import Link from 'next/link'
import { z } from 'zod'

import { listCloseProtectionEngagementsAction } from '@/actions/opsCloseProtection'
import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { CloseProtectionCreateForm } from '@/features/ops/components/CloseProtectionOpsForms'
import {
	OpsFilterRow,
	OpsPageHeader,
} from '@/features/ops/components/ops-primitives'
import { opsCloseProtectionCopy } from '@/features/ops/copy/ops-close-protection-copy'
import { getOpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { cn } from '@/lib/utils'

const uuidParam = z.string().uuid()

type PageProps = {
	searchParams: Promise<{ bookingId?: string; tripId?: string }>
}

export default async function OpsCloseProtectionPage({ searchParams }: PageProps) {
	const fetchedAtIso = new Date().toISOString()
	const { bookingId: bookingRaw, tripId: tripRaw } = await searchParams
	const bookingId = uuidParam.safeParse(bookingRaw).success ? bookingRaw : undefined
	const tripId = uuidParam.safeParse(tripRaw).success ? tripRaw : undefined
	const list = await listCloseProtectionEngagementsAction({
		limit: 50,
		...(bookingId ? { bookingId } : {}),
		...(tripId ? { tripId } : {}),
	})

	const filterSummary =
		bookingId ? opsCloseProtectionCopy.filterSummaryBooking
		: tripId ? opsCloseProtectionCopy.filterSummaryTrip
		: opsCloseProtectionCopy.filterSummaryDefault

	return (
		<div className="min-w-0 max-w-full space-y-4">
			<OpsPageHeader
				title={opsCloseProtectionCopy.pageTitle}
				description={opsCloseProtectionCopy.pageDescription}
			/>

			<OpsFilterRow aria-label={opsCloseProtectionCopy.filterContextAria}>
				<span className="text-ops-dense text-ops-muted">{filterSummary}</span>
				{(bookingId || tripId) && (
					<Link
						href="/ops/close-protection"
						className="text-sm font-medium text-primary underline-offset-2 hover:underline"
					>
						{opsCloseProtectionCopy.clearFilter}
					</Link>
				)}
			</OpsFilterRow>

			<OpsDataFreshnessBar fetchedAtIso={fetchedAtIso} />

			{bookingRaw && !bookingId ?
				<p
					className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-ops-foreground"
					role="status"
				>
					{opsCloseProtectionCopy.invalidBookingFilter}
				</p>
			:	null}
			{tripRaw && !tripId ?
				<p
					className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-ops-foreground"
					role="status"
				>
					{opsCloseProtectionCopy.invalidTripFilter}
				</p>
			:	null}

			{bookingId && list.ok && list.rows.length === 0 ?
				<div>
					<p className="text-sm text-ops-muted">{opsCloseProtectionCopy.noEngagementForBooking}</p>
					<div className="mt-3 max-w-xl">
						<CloseProtectionCreateForm bookingId={bookingId} />
					</div>
				</div>
			:	null}

			{!list.ok ?
				<div>
					<OpsFetchErrorIsland
						title={opsCloseProtectionCopy.engagementsLoadErrorTitle}
						message={list.error.message}
						correlationId={list.error.correlationId}
					/>
				</div>
			:	<ul className="space-y-3">
					{list.rows.map((row) => {
						const id = row.id as string
						const statusStr = String(row.status)
						return (
							<li
								key={id}
								className={cn(
									'rounded-lg border border-ops-border bg-ops-surface px-4 py-3 shadow-sm',
									'transition-colors hover:bg-ops-accent-soft',
								)}
								aria-label={opsCloseProtectionCopy.listItemAria(id.slice(0, 8))}
							>
								<div className="flex flex-wrap items-baseline justify-between gap-2">
									<Link
										href={`/ops/close-protection/${id}`}
										className="font-mono text-sm text-primary hover:underline"
									>
										{id.slice(0, 8)}…
									</Link>
									<OpsStatusPill tone={getOpsStatusPillTone(statusStr)}>{statusStr}</OpsStatusPill>
								</div>
								<p className="mt-1 text-xs text-ops-muted">
									{opsCloseProtectionCopy.bookingPrefix}{' '}
									{(row.booking_id as string).slice(0, 8)}…
									{row.trip_id ?
										<>
											{' '}
											· {opsCloseProtectionCopy.tripPrefix}{' '}
											{(row.trip_id as string).slice(0, 8)}…
										</>
									:		` · ${opsCloseProtectionCopy.noTrip}`}
								</p>
								<p className="mt-1 text-xs text-ops-muted">
									{opsCloseProtectionCopy.updatedPrefix}{' '}
									{new Date(row.updated_at as string).toLocaleString()}
								</p>
							</li>
						)
					})}
				</ul>
			}

			{list.ok && list.rows.length === 0 && !bookingId ?
				<p className="text-sm text-ops-muted">{opsCloseProtectionCopy.noEngagements}</p>
			:	null}
		</div>
	)
}
