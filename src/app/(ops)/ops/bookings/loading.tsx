import { OpsLoadingRegion } from '@/features/ops/components/OpsLoadingRegion'

/**
 * E2: visible loading for `/ops/bookings` while the server component resolves (Story 12.3).
 */
export default function OpsBookingsLoading() {
	return (
		<div className="min-w-0 max-w-full space-y-6">
			<div className="h-9 max-w-xs animate-pulse rounded-md bg-ops-surface/50" aria-hidden />
			<div className="h-4 max-w-md animate-pulse rounded-md bg-ops-surface/40" aria-hidden />
			<OpsLoadingRegion label="Loading bookings queue…" className="mt-2" />
		</div>
	)
}
