import { AssignBookingPanel } from '@/features/ops/components/AssignBookingPanel'
import {
	OpsFilterRow,
	OpsPageHeader,
} from '@/features/ops/components/ops-primitives'
import { OpsErrorState } from '@/features/ops/components/OpsErrorState'
import { createUserServerClient } from '@/lib/supabase/server'

export default async function OpsFulfilPage() {
	const supabase = await createUserServerClient()

	const { data: bookings, error: bErr } = await supabase
		.from('bookings')
		.select('id, payment_reference, pickup_datetime, status, payment_status')
		.eq('status', 'paid')
		.eq('payment_status', 'paid')
		.order('created_at', { ascending: false })
		.limit(50)

	const { data: links } = await supabase.from('booking_trips').select('booking_id')

	const { data: runs, error: rErr } = await supabase
		.from('service_runs')
		.select('id, service_date, trip_number, scheduled_start, scheduled_end')
		.order('service_date', { ascending: false })
		.limit(40)

	const { data: chauffeurs } = await supabase
		.from('profiles')
		.select('id, full_name')
		.eq('role', 'chauffeur')
		.eq('status', 'active')
		.order('full_name')

	const { data: vehicles } = await supabase
		.from('vehicles')
		.select('id, name')
		.order('name')

	const linked = new Set((links ?? []).map((l) => l.booking_id as string))
	const queue =
		(bookings ?? []).filter((b) => !linked.has(b.id as string)) ?? []

	const runOptions =
		(runs ?? []).map((r) => ({
			id: r.id as string,
			label: `${String(r.service_date)} · run #${r.trip_number} · ${new Date(r.scheduled_start as string).toLocaleString()}`,
		})) ?? []

	return (
		<div className="min-w-0 max-w-full">
			<OpsPageHeader
				title="Fulfil"
				description={
					<>
						Paid bookings without a <code className="text-ops-foreground/90">booking_trips</code> row.
						Assignment creates a <code className="text-ops-foreground/90">trips</code> row, links the
						booking, writes <code className="text-ops-foreground/90">chauffeur_assignments</code>, and finds
						or creates <code className="text-ops-foreground/90">chauffeur_schedules</code> for the run
						date.
					</>
				}
			/>

			<OpsFilterRow className="mt-4" aria-label="Queue context">
				<span className="text-ops-dense text-ops-muted">
					Queue and runs load from Supabase on each navigation; assignment runs as a server action.
				</span>
			</OpsFilterRow>

			<div className="mt-4 space-y-3">
				{bErr ? (
					<OpsErrorState title="Bookings could not be loaded" message={bErr.message} />
				) : null}
				{rErr ? (
					<OpsErrorState title="Service runs could not be loaded" message={rErr.message} />
				) : null}
			</div>

			<div className="mt-6">
				<AssignBookingPanel
					bookings={queue.map((b) => ({
						id: b.id as string,
						payment_reference: (b.payment_reference as string | null) ?? null,
						pickup_datetime: (b.pickup_datetime as string | null) ?? null,
					}))}
					serviceRuns={runOptions}
					chauffeurs={(chauffeurs ?? []).map((c) => ({
						id: c.id as string,
						full_name: (c.full_name as string) ?? '',
					}))}
					vehicles={(vehicles ?? []).map((v) => ({
						id: v.id as string,
						name: (v.name as string) ?? '',
					}))}
				/>
			</div>
		</div>
	)
}
