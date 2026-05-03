import Link from 'next/link'

import { formatBookingIntentLabel } from '@/features/ops/booking-intent-labels'
import { OpsAvatarCell } from '@/features/ops/components/OpsAvatarCell'
import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsEmptyState } from '@/features/ops/components/OpsEmptyState'
import {
	OpsExperiencePackagesPanel,
	type OpsExperiencePackageRow,
} from '@/features/ops/components/OpsExperiencePackagesPanel'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import {
	OpsFilterRow,
	OpsPageHeader,
	OpsTableShell,
} from '@/features/ops/components/ops-primitives'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { opsExperiencesCopy } from '@/features/ops/copy/ops-experiences-copy'
import { createUserServerClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type ExperienceBookingRow = {
	id: string
	payment_reference: string | null
	created_at: string
	booking_metadata: Record<string, unknown> | null
	total_amount: number | string | null
	customer_name: string | null
	booking_intent: string | null
}

function metaString(meta: Record<string, unknown> | null, key: string): string {
	if (!meta) {
		return '—'
	}
	const v = meta[key]
	if (v == null) {
		return '—'
	}
	return String(v)
}

export default async function OpsExperiencesPage() {
	const fetchedAtIso = new Date().toISOString()
	const supabase = await createUserServerClient()

	const { data: pkgRows, error: pkgErr } = await supabase
		.from('experience_packages')
		.select(
			'id, slug, title, description, base_price_zar, per_passenger_increment_zar, included_passengers, default_vehicle_category_id, estimated_duration_minutes, is_active',
		)
		.order('updated_at', { ascending: false })

	const { data: categories } = await supabase.from('vehicle_categories').select('id, name').order('name')

	const { data, error } = await supabase
		.from('bookings')
		.select(
			'id, payment_reference, created_at, booking_metadata, total_amount, customer_name, booking_intent',
		)
		.eq('booking_intent', 'experience_package')
		.order('created_at', { ascending: false })
		.limit(50)

	const rows = (data ?? []) as ExperienceBookingRow[]

	const packages: OpsExperiencePackageRow[] = (pkgRows ?? []).map((r) => {
		const row = r as Record<string, unknown>
		return {
			id: String(row.id),
			slug: String(row.slug),
			title: String(row.title),
			description: row.description != null ? String(row.description) : null,
			base_price_zar: Number(row.base_price_zar),
			per_passenger_increment_zar: Number(row.per_passenger_increment_zar ?? 0),
			included_passengers: Number(row.included_passengers ?? 1),
			default_vehicle_category_id:
				row.default_vehicle_category_id != null
					? String(row.default_vehicle_category_id)
					: null,
			estimated_duration_minutes:
				row.estimated_duration_minutes != null ? Number(row.estimated_duration_minutes) : null,
			is_active: Boolean(row.is_active),
		}
	})

	const categoryOptions = (categories ?? []).map((c) => ({
		id: c.id as string,
		name: (c.name as string) ?? '',
	}))

	return (
		<div className="min-w-0 max-w-full space-y-10">
			<OpsPageHeader title={opsExperiencesCopy.pageTitle} description={opsExperiencesCopy.pageDescription} />

			<OpsFilterRow className="mt-4" aria-label={opsExperiencesCopy.filterContextAria}>
				<span className="text-ops-dense text-ops-muted">{opsExperiencesCopy.filterHint}</span>
			</OpsFilterRow>

			<OpsDataFreshnessBar className="mt-3" fetchedAtIso={fetchedAtIso} />

			<section className="space-y-4">
				<h2 className="text-lg font-semibold text-ops-foreground">{opsExperiencesCopy.packagesSectionTitle}</h2>
				{pkgErr ?
					<OpsFetchErrorIsland
						title={opsExperiencesCopy.packagesLoadErrorTitle}
						message={pkgErr.message}
					/>
				:	<OpsExperiencePackagesPanel packages={packages} categories={categoryOptions} />}
			</section>

			<section className="space-y-4">
				<h2 className="text-lg font-semibold text-ops-foreground">{opsExperiencesCopy.bookingsSectionTitle}</h2>
				{error ?
					<OpsFetchErrorIsland
						title={opsExperiencesCopy.bookingsLoadErrorTitle}
						message={error.message}
					/>
				:	null}

				{!error && rows.length === 0 ?
					<OpsEmptyState
						title="No experience package bookings yet"
						description="When customers complete experience package checkouts, they appear here."
					/>
				:	null}

				{!error && rows.length > 0 ?
					<OpsTableShell caption={opsExperiencesCopy.bookingsTableCaption}>
						<thead className="border-b border-ops-border bg-ops-surface/60 text-ops-table-head text-xs uppercase tracking-wide text-ops-muted">
							<tr>
								<th scope="col" className="px-3 py-2 font-medium">
									Created
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Reference
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Intent
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Customer
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Package id
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Total (ZAR)
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => {
								const total =
									row.total_amount != null ? Number(row.total_amount) : null
								const refLabel = row.payment_reference ?? row.id.slice(0, 8)
								return (
									<tr
										key={row.id}
										className={cn(
											'border-b border-ops-border/80 text-sm transition-colors',
											'hover:bg-ops-accent-soft',
										)}
									>
										<td className="whitespace-nowrap px-3 py-2 text-ops-muted">
											{new Date(row.created_at).toLocaleString('en-ZA')}
										</td>
										<td className="px-3 py-2 font-mono text-xs text-ops-foreground">
											{row.payment_reference ?? '—'}
										</td>
										<td className="px-3 py-2 text-ops-foreground">
											<OpsStatusPill tone="neutral" dot={false}>
												{formatBookingIntentLabel(row.booking_intent)}
											</OpsStatusPill>
										</td>
										<td className="max-w-[14rem] px-3 py-2">
											<OpsAvatarCell
												src={null}
												name={row.customer_name?.trim() ? row.customer_name : 'Unknown'}
												secondary={refLabel}
											/>
										</td>
										<td className="px-3 py-2 font-mono text-xs text-ops-muted">
											{metaString(row.booking_metadata, 'experience_package_id')}
										</td>
										<td className="px-3 py-2 text-ops-foreground">
											{total != null && Number.isFinite(total) ? total.toFixed(2) : '—'}
										</td>
										<td className="px-3 py-2 text-xs">
											<Link
												href={`/confirmation?id=${encodeURIComponent(row.id)}`}
												className="text-primary underline-offset-2 hover:underline"
												aria-label={opsExperiencesCopy.confirmationAria(String(refLabel))}
											>
												{opsExperiencesCopy.confirmationLink}
											</Link>
										</td>
									</tr>
								)
							})}
						</tbody>
					</OpsTableShell>
				:	null}
			</section>
		</div>
	)
}
