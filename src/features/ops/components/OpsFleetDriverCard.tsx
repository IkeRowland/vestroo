'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { OpsDriverAvatarThumb } from '@/features/ops/components/OpsDriverAvatarThumb'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import {
	opsFleetDriversCopy,
	fleetDriverShiftStatusLabel,
	fleetDriverTripStatusLabel,
} from '@/features/ops/copy/ops-fleet-drivers-copy'
import type {
	FleetDriverShiftStatus,
	FleetDriverTripStatus,
} from '@/features/ops/lib/ops-fleet-drivers-availability'
import {
	fleetDriverShiftStatusPillKey,
	fleetDriverTripStatusPillKey,
} from '@/features/ops/lib/ops-fleet-drivers-availability'
import type { OpsFleetDriverRow } from '@/features/ops/ops-fleet-drivers-types'
import { getOpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { opsFulfilQueueHref } from '@/lib/ops-fulfil-nav'
import { cn } from '@/lib/utils'

export type OpsFleetDriverCardProps = {
	driver: OpsFleetDriverRow
	activeTripCount: number
	tripStatus: FleetDriverTripStatus
	shiftStatus: FleetDriverShiftStatus
	selected: boolean
	onOpen: () => void
	onEdit: () => void
	className?: string
}

export function OpsFleetDriverCard({
	driver,
	activeTripCount,
	tripStatus,
	shiftStatus,
	selected,
	onOpen,
	onEdit,
	className,
}: OpsFleetDriverCardProps) {
	const displayName = driver.full_name?.trim() || 'Unnamed'
	const shiftOff = driver.status === 'inactive'

	return (
		<article
			role="listitem"
			data-ops-fleet-drivers-row={driver.id}
			className={cn(
				'flex min-w-0 flex-col overflow-hidden rounded-ops-card border bg-ops-surface shadow-ops-1',
				selected ? 'border-ops ring-2 ring-ops ring-offset-2 ring-offset-ops-canvas' : 'border-ops-border',
				className,
			)}
		>
			<div className="relative flex w-full shrink-0 items-center justify-center bg-ops-surface-active py-6">
				<OpsDriverAvatarThumb
					imageUrl={driver.avatar_url}
					objectPosition={driver.avatar_object_position}
					displayName={displayName}
					sizeClassName="h-24 w-24"
					imageSizes="96px"
					className="shadow-sm"
				/>
			</div>

			<div className="flex min-w-0 flex-1 flex-col gap-2 p-3">
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-ops-foreground">{displayName}</p>
					<p className="truncate text-xs text-ops-muted">{driver.phone ?? opsFleetDriversCopy.noPhone}</p>
					<p className="mt-1 text-xs tabular-nums text-ops-muted">
						{opsFleetDriversCopy.activeTripsColumn}: {activeTripCount}
					</p>
				</div>

				<div className="flex flex-wrap items-center gap-2">
					<OpsStatusPill tone={getOpsStatusPillTone(fleetDriverTripStatusPillKey(tripStatus))}>
						{fleetDriverTripStatusLabel(tripStatus)}
					</OpsStatusPill>
					<OpsStatusPill tone={getOpsStatusPillTone(fleetDriverShiftStatusPillKey(shiftStatus))}>
						{fleetDriverShiftStatusLabel(shiftStatus)}
					</OpsStatusPill>
				</div>

				<div className="mt-auto flex flex-wrap gap-2 pt-1">
					<Button
						type="button"
						size="sm"
						variant="outline"
						className="border-ops-border"
						onClick={onEdit}
					>
						{opsFleetDriversCopy.editDriver}
					</Button>
					<Button
						type="button"
						size="sm"
						className="bg-primary text-primary-foreground hover:bg-primary/90"
						aria-label={opsFleetDriversCopy.driverRowOpenDetailAria(displayName)}
						onClick={onOpen}
					>
						{opsFleetDriversCopy.openDriverDetail}
					</Button>
					{shiftOff ? (
						<Button type="button" size="sm" variant="outline" className="border-ops-border" disabled>
							{opsFleetDriversCopy.assignDriverToTrip}
						</Button>
					) : (
						<Button type="button" size="sm" variant="outline" className="border-ops-border" asChild>
							<Link
								href={opsFulfilQueueHref('paid', { focusDriverProfileId: driver.id })}
								aria-label={`${opsFleetDriversCopy.assignDriverToTrip} — ${displayName}`}
							>
								{opsFleetDriversCopy.assignDriverToTrip}
							</Link>
						</Button>
					)}
				</div>
			</div>
		</article>
	)
}
