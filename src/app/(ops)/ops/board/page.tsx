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
			<div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
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
		<div>
			<h1 className="text-2xl font-semibold text-white">Board</h1>
			<p className="mt-1 max-w-3xl text-sm text-zinc-400">
				Columns follow trip status. Overlapping vehicle use is blocked or surfaced when
				assigning or swapping from the Trips and Fulfil screens.
			</p>
			<OpsBoardRealtimeBridge />
			<div className="mt-6 flex gap-3 overflow-x-auto pb-2">
				{COLUMN_ORDER.map((col) => (
					<section
						key={col}
						className="min-w-[16rem] flex-1 rounded-lg border border-zinc-800 bg-zinc-900/40"
					>
						<h2 className="border-b border-zinc-800 px-3 py-2 text-sm font-semibold capitalize text-zinc-200">
							{col.replace(/_/g, ' ')}
						</h2>
						<ul className="max-h-[70vh] space-y-2 overflow-y-auto p-2">
							{(grouped.get(col) ?? []).map((t) => (
								<li key={t.id}>
									<Link
										href="/ops/trips"
										className="block rounded-md border border-zinc-700 bg-zinc-950/80 p-3 text-left text-sm text-zinc-100 hover:border-emerald-800"
									>
										<span className="font-mono text-xs text-zinc-500">
											{t.id.slice(0, 8)}…
										</span>
										<div className="mt-1 text-xs text-zinc-400">
											{new Date(t.time_start_estimate as string).toLocaleString()} →{' '}
											{new Date(t.time_end_estimate as string).toLocaleString()}
										</div>
										{t.ops_delay_note ? (
											<p className="mt-1 text-xs text-amber-200">Delay noted</p>
										) : null}
									</Link>
								</li>
							))}
							{(grouped.get(col) ?? []).length === 0 ? (
								<li className="px-2 py-4 text-center text-xs text-zinc-600">Empty</li>
							) : null}
						</ul>
					</section>
				))}
			</div>
		</div>
	)
}
