import {
	listComplianceIncidentsAction,
	listExpiringComplianceDocumentsAction,
} from '@/actions/opsCompliance'
import { ComplianceDsrPanel } from '@/features/ops/components/ComplianceDsrPanel'
import { getStaffSession } from '@/lib/ops-auth'

const EXPIRY_WINDOW_DAYS = 30

export default async function OpsCompliancePage() {
	const staff = await getStaffSession()
	const isAdmin = staff?.role === 'admin'

	const [incidents, expiring] = await Promise.all([
		listComplianceIncidentsAction({ limit: 40 }),
		listExpiringComplianceDocumentsAction({ daysAhead: EXPIRY_WINDOW_DAYS }),
	])

	return (
		<div>
			<h1 className="text-2xl font-semibold text-white">Compliance</h1>
			<p className="mt-1 max-w-3xl text-sm text-zinc-400">
				Staff-only incident log and fleet/chauffeur document expiry tracking. Engineering posture and DSR
				boundaries: <code className="text-zinc-300">docs/compliance-and-safety.md</code>.
			</p>
			<p className="mt-2 text-xs text-zinc-500">
				Audit events: <code className="text-zinc-400">create_compliance_incident</code>,{' '}
				<code className="text-zinc-400">create_*_compliance_document</code>,{' '}
				<code className="text-zinc-400">dsr_export</code>, <code className="text-zinc-400">dsr_anonymise</code> (
				admin only).
			</p>

			<section className="mt-8">
				<h2 className="text-lg font-medium text-zinc-100">Recent incidents</h2>
				{!incidents.ok ? (
					<p className="mt-2 text-sm text-red-300">{incidents.message}</p>
				) : incidents.rows.length === 0 ? (
					<p className="mt-2 text-sm text-zinc-500">No incidents recorded yet.</p>
				) : (
					<ul className="mt-3 space-y-2">
						{incidents.rows.map((row) => (
							<li
								key={row.id as string}
								className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-sm"
							>
								<div className="flex flex-wrap items-baseline gap-2">
									<span className="rounded bg-zinc-800 px-2 py-0.5 text-xs text-zinc-200">
										{String(row.category)}
									</span>
									<time className="text-xs text-zinc-500" dateTime={String(row.occurred_at)}>
										{String(row.occurred_at)}
									</time>
								</div>
								<p className="mt-1 text-zinc-200">{String(row.summary)}</p>
								{row.related_booking_id ? (
									<p className="mt-1 font-mono text-xs text-zinc-500">
										booking {String(row.related_booking_id)}
									</p>
								) : null}
							</li>
						))}
					</ul>
				)}
			</section>

			<section className="mt-10">
				<h2 className="text-lg font-medium text-zinc-100">
					Compliance documents — expiry on or before {expiring.ok ? expiring.horizonDate : '—'} (
					{EXPIRY_WINDOW_DAYS}-day window, includes overdue)
				</h2>
				{!expiring.ok ? (
					<p className="mt-2 text-sm text-red-300">{expiring.message}</p>
				) : (
					<div className="mt-3 grid gap-6 md:grid-cols-2">
						<div>
							<h3 className="text-sm font-medium text-zinc-300">Vehicles</h3>
							{expiring.vehicleRows.length === 0 ? (
								<p className="mt-1 text-xs text-zinc-500">None in window.</p>
							) : (
								<ul className="mt-2 space-y-2 text-sm">
									{expiring.vehicleRows.map((r) => (
										<li
											key={r.id as string}
											className="rounded border border-zinc-800 bg-zinc-900/30 px-2 py-2"
										>
											<span className="font-mono text-xs text-emerald-400">{String(r.document_type)}</span>
											<span className="ml-2 text-zinc-400">vehicle {String(r.vehicle_id)}</span>
											<div className="text-xs text-zinc-500">expires {String(r.expiry_date)}</div>
										</li>
									))}
								</ul>
							)}
						</div>
						<div>
							<h3 className="text-sm font-medium text-zinc-300">Chauffeurs</h3>
							{expiring.chauffeurRows.length === 0 ? (
								<p className="mt-1 text-xs text-zinc-500">None in window.</p>
							) : (
								<ul className="mt-2 space-y-2 text-sm">
									{expiring.chauffeurRows.map((r) => (
										<li
											key={r.id as string}
											className="rounded border border-zinc-800 bg-zinc-900/30 px-2 py-2"
										>
											<span className="font-mono text-xs text-emerald-400">{String(r.document_type)}</span>
											<span className="ml-2 text-zinc-400">profile {String(r.chauffeur_id)}</span>
											<div className="text-xs text-zinc-500">expires {String(r.expiry_date)}</div>
										</li>
									))}
								</ul>
							)}
						</div>
					</div>
				)}
			</section>

			{isAdmin ? (
				<ComplianceDsrPanel />
			) : (
				<section className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/30 px-4 py-4">
					<h2 className="text-lg font-semibold text-zinc-200">Data subject requests</h2>
					<p className="mt-1 text-sm text-zinc-500">
						DSR export and anonymise are restricted to users with <code className="text-zinc-400">admin</code>{' '}
						role. Dispatchers can manage incidents and compliance documents only.
					</p>
				</section>
			)}
		</div>
	)
}
