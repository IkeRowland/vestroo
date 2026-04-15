import {
	listComplianceIncidentsAction,
	listExpiringComplianceDocumentsAction,
} from '@/actions/opsCompliance'
import { ComplianceDsrPanel } from '@/features/ops/components/ComplianceDsrPanel'
import { OpsEmptyState } from '@/features/ops/components/OpsEmptyState'
import {
	OpsFilterRow,
	OpsPageHeader,
	OpsTableShell,
} from '@/features/ops/components/ops-primitives'
import { OpsErrorState } from '@/features/ops/components/OpsErrorState'
import { OPS_EMPTY_COPY } from '@/features/ops/ops-list-state-copy'
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
		<div className="min-w-0 max-w-full">
			<OpsPageHeader
				title="Compliance"
				description={
					<>
						Staff incident log and fleet/chauffeur compliance document expiry. Engineering posture and
						POPIA-oriented boundaries:{' '}
						<code className="text-ops-foreground/90">docs/compliance-and-safety.md</code>.
					</>
				}
			/>

			<OpsFilterRow className="mt-4" aria-label="Compliance data context">
				<span className="text-ops-dense text-ops-muted">
					Incidents and document horizon are loaded via server actions (VST-12). DSR tools require admin
					role.
				</span>
			</OpsFilterRow>

			<p className="mt-3 text-xs text-ops-muted">
				Audit events: <code className="text-ops-foreground/80">create_compliance_incident</code>,{' '}
				<code className="text-ops-foreground/80">create_*_compliance_document</code>,{' '}
				<code className="text-ops-foreground/80">dsr_export</code>,{' '}
				<code className="text-ops-foreground/80">dsr_anonymise</code> (admin only).
			</p>

			<section className="mt-8">
				<h2 className="text-lg font-medium text-ops-foreground">Recent incidents</h2>
				<div className="mt-3">
					{!incidents.ok ? (
						<OpsErrorState title="Incidents could not be loaded" message={incidents.message} />
					) : incidents.rows.length === 0 ? (
						<OpsEmptyState
							title={OPS_EMPTY_COPY.incidents.title}
							description={OPS_EMPTY_COPY.incidents.description}
						/>
					) : (
						<ul className="space-y-2" role="list">
							{incidents.rows.map((row) => (
								<li
									key={row.id as string}
									className="rounded-lg border border-ops-border bg-ops-surface/40 px-3 py-2 text-sm"
									role="listitem"
								>
									<div className="flex flex-wrap items-baseline gap-2">
										<span className="rounded bg-ops-surface-hover px-2 py-0.5 text-xs text-ops-foreground">
											{String(row.category)}
										</span>
										<time className="text-xs text-ops-muted" dateTime={String(row.occurred_at)}>
											{String(row.occurred_at)}
										</time>
									</div>
									<p className="mt-1 text-ops-foreground">{String(row.summary)}</p>
									{row.related_booking_id ? (
										<p className="mt-1 font-mono text-xs text-ops-muted">
											Booking {String(row.related_booking_id)}
										</p>
									) : null}
								</li>
							))}
						</ul>
					)}
				</div>
			</section>

			<section className="mt-10">
				<h2 className="text-lg font-medium text-ops-foreground">
					Compliance documents — expiry on or before {expiring.ok ? expiring.horizonDate : '—'} (
					{EXPIRY_WINDOW_DAYS}-day window, includes overdue)
				</h2>
				<div className="mt-3">
					{!expiring.ok ? (
						<OpsErrorState title="Documents could not be loaded" message={expiring.message} />
					) : expiring.vehicleRows.length === 0 && expiring.chauffeurRows.length === 0 ? (
						<OpsEmptyState
							title={OPS_EMPTY_COPY.documentsInWindow.title}
							description={OPS_EMPTY_COPY.documentsInWindow.description}
						/>
					) : (
						<div className="grid gap-6 md:grid-cols-2">
							<div>
								<h3 className="text-sm font-medium text-ops-muted">Vehicles</h3>
								{expiring.vehicleRows.length === 0 ? (
									<p className="mt-2 text-xs text-ops-muted">None in this window.</p>
								) : (
									<OpsTableShell
										className="mt-2"
										caption="Vehicle compliance documents expiring within the configured horizon"
										tableClassName="min-w-0"
									>
										<thead>
											<tr className="border-b border-ops-border text-ops-table-header text-ops-muted">
												<th scope="col" className="py-2 pr-3 text-left font-semibold">
													Document type
												</th>
												<th scope="col" className="py-2 pr-3 text-left font-semibold">
													Vehicle
												</th>
												<th scope="col" className="py-2 pr-3 text-left font-semibold">
													Expires
												</th>
											</tr>
										</thead>
										<tbody>
											{expiring.vehicleRows.map((r) => (
												<tr key={r.id as string} className="border-b border-ops-border/70">
													<td className="py-2 pr-3 font-mono text-xs text-emerald-400">
														{String(r.document_type)}
													</td>
													<td className="py-2 pr-3 text-ops-muted">{String(r.vehicle_id)}</td>
													<td className="py-2 pr-3 text-ops-muted">{String(r.expiry_date)}</td>
												</tr>
											))}
										</tbody>
									</OpsTableShell>
								)}
							</div>
							<div>
								<h3 className="text-sm font-medium text-ops-muted">Chauffeurs</h3>
								{expiring.chauffeurRows.length === 0 ? (
									<p className="mt-2 text-xs text-ops-muted">None in this window.</p>
								) : (
									<OpsTableShell
										className="mt-2"
										caption="Chauffeur compliance documents expiring within the configured horizon"
										tableClassName="min-w-0"
									>
										<thead>
											<tr className="border-b border-ops-border text-ops-table-header text-ops-muted">
												<th scope="col" className="py-2 pr-3 text-left font-semibold">
													Document type
												</th>
												<th scope="col" className="py-2 pr-3 text-left font-semibold">
													Profile
												</th>
												<th scope="col" className="py-2 pr-3 text-left font-semibold">
													Expires
												</th>
											</tr>
										</thead>
										<tbody>
											{expiring.chauffeurRows.map((r) => (
												<tr key={r.id as string} className="border-b border-ops-border/70">
													<td className="py-2 pr-3 font-mono text-xs text-emerald-400">
														{String(r.document_type)}
													</td>
													<td className="py-2 pr-3 text-ops-muted">{String(r.chauffeur_id)}</td>
													<td className="py-2 pr-3 text-ops-muted">{String(r.expiry_date)}</td>
												</tr>
											))}
										</tbody>
									</OpsTableShell>
								)}
							</div>
						</div>
					)}
				</div>
			</section>

			{isAdmin ? (
				<ComplianceDsrPanel />
			) : (
				<section className="mt-8 rounded-lg border border-ops-border bg-ops-surface/30 px-4 py-4">
					<h2 className="text-lg font-semibold text-ops-foreground">Data subject requests</h2>
					<p className="mt-1 text-sm text-ops-muted">
						DSR export and anonymisation are limited to users with the{' '}
						<code className="text-ops-foreground/80">admin</code> role. Dispatchers can work with incidents
						and document lists above.
					</p>
				</section>
			)}
		</div>
	)
}
