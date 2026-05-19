import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AvailabilityCheckPanel } from '@/features/ops/components/AvailabilityCheckPanel'
import { OpsErrorState } from '@/features/ops/components/OpsErrorState'
import { OpsPageHeader } from '@/features/ops/components/ops-primitives'
import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import type { AvailabilityRouteScope } from '@/lib/ops-availability-check-input'
import { loadAvailabilityCheckContext } from '@/lib/ops-availability-loader'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
	params: Promise<{ id: string }>
}

export default async function OpsBookingAvailabilityCheckPage({ params }: PageProps) {
	const { id: bookingId } = await params
	const supabase = await createUserServerClient()

	const rowRes = await supabase
		.from('bookings')
		.select('client_type')
		.eq('id', bookingId)
		.maybeSingle()

	if (rowRes.error || !rowRes.data) {
		notFound()
	}

	const ct = rowRes.data.client_type
	let scope: AvailabilityRouteScope
	if (ct === 'account_client') {
		scope = 'account_client'
	} else if (ct === 'walk_in') {
		scope = 'walk_in'
	} else {
		notFound()
	}

	const result = await loadAvailabilityCheckContext(supabase, bookingId, scope)

	const clientLabel = scope === 'walk_in' ? 'Walk-in booking' : 'Account-client booking'
	const backLabel = '← Back to bookings queue'

	if (!result.ok) {
		if (result.reason === 'not_found' || result.reason === 'forbidden') {
			notFound()
		}
		return (
			<div className="min-w-0 max-w-full space-y-6">
				<OpsPageHeader
					title="Check availability"
					description={`${clientLabel} — vehicle and driver time strips.`}
				/>
				<OpsErrorState
					title="Could not load availability data"
					message={result.message}
					sanitizeMessage={false}
					secondaryAction={{ label: 'Back to bookings queue', href: OPS_BOOKINGS_PATH }}
				/>
			</div>
		)
	}

	const { booking, window, vehicles, drivers, blocks } = result
	const refLabel = booking.paymentReference ?? `${booking.id.slice(0, 8)}…`

	return (
		<div className="min-w-0 max-w-full space-y-6">
			<OpsPageHeader
				title="Check availability"
				description={
					<>
						{clientLabel}{' '}
						<code className="font-mono text-xs text-ops-foreground">{refLabel}</code> — vehicle and driver
						time strips. Window defaults to pickup ±2h.
					</>
				}
			/>

			<AvailabilityCheckPanel
				scope={scope}
				booking={booking}
				window={window}
				vehicles={vehicles}
				drivers={drivers}
				blocks={blocks}
			/>

			<p>
				<Link
					href={OPS_BOOKINGS_PATH}
					className="text-sm font-medium text-primary underline-offset-2 hover:underline"
				>
					{backLabel}
				</Link>
			</p>
		</div>
	)
}
