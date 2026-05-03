import type { PublicRiderTrackDto } from '../lib/public-rider-track-dto'

type Props = {
	dto: PublicRiderTrackDto
}

export function DriverVehicleCard({ dto }: Props) {
	const driverLabel = dto.driverFirstName ? dto.driverFirstName : 'Your driver'

	return (
		<section
			className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
			aria-label="Driver and vehicle"
		>
			<h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Driver &amp; vehicle</h2>
			<div className="mt-4 flex gap-4">
				{dto.driverAvatarUrl ? (
					// eslint-disable-next-line @next/next/no-img-element -- signed/external URLs from storage
					<img
						src={dto.driverAvatarUrl}
						alt=""
						className="h-14 w-14 shrink-0 rounded-full object-cover"
						width={56}
						height={56}
					/>
				) : (
					<div
						className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-500"
						aria-hidden
					>
						{driverLabel.slice(0, 1).toUpperCase()}
					</div>
				)}
				<div className="min-w-0 flex-1">
					<p className="text-base font-medium text-gray-900">{driverLabel}</p>
					<p className="mt-1 text-sm text-gray-600">{dto.vehicleLine}</p>
					{dto.plateMasked ? (
						<p className="mt-1 font-mono text-sm text-gray-700">Plate {dto.plateMasked}</p>
					) : null}
				</div>
			</div>
			{dto.cancelled ? (
				<p className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500">
					Driver contact is not shown for cancelled trips.
				</p>
			) : dto.showCallDriver && dto.callDriverTelHref && dto.callDriverMaskedPhone ? (
				<p className="mt-4 border-t border-gray-100 pt-4">
					<a
						href={dto.callDriverTelHref}
						className="text-sm font-medium text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-900"
					>
						Call driver ({dto.callDriverMaskedPhone})
					</a>
				</p>
			) : (
				<p className="mt-4 border-t border-gray-100 pt-4 text-xs text-gray-500">
					Call driver becomes available when your trip is assigned and on the way.
				</p>
			)}
		</section>
	)
}
