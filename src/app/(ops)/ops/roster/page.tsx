import { createUserServerClient } from '@/lib/supabase/server'

export default async function OpsRosterPage() {
	const supabase = await createUserServerClient()

	const { data: chauffeurs, error: pErr } = await supabase
		.from('profiles')
		.select('id, full_name, status, phone')
		.eq('role', 'chauffeur')
		.order('full_name')

	const today = new Date().toISOString().slice(0, 10)

	const { data: schedules, error: sErr } = await supabase
		.from('chauffeur_schedules')
		.select('id, chauffeur_id, work_date, shift, vehicle_id, status, total_working_hours')
		.gte('work_date', today)
		.order('work_date', { ascending: true })
		.limit(80)

	if (pErr) {
		return (
			<div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
				{pErr.message}
			</div>
		)
	}

	const schedByChauffeur = new Map<string, NonNullable<typeof schedules>>()
	for (const s of schedules ?? []) {
		const cid = s.chauffeur_id as string
		if (!schedByChauffeur.has(cid)) schedByChauffeur.set(cid, [])
		schedByChauffeur.get(cid)!.push(s)
	}

	return (
		<div>
			<h1 className="text-ops-page-title text-ops-foreground">Chauffeur roster</h1>
			<p className="mt-1 max-w-3xl text-sm text-ops-muted">
				Profiles with{' '}
				<code className="rounded bg-muted px-1 font-mono text-sm text-ops-foreground">role = chauffeur</code> and
				upcoming
				<code className="rounded bg-muted px-1 font-mono text-sm text-ops-foreground">
					{' '}
					chauffeur_schedules
				</code>{' '}
				from today onward. Reads use the staff JWT (dispatcher/admin) so RLS policies for{' '}
				<code className="rounded bg-muted px-1 font-mono text-sm text-ops-foreground">is_staff</code> apply.
			</p>
			{sErr ? (
				<p className="mt-2 text-sm font-medium text-amber-800">Schedules: {sErr.message}</p>
			) : null}
			<ul className="mt-6 space-y-4">
				{(chauffeurs ?? []).map((c) => {
					const id = c.id as string
					const rows = schedByChauffeur.get(id) ?? []
					return (
						<li
							key={id}
							className="rounded-lg border border-ops-border bg-ops-surface p-4 shadow-sm"
						>
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<span className="text-lg font-medium text-ops-foreground">
									{(c.full_name as string) || 'Unnamed'}
								</span>
								<span className="text-xs capitalize text-ops-muted">
									{c.status as string}
								</span>
							</div>
							<p className="mt-1 text-xs text-ops-muted">
								Profile id <span className="font-mono">{id.slice(0, 8)}…</span>
							</p>
							{rows.length === 0 ? (
								<p className="mt-2 text-sm text-ops-muted">No upcoming shifts in range.</p>
							) : (
								<ul className="mt-3 space-y-2 text-sm text-ops-foreground">
									{rows.map((s) => (
										<li
											key={s.id as string}
											className="rounded border border-ops-border bg-muted/50 px-3 py-2"
										>
											<span className="font-medium text-ops-foreground">
												{String(s.work_date)}
											</span>
											{s.shift ? (
												<span className="text-ops-muted"> · {s.shift as string}</span>
											) : null}
											<span className="block text-xs text-ops-muted">
												Vehicle{' '}
												<span className="font-mono">
													{String(s.vehicle_id).slice(0, 8)}…
												</span>
												· {s.total_working_hours as number}h ·{' '}
												<span className="capitalize">{s.status as string}</span>
											</span>
										</li>
									))}
								</ul>
							)}
						</li>
					)
				})}
			</ul>
			{(chauffeurs ?? []).length === 0 ? (
				<p className="mt-6 text-sm text-ops-muted">No chauffeur profiles.</p>
			) : null}
		</div>
	)
}
