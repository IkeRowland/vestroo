import { formatBookingIntentLabel } from '@/features/ops/booking-intent-labels'
import {
	extractOpsBookingVehicleCategoryName,
	extractOpsBookingVehicleName,
	linkedAccountNameFromOpsBooking,
	type OpsBookingDetailRow,
	opsBookingServiceTypeLabel,
} from '@/lib/ops-booking-detail'
import { formatQueueStatusLabel } from '@/lib/ops-bookings-queue-query'

function formatZar(amount: number | null): string {
	if (amount == null || Number.isNaN(amount)) {
		return '—'
	}
	return new Intl.NumberFormat('en-ZA', {
		style: 'currency',
		currency: 'ZAR',
	}).format(amount)
}

function formatPickup(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

function formatRoute(origin: string | null, dest: string | null): string {
	const o = origin?.trim() || ''
	const d = dest?.trim() || ''
	if (!o && !d) return '—'
	if (!o) return d
	if (!d) return o
	return `${o} → ${d}`
}

function formatCreated(iso: string): string {
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

type OpsBookingImmutableSummaryProps = {
	booking: OpsBookingDetailRow
}

/**
 * Read-only booking facts for ops — same conceptual fields as account portal summary,
 * plus account / walk-in customer identifiers staff need when quoting.
 */
export function OpsBookingImmutableSummary({ booking }: OpsBookingImmutableSummaryProps) {
	const serviceType = opsBookingServiceTypeLabel(booking)
	const vehicleName = extractOpsBookingVehicleName(booking.booking_trips)
	const vehicleCategory = extractOpsBookingVehicleCategoryName(booking.booking_trips)
	const accountName = linkedAccountNameFromOpsBooking(booking)
	const intentLabel = formatBookingIntentLabel(booking.booking_intent)

	return (
		<section
			className="rounded-lg border border-ops-border bg-ops-surface/20 p-4"
			aria-labelledby="ops-booking-summary-heading"
		>
			<h2
				id="ops-booking-summary-heading"
				className="text-base font-semibold text-ops-foreground"
			>
				Booking details
			</h2>
			<p className="mt-1 text-xs text-ops-muted">
				Submitted request — values shown here are the record at booking time (not editable on this
				screen).
			</p>
			<dl className="mt-4 grid gap-4 sm:grid-cols-2">
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Booking ID</dt>
					<dd className="mt-1 font-mono text-xs text-ops-foreground">{booking.id}</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Reference</dt>
					<dd className="mt-1 text-sm text-ops-foreground">
						{booking.payment_reference?.trim() || '—'}
					</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Status</dt>
					<dd className="mt-1 text-sm text-ops-foreground">
						{booking.status ? formatQueueStatusLabel(booking.status) : '—'}
					</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">
						Payment status
					</dt>
					<dd className="mt-1 text-sm text-ops-foreground">
						{booking.payment_status ? formatQueueStatusLabel(booking.payment_status) : '—'}
					</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Client type</dt>
					<dd className="mt-1 text-sm text-ops-foreground">{booking.client_type ?? '—'}</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Created</dt>
					<dd className="mt-1 text-sm text-ops-foreground">{formatCreated(booking.created_at)}</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Intent</dt>
					<dd className="mt-1 text-sm text-ops-foreground">{intentLabel}</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">
						Booking total (if any)
					</dt>
					<dd className="mt-1 text-sm text-ops-foreground">{formatZar(booking.total_amount)}</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Pickup</dt>
					<dd className="mt-1 text-sm text-ops-foreground">{formatPickup(booking.pickup_datetime)}</dd>
				</div>
				<div className="sm:col-span-2">
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Route</dt>
					<dd className="mt-1 text-sm text-ops-foreground">
						{formatRoute(booking.origin_name, booking.destination_name)}
					</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Passengers</dt>
					<dd className="mt-1 text-sm text-ops-foreground">
						{booking.passenger_count != null ? String(booking.passenger_count) : '—'}
					</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Service type</dt>
					<dd className="mt-1 text-sm text-ops-foreground">{serviceType ?? '—'}</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Vehicle</dt>
					<dd className="mt-1 text-sm text-ops-foreground">{vehicleName ?? '—'}</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Category</dt>
					<dd className="mt-1 text-sm text-ops-foreground">{vehicleCategory ?? '—'}</dd>
				</div>
				{booking.customer_account_id || accountName ? (
					<div className="sm:col-span-2">
						<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">Account</dt>
						<dd className="mt-1 text-sm text-ops-foreground">
							{accountName ? (
								<>
									{accountName}
									{booking.customer_account_id ? (
										<span className="ml-2 font-mono text-xs text-ops-muted">
											({booking.customer_account_id})
										</span>
									) : null}
								</>
							) : (
								<span className="font-mono text-xs">{booking.customer_account_id ?? '—'}</span>
							)}
						</dd>
					</div>
				) : null}
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">
						Customer name
					</dt>
					<dd className="mt-1 text-sm text-ops-foreground">{booking.customer_name?.trim() || '—'}</dd>
				</div>
				<div>
					<dt className="text-xs font-medium uppercase tracking-wide text-ops-muted">
						Customer email
					</dt>
					<dd className="mt-1 break-all text-sm text-ops-foreground">
						{booking.customer_email?.trim() || '—'}
					</dd>
				</div>
				{(booking.rider_name?.trim() ||
					booking.rider_email?.trim() ||
					booking.rider_phone?.trim()) ? (
					<div className="sm:col-span-2 rounded-md border border-ops-border bg-ops-canvas/30 p-3">
						<p className="text-xs font-medium uppercase tracking-wide text-ops-muted">
							Rider / passenger contact
						</p>
						<div className="mt-2 space-y-1 text-sm text-ops-foreground">
							{booking.rider_name?.trim() ? (
								<p>
									<span className="text-ops-muted">Name: </span>
									{booking.rider_name.trim()}
								</p>
							) : null}
							{booking.rider_email?.trim() ? (
								<p>
									<span className="text-ops-muted">Email: </span>
									{booking.rider_email.trim()}
								</p>
							) : null}
							{booking.rider_phone?.trim() ? (
								<p>
									<span className="text-ops-muted">Phone: </span>
									{booking.rider_phone.trim()}
								</p>
							) : null}
						</div>
					</div>
				) : null}
			</dl>
		</section>
	)
}
