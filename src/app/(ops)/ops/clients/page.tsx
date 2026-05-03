import Link from 'next/link'
import { redirect } from 'next/navigation'

import { OpsAddAccountClientButton } from '@/features/ops/components/OpsAddAccountClientButton'
import { OpsClientsAccountSection, type OpsClientRecentBooking } from '@/features/ops/components/OpsClientsAccountSection'
import type { OpsAccountClientRow } from '@/features/ops/types/ops-account-client'
import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsEmptyState } from '@/features/ops/components/OpsEmptyState'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { OpsActionGroup, OpsPageHeader, OpsTableShell } from '@/features/ops/components/ops-primitives'
import { opsClientsCopy } from '@/features/ops/copy/ops-clients-copy'
import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import {
	getRawOpsClientsSelectedId,
	OPS_CLIENTS_PATH,
	parseOpsClientsPageSearchParams,
} from '@/lib/ops-clients-url'
import { buildOpsBookingsAdvancedSearchHref } from '@/lib/ops-booking-grid-query'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

type WalkInClientGroup = {
	key: string
	name: string
	email: string | null
	phone: string | null
	totalBookings: number
	lastBookingAt: string | null
}

function emptyish(s: string | null | undefined): string {
	const t = (s ?? '').trim()
	return t.length > 0 ? t : '—'
}

function formatDate(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return d.toLocaleDateString()
}

