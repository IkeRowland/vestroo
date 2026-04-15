import Link from 'next/link'

import { OpsBoardRealtimeBridge } from '@/features/ops/components/OpsBoardRealtimeBridge'
import { createUserServerClient } from '@/lib/supabase/server'

const COLUMN_ORDER = [
	'booking',
	'assigned',
	'en_route',
	'completed',
	'cancelled',
] as const

export default async function OpsBoardPage() {
	const supabase = await createUserServerClient()
	const { data: trips, error } = await supabase
		.from('trips')
		.select(
			'id, status, time_start_estimate, time_end_estimate, vehicle_id, chauffeur_id, ops_delay_note',
		)
		.order('time_start_estimate', { ascending: false })
		.limit(80)

	if (error) {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
				Could not load trips: {error.message}
			</div>
		)
	}

	const rows = trips ?? []
	const grouped = new Map<string, typeof rows>()
	for (const c of COLUMN_ORDER) {
		grouped.set(c, [])
	}
	for (const t of rows) {
		const st = String(t.status ?? 'booking').toLowerCase()
		const bucket = COLUMN_ORDER.find((c) => c === st) ?? 'booking'
		grouped.get(bucket)?.push(t)
	}

	return (
		<div className="min-w-0 max-w-full">
			<h1 className="text-ops-page-title text-ops-foreground">Board</h1>
			<p className="mt-1 max-w-3xl text-sm text-ops-muted">
				Columns follow trip status. Overlapping vehicle use is blocked or surfaced when
				assigning or swapping from the Trips and Fulfil screens.
			</p>
			<OpsBoardRealtimeBridge />
			<div
				className="mt-6 flex min-w-0 gap-3 overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]"
				role="region"
				aria-label="Trip board columns"
			>
				{COLUMN_ORDER.map((col) => (
					<section
						key={col}
						className="min-w-[16rem] shrink-0 rounded-lg border border-ops-border bg-ops-surface shadow-sm"
					>
						<h2 className="border-b border-ops-border px-3 py-2 text-sm font-semibold capitalize text-ops-foreground">
							{col.replace(/_/g, ' ')}
						</h2>
						<ul className="max-h-[70vh] space-y-2 overflow-y-auto p-2">
							{(grouped.get(col) ?? []).map((t) => (
								<li key={t.id}>
									<Link
										href="/ops/trips"
										className="block rounded-md border border-ops-border bg-muted/50 p-3 text-left text-sm text-ops-foreground transition hover:border-primary hover:shadow-sm"
									>
										<span className="font-mono text-xs text-ops-muted">
											{t.id.slice(0, 8)}…
										</span>
										<div className="mt-1 text-xs text-ops-muted">
											{new Date(t.time_start_estimate as string).toLocaleString()} →{' '}
											{new Date(t.time_end_estimate as string).toLocaleString()}
										</div>
										{t.ops_delay_note ? (
											<p className="mt-1 text-xs font-medium text-amber-800">Delay noted</p>
										) : null}
									</Link>
								</li>
							))}
							{(grouped.get(col) ?? []).length === 0 ? (
								<li className="px-2 py-4 text-center text-xs text-ops-muted">Empty</li>
							) : null}
						</ul>
					</section>
				))}
			</div>
		</div>
	)
}
