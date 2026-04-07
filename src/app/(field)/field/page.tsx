import Link from 'next/link'

import { requireChauffeurPage } from '@/lib/field-auth'
import { createUserServerClient } from '@/lib/supabase/server'

function formatWhen(iso: string | null): string {
	if (!iso) return '—'
	try {
		return new Intl.DateTimeFormat(undefined, {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(new Date(iso))
	} catch {
		return iso
	}
}

export default async function FieldHomePage() {
	const session = await requireChauffeurPage()
	const supabase = await createUserServerClient()

	const { data: trips, error } = await supabase
		.from('trips')
		.select(
			'id, status, time_start_estimate, time_end_estimate, service_type, service_run_id',
		)
		.eq('chauffeur_id', session.userId)
		.order('time_start_estimate', { ascending: true })

	if (error) {
		return (
			<div className="rounded-lg border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">
				Could not load assignments: {error.message}
			</div>
		)
	}

	const rows = trips ?? []
	const upcoming = rows.filter((t) => {
		const st = t.status as string
		return st !== 'completed' && st !== 'cancelled'
	})
	const past = rows.filter((t) => {
		const st = t.status as string
		return st === 'completed' || st === 'cancelled'
	})

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-bold text-white">My work</h1>
				<p className="mt-1 text-sm text-slate-400">
					Trips where you are assigned as chauffeur. Confirm when you head out, then mark
					completed when the service ends.
				</p>
			</div>

			<section aria-labelledby="upcoming-heading">
				<h2 id="upcoming-heading" className="text-lg font-semibold text-slate-100">
					Active & upcoming
				</h2>
				{upcoming.length === 0 ? (
					<p className="mt-2 text-sm text-slate-500">No open assignments.</p>
				) : (
					<ul className="mt-3 space-y-2">
						{upcoming.map((t) => (
							<li key={t.id as string}>
								<Link
									href={`/field/trips/${t.id as string}`}
									className="block rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3 transition hover:border-amber-700/50 hover:bg-slate-900"
								>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<span className="font-medium capitalize text-white">
											{(t.status as string) ?? '—'}
										</span>
										<span className="text-xs uppercase text-slate-500">
											{(t.service_type as string) ?? 'trip'}
										</span>
									</div>
									<p className="mt-1 text-sm text-slate-400">
										{formatWhen(t.time_start_estimate as string)} →{' '}
										{formatWhen(t.time_end_estimate as string)}
									</p>
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>

			<section aria-labelledby="past-heading">
				<h2 id="past-heading" className="text-lg font-semibold text-slate-100">
					Past
				</h2>
				{past.length === 0 ? (
					<p className="mt-2 text-sm text-slate-500">No completed or cancelled trips yet.</p>
				) : (
					<ul className="mt-3 space-y-2">
						{past.map((t) => (
							<li key={t.id as string}>
								<Link
									href={`/field/trips/${t.id as string}`}
									className="block rounded-lg border border-slate-800/80 bg-slate-900/30 px-4 py-3 text-slate-300 hover:bg-slate-900/50"
								>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<span className="font-medium capitalize">
											{(t.status as string) ?? '—'}
										</span>
										<span className="text-xs text-slate-500">
											{formatWhen(t.time_start_estimate as string)}
										</span>
									</div>
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	)
}
