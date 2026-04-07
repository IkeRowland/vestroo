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
			<h1 className="text-2xl font-semibold text-white">Close protection</h1>
			<p className="mt-1 max-w-3xl text-sm text-zinc-400">
				Staff-only engagements linked to bookings and optional trips. Workflow and PII rules:
				repository <code className="text-zinc-300">docs/close-protection-engagements.md</code>.
			</p>
			<p className="mt-2 text-xs text-zinc-500">
				Filter:{' '}
				{bookingId ? (
					<span className="font-mono text-zinc-400">bookingId={bookingId}</span>
				) : tripId ? (
					<span className="font-mono text-zinc-400">tripId={tripId}</span>
				) : (
					<span>none (recent updates)</span>
				)}
				{(bookingId || tripId) && (
					<Link href="/ops/close-protection" className="ml-2 text-emerald-400 hover:underline">
						Clear
					</Link>
				)}
			</p>
			{bookingRaw && !bookingId ? (
				<p className="mt-2 text-sm text-amber-200">Ignored invalid bookingId query param.</p>
			) : null}
			{tripRaw && !tripId ? (
				<p className="mt-2 text-sm text-amber-200">Ignored invalid tripId query param.</p>
			) : null}

			{bookingId && list.ok && list.rows.length === 0 ? (
				<div className="mt-6">
					<p className="text-sm text-zinc-400">No engagement for this booking yet.</p>
					<div className="mt-3 max-w-xl">
						<CloseProtectionCreateForm bookingId={bookingId} />
					</div>
				</div>
			) : null}

			{!list.ok ? (
				<p className="mt-6 text-sm text-red-300">{list.message}</p>
			) : (
				<ul className="mt-6 space-y-3">
					{list.rows.map((row) => (
						<li
							key={row.id as string}
							className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-4 py-3"
						>
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<Link
									href={`/ops/close-protection/${row.id as string}`}
									className="font-mono text-sm text-emerald-400 hover:underline"
								>
									{(row.id as string).slice(0, 8)}…
								</Link>
								<span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">
									{String(row.status)}
								</span>
							</div>
							<p className="mt-1 text-xs text-zinc-500">
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
							<p className="mt-1 text-xs text-zinc-600">
								updated {new Date(row.updated_at as string).toLocaleString()}
							</p>
						</li>
					))}
				</ul>
			)}

			{list.ok && list.rows.length === 0 && !bookingId ? (
				<p className="mt-6 text-sm text-zinc-500">No engagements yet.</p>
			) : null}
		</div>
	)
}
