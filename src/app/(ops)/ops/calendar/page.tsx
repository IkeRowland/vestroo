import { createUserServerClient } from '@/lib/supabase/server'

function dayKey(iso: string): string {
	const d = new Date(iso)
	return d.toISOString().slice(0, 10)
}

export default async function OpsCalendarPage() {
	const supabase = await createUserServerClient()
	const { data: trips, error } = await supabase
		.from('trips')
		.select('id, status, time_start_estimate, time_end_estimate, vehicle_id')
		.order('time_start_estimate', { ascending: true })
		.limit(120)

	if (error) {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
				Could not load trips: {error.message}
			</div>
		)
	}

	const rows = trips ?? []
	const byDay = new Map<string, typeof rows>()
	for (const t of rows) {
		const k = dayKey(t.time_start_estimate as string)
		if (!byDay.has(k)) byDay.set(k, [])
		byDay.get(k)!.push(t)
	}
	const days = [...byDay.keys()].sort()

	return (
		<div className="min-w-0 max-w-full">
			<h1 className="text-ops-page-title text-ops-foreground">Calendar</h1>
			<p className="mt-1 max-w-3xl text-sm text-ops-muted">
				Day agenda built from{' '}
				<code className="rounded bg-muted px-1 font-mono text-sm text-ops-foreground">
					trips.time_start_estimate
				</code>{' '}
				(UTC date key). Scroll horizontally on narrow viewports.
			</p>
			<div
				className="mt-6 flex min-w-0 gap-4 overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch]"
				role="region"
				aria-label="Calendar day columns"
			>
				{days.length === 0 ? (
					<p className="text-sm text-ops-muted">No trips scheduled.</p>
				) : (
					days.map((day) => (
						<section
							key={day}
							className="min-w-[18rem] flex-shrink-0 rounded-lg border border-ops-border bg-ops-surface shadow-sm"
						>
							<h2 className="border-b border-ops-border px-3 py-2 text-sm font-semibold text-ops-foreground">
								{day}
							</h2>
							<ul className="space-y-2 p-2">
								{(byDay.get(day) ?? []).map((t) => (
									<li
										key={t.id}
										className="rounded-md border border-ops-border bg-muted/50 p-2 text-xs text-ops-foreground"
									>
										<div className="font-mono text-ops-muted">{t.id.slice(0, 8)}…</div>
										<div className="mt-1 capitalize text-ops-muted">
											{String(t.status ?? '').replace(/_/g, ' ')}
										</div>
										<div className="mt-1 text-ops-muted">
											{new Date(t.time_start_estimate as string).toLocaleTimeString([], {
												hour: '2-digit',
												minute: '2-digit',
											})}{' '}
											–{' '}
											{new Date(t.time_end_estimate as string).toLocaleTimeString([], {
												hour: '2-digit',
												minute: '2-digit',
											})}
										</div>
									</li>
								))}
							</ul>
						</section>
					))
				)}
			</div>
		</div>
	)
}
