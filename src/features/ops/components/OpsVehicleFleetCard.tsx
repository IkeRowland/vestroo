'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Car, Fuel, Gauge, Users } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { opsVehiclesCopy } from '@/features/ops/copy/ops-vehicles-copy'
import {
	formatVehicleFuelLabel,
	formatVehicleTransmissionLabel,
} from '@/features/ops/lib/ops-vehicle-field-labels'
import type { OpsFleetVehicleRow } from '@/features/ops/ops-fleet-types'
import type { VehicleFleetStatusKey } from '@/features/ops/lib/ops-vehicles-fleet-status'
import {
	getVehicleFleetStatusLabel,
	getVehicleFleetStatusPillTone,
} from '@/features/ops/lib/ops-vehicles-fleet-status'
import { cn } from '@/lib/utils'

export type OpsVehicleFleetCardProps = {
	vehicle: OpsFleetVehicleRow
	categoryLabel: string
	statusKey: VehicleFleetStatusKey
	activeTripCount: number
	onOpen: () => void
	className?: string
}

/**
 * Single fleet card (**FE.17.6**) — fixed **16:9** media, status pill, quick stats, primary **Open** + secondary assign link.
 */
export function OpsVehicleFleetCard({
	vehicle,
	categoryLabel,
	statusKey,
	activeTripCount,
	onOpen,
	className,
}: OpsVehicleFleetCardProps) {
	const displayName =
		vehicle.name?.trim() ||
		[vehicle.model_year, vehicle.make, vehicle.model].filter(Boolean).join(' ') ||
		vehicle.license_plate

	const hasImage = Boolean(vehicle.primary_image_url?.trim())

	return (
		<article
			role="listitem"
			className={cn(
				'flex min-w-0 flex-col overflow-hidden rounded-ops-card border border-ops-border bg-ops-surface shadow-ops-1',
				className,
			)}
		>
			<div className="relative aspect-video w-full shrink-0 bg-ops-surface-active">
				{hasImage ? (
					<Image
						src={vehicle.primary_image_url!.trim()}
						alt=""
						fill
						className="object-cover"
						sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
					/>
				) : (
					<div
						className="flex h-full w-full items-center justify-center text-ops-muted"
						aria-hidden
					>
						<Car className="h-12 w-12 opacity-40" strokeWidth={1.25} />
					</div>
				)}
				<span className="sr-only">{opsVehiclesCopy.detailHeroAlt(displayName)}</span>
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
				<div className="min-w-0">
					<p className="truncate text-xs font-medium uppercase tracking-wide text-ops-muted">
						{categoryLabel}
					</p>
					<p className="truncate text-sm font-semibold text-ops-foreground">{displayName}</p>
					<p className="truncate font-mono text-xs text-ops-muted">{vehicle.license_plate}</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<OpsStatusPill tone={getVehicleFleetStatusPillTone(statusKey)}>
						{getVehicleFleetStatusLabel(statusKey)}
					</OpsStatusPill>
					{activeTripCount > 0 ? (
						<span className="text-xs tabular-nums text-ops-muted">
							{activeTripCount} active {activeTripCount === 1 ? 'trip' : 'trips'}
						</span>
					) : null}
				</div>

				<div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ops-muted">
					<span className="inline-flex items-center gap-1">
						<Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
						{vehicle.seats ?? '—'}
					</span>
					<span className="inline-flex items-center gap-1">
						<Gauge className="h-3.5 w-3.5 shrink-0" aria-hidden />
						{formatVehicleTransmissionLabel(vehicle.transmission)}
					</span>
					<span className="inline-flex items-center gap-1">
						<Fuel className="h-3.5 w-3.5 shrink-0" aria-hidden />
						{formatVehicleFuelLabel(vehicle.fuel_type)}
					</span>
				</div>

				<div className="mt-auto flex flex-wrap gap-2 pt-1">
					<Button
						type="button"
						size="sm"
						className="bg-primary text-primary-foreground hover:bg-primary/90"
						aria-label={opsVehiclesCopy.cardOpenAria(displayName)}
						onClick={onOpen}
					>
						{opsVehiclesCopy.openDetail}
					</Button>
					<Button type="button" size="sm" variant="outline" className="border-ops-border" asChild>
						<Link
							href={opsVehiclesCopy.fulfilAssignHref}
							aria-label={opsVehiclesCopy.cardAssignAria(displayName)}
						>
							{opsVehiclesCopy.assignToTrip}
						</Link>
					</Button>
				</div>
			</div>
		</article>
	)
}
