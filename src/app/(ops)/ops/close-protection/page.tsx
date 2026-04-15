import Link from 'next/link'
import { z } from 'zod'

import { listCloseProtectionEngagementsAction } from '@/actions/opsCloseProtection'
import { CloseProtectionCreateForm } from '@/features/ops/components/CloseProtectionOpsForms'

const uuidParam = z.string().uuid()

type PageProps = {
	searchParams: Promise<{ bookingId?: string; tripId?: string }>
}

export default async function OpsCloseProtectionPage({ searchParams }: PageProps) {
	const { bookingId: bookingRaw, tripId: tripRaw } = await searchParams
	const bookingId = uuidParam.safeParse(bookingRaw).success ? bookingRaw : undefined
	const tripId = uuidParam.safeParse(tripRaw).success ? tripRaw : undefined
	const list = await listCloseProtectionEngagementsAction({
		limit: 50,
		...(bookingId ? { bookingId } : {}),
		...(tripId ? { tripId } : {}),
	})

	return (
		<div>
			<h1 className="text-ops-page-title text-ops-foreground">Close protection</h1>
			<p className="mt-1 max-w-3xl text-sm text-ops-muted">
				Staff-only engagements linked to bookings and optional trips. Workflow and PII rules:
				repository{' '}
				<code className="rounded bg-muted px-1 font-mono text-sm text-ops-foreground">
					docs/close-protection-engagements.md
				</code>
				.
			</p>
			<p className="mt-2 text-xs text-ops-muted">
				Filter:{' '}
				{bookingId ? (
					<span className="font-mono text-ops-foreground">bookingId={bookingId}</span>
				) : tripId ? (
					<span className="font-mono text-ops-foreground">tripId={tripId}</span>
				) : (
					<span>none (recent updates)</span>
				)}
				{(bookingId || tripId) && (
					<Link href="/ops/close-protection" className="ml-2 text-primary hover:underline">
						Clear
					</Link>
				)}
			</p>
			{bookingRaw && !bookingId ? (
				<p className="mt-2 text-sm font-medium text-amber-800">Ignored invalid bookingId query param.</p>
			) : null}
			{tripRaw && !tripId ? (
				<p className="mt-2 text-sm font-medium text-amber-800">Ignored invalid tripId query param.</p>
			) : null}

			{bookingId && list.ok && list.rows.length === 0 ? (
				<div className="mt-6">
					<p className="text-sm text-ops-muted">No engagement for this booking yet.</p>
					<div className="mt-3 max-w-xl">
						<CloseProtectionCreateForm bookingId={bookingId} />
					</div>
				</div>
			) : null}

			{!list.ok ? (
				<p className="mt-6 text-sm text-destructive">{list.message}</p>
			) : (
				<ul className="mt-6 space-y-3">
					{list.rows.map((row) => (
						<li
							key={row.id as string}
							className="rounded-lg border border-ops-border bg-ops-surface px-4 py-3 shadow-sm"
						>
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<Link
									href={`/ops/close-protection/${row.id as string}`}
									className="font-mono text-sm text-primary hover:underline"
								>
									{(row.id as string).slice(0, 8)}…
								</Link>
								<span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-ops-foreground">
									{String(row.status)}
								</span>
							</div>
							<p className="mt-1 text-xs text-ops-muted">
								booking {(row.booking_id as string).slice(0, 8)}…
								{row.trip_id ? (
									<>
										{' '}
										· trip {(row.trip_id as string).slice(0, 8)}…
									</>
								) : (
									' · no trip'
								)}
							</p>
							<p className="mt-1 text-xs text-ops-muted">
								updated {new Date(row.updated_at as string).toLocaleString()}
							</p>
						</li>
					))}
				</ul>
			)}

			{list.ok && list.rows.length === 0 && !bookingId ? (
				<p className="mt-6 text-sm text-ops-muted">No engagements yet.</p>
			) : null}
		</div>
	)
}