export default async function OpsClientsPage({ searchParams }: PageProps) {
	const raw = await searchParams
	const fetchedAtIso = new Date().toISOString()
	const supabase = await createUserServerClient()

	const { data: accounts, error: accountsError } = await supabase
		.from('customer_accounts')
		.select(
			'id, name, slug, status, credit_terms_days, credit_limit_zar, authorized_email_domains, created_at, contract_starts_on, contract_ends_on',
		)
		.order('name', { ascending: true })

	const { data: walkInRaw, error: walkInError } = await supabase
		.from('bookings')
		.select('customer_name, customer_email, customer_phone, created_at')
		.eq('client_type', 'walk_in')
		.order('created_at', { ascending: false })
		.limit(500)

	const walkInGroups = new Map<string, WalkInClientGroup>()
	for (const row of walkInRaw ?? []) {
		const email = (row.customer_email as string | null)?.trim().toLowerCase() || null
		const phone = (row.customer_phone as string | null)?.trim() || null
		const name = (row.customer_name as string | null)?.trim() || ''
		const key = email ?? phone ?? name.toLowerCase()
		if (!key) continue
		const existing = walkInGroups.get(key)
		const createdAt = row.created_at as string | null
		if (existing) {
			existing.totalBookings += 1
			if (
				createdAt &&
				(!existing.lastBookingAt || createdAt > existing.lastBookingAt)
			) {
				existing.lastBookingAt = createdAt
			}
			if (!existing.name && name) existing.name = name
		} else {
			walkInGroups.set(key, {
				key,
				name: name || email || phone || 'Walk-in client',
				email,
				phone,
				totalBookings: 1,
				lastBookingAt: createdAt,
			})
		}
	}

	const walkInList = Array.from(walkInGroups.values()).sort((a, b) => {
		const at = a.lastBookingAt ?? ''
		const bt = b.lastBookingAt ?? ''
		return bt.localeCompare(at)
	})

	const accountRows = (accounts ?? []) as OpsAccountClientRow[]
	const knownIds = new Set(accountRows.map((a) => a.id))
	const rawSelectedId = getRawOpsClientsSelectedId(raw)
	if (rawSelectedId && !knownIds.has(rawSelectedId)) {
		redirect(OPS_CLIENTS_PATH)
	}
	const selectedAccountId = parseOpsClientsPageSearchParams(raw, knownIds)

	let recentBookings: OpsClientRecentBooking[] = []
	if (selectedAccountId) {
		const { data: bookingRows } = await supabase
			.from('bookings')
			.select('id, payment_reference, status, pickup_datetime, created_at')
			.eq('customer_account_id', selectedAccountId)
			.order('created_at', { ascending: false })
			.limit(8)
		recentBookings = (bookingRows ?? []) as OpsClientRecentBooking[]
	}

	return (
		<div className="min-w-0 max-w-full">
			<OpsPageHeader title={opsClientsCopy.pageTitle} description={opsClientsCopy.pageDescription}>
				<OpsActionGroup>
					<OpsAddAccountClientButton />
				</OpsActionGroup>
			</OpsPageHeader>

			<OpsDataFreshnessBar className="mt-4" fetchedAtIso={fetchedAtIso} />

			<section className="mt-8" aria-labelledby="account-clients-heading">
				<div className="flex items-baseline justify-between gap-3">
					<h2 id="account-clients-heading" className="text-lg font-semibold text-ops-foreground">
						{opsClientsCopy.accountSectionHeading}
					</h2>
					<span className="text-xs text-ops-muted">{accountRows.length} total</span>
				</div>

				{accountsError ? (
					<div className="mt-3">
						<OpsFetchErrorIsland
							title="Account clients could not be loaded"
							message={accountsError.message}
						/>
					</div>
				) : (
					<OpsClientsAccountSection
						accounts={accountRows}
						selectedAccountId={selectedAccountId}
						recentBookings={recentBookings}
					/>
				)}
			</section>

			<section className="mt-10" aria-labelledby="walk-in-clients-heading">
				<div className="flex items-baseline justify-between gap-3">
					<h2 id="walk-in-clients-heading" className="text-lg font-semibold text-ops-foreground">
						{opsClientsCopy.walkInSectionHeading}
					</h2>
					<span className="text-xs text-ops-muted">
						{walkInList.length} {opsClientsCopy.walkInSectionHint}
					</span>
				</div>

				{walkInError ? (
					<div className="mt-3">
						<OpsFetchErrorIsland
							title="Walk-in clients could not be loaded"
							message={walkInError.message}
						/>
					</div>
				) : walkInList.length === 0 ? (
					<OpsEmptyState
						className="mt-4"
						title={opsClientsCopy.noWalkInsTitle}
						description={opsClientsCopy.noWalkInsDescription}
					/>
				) : (
					<OpsTableShell className="mt-4" tableClassName="text-sm">
						<thead>
							<tr className="border-b border-ops-border text-left text-ops-muted">
								<th className="py-2 pr-4 font-medium">Name</th>
								<th className="py-2 pr-4 font-medium">Email</th>
								<th className="py-2 pr-4 font-medium">Phone</th>
								<th className="py-2 pr-4 font-medium">Bookings</th>
								<th className="py-2 pr-4 font-medium">Last booking</th>
								<th className="py-2 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody className="text-ops-foreground">
							{walkInList.map((c) => {
								const searchHref = c.email
									? buildOpsBookingsAdvancedSearchHref({ contact: c.email })
									: c.phone
										? buildOpsBookingsAdvancedSearchHref({ contact: c.phone })
										: OPS_BOOKINGS_PATH
								return (
									<tr
										key={c.key}
										className="border-b border-ops-border/60 align-top transition-colors hover:bg-ops-accent-soft"
									>
										<td className="py-2 pr-4 font-medium">{c.name}</td>
										<td className="py-2 pr-4 text-xs text-ops-muted">{emptyish(c.email)}</td>
										<td className="py-2 pr-4 text-xs text-ops-muted">{emptyish(c.phone)}</td>
										<td className="py-2 pr-4 tabular-nums">{c.totalBookings}</td>
										<td className="py-2 pr-4 text-xs text-ops-muted">
											{formatDate(c.lastBookingAt)}
										</td>
										<td className="py-2 text-xs">
											<Link
												href={searchHref}
												className="text-primary hover:underline"
											>
												{opsClientsCopy.viewBookings}
											</Link>
										</td>
									</tr>
								)
							})}
						</tbody>
					</OpsTableShell>
				)}
			</section>
		</div>
	)
}
