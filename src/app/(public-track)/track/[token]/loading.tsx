export default function RiderTrackLoading() {
	return (
		<div className="mx-auto max-w-lg space-y-6" aria-busy="true" aria-label="Loading trip status">
			<div className="h-28 animate-pulse rounded-xl bg-gray-200" />
			<div className="h-64 animate-pulse rounded-xl bg-gray-200" />
			<div className="h-48 animate-pulse rounded-xl bg-gray-200" />
		</div>
	)
}
