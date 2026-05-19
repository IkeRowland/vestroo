import type { OpsBookingTripAssignmentSummary } from '@/lib/ops-booking-detail'
import { formatQueueStatusLabel } from '@/lib/ops-bookings-queue-query'

function formatIso(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

type Props = {
	summary: OpsBookingTripAssignmentSummary
}

/**
 * Ops booking detail — linked **trips** row: chauffeur + fleet vehicle (authoritative assignment).
 */
export function OpsBookingTripAssignmentSummarySection({ summary }: Props) {
	const statusLabel =
		summary.tripStatus && summary.tripStatus.trim() !== ''
			? formatQueueStatusLabel(summary.tripStatus)
			: '—'

	return (
		<section
			className="rounded-lg border border-ops-border bg-ops-surface/30 p-4"
			aria-labelledby="ops-trip-assignment-heading"
		>
			<h2
				id="ops-trip-assignment-heading"
				className="text-base font-semibold text-ops-foreground"
			>
				Trip assignment
			</h2>
			<p className="mt-1 text-xs text-ops-muted">
				Operational trip linked to this booking (driver and vehicle on the run record).
			</p>
			<dl className="mt-4 grid gap-4 sm:grid-cols-2">
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Driver</dt>
					<dd className="mt-1 text-sm text-ops-foreground">
						{summary.driverFullName?.trim() ? summary.driverFullName.trim() : '—'}
					</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Vehicle</dt>
					<dd className="mt-1 text-sm text-ops-foreground">
						{summary.vehicleName?.trim() ? summary.vehicleName.trim() : '—'}
					</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Trip status</dt>
					<dd className="mt-1 text-sm text-ops-foreground">{statusLabel}</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Trip ID</dt>
					<dd className="mt-1 font-mono text-xs text-ops-foreground">{summary.tripId}</dd>
				</div>
				<div className="sm:col-span-2">
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">
						Scheduled window (estimate)
					</dt>
					<dd className="mt-1 text-sm text-ops-foreground">
						{formatIso(summary.timeStartEstimate)} → {formatIso(summary.timeEndEstimate)}
					</dd>
				</div>
			</dl>
		</section>
	)
}
