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
			<div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-200">
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
			<h1 className="text-2xl font-semibold text-white">Chauffeur roster</h1>
			<p className="mt-1 max-w-3xl text-sm text-zinc-400">
				Profiles with <code className="text-zinc-300">role = chauffeur</code> and upcoming
				<code className="text-zinc-300"> chauffeur_schedules</code> from today onward. Reads use
				the staff JWT (dispatcher/admin) so RLS policies for{' '}
				<code className="text-zinc-300">is_staff</code> apply.
			</p>
			{sErr ? (
				<p className="mt-2 text-sm text-amber-200">Schedules: {sErr.message}</p>
			) : null}
			<ul className="mt-6 space-y-4">
				{(chauffeurs ?? []).map((c) => {
					const id = c.id as string
					const rows = schedByChauffeur.get(id) ?? []
					return (
						<li
							key={id}
							className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
						>
							<div className="flex flex-wrap items-baseline justify-between gap-2">
								<span className="text-lg font-medium text-white">
									{(c.full_name as string) || 'Unnamed'}
								</span>
								<span className="text-xs capitalize text-zinc-500">
									{c.status as string}
								</span>
							</div>
							<p className="mt-1 text-xs text-zinc-600">
								Profile id <span className="font-mono">{id.slice(0, 8)}…</span>
							</p>
							{rows.length === 0 ? (
								<p className="mt-2 text-sm text-zinc-500">No upcoming shifts in range.</p>
							) : (
								<ul className="mt-3 space-y-2 text-sm text-zinc-300">
									{rows.map((s) => (
										<li
											key={s.id as string}
											className="rounded border border-zinc-800/80 bg-zinc-950/60 px-3 py-2"
										>
											<span className="font-medium text-zinc-200">
												{String(s.work_date)}
											</span>
											{s.shift ? (
												<span className="text-zinc-500"> · {s.shift as string}</span>
											) : null}
											<span className="block text-xs text-zinc-500">
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
				<p className="mt-6 text-sm text-zinc-500">No chauffeur profiles.</p>
			) : null}
		</div>
	)
}
