'use client'

import { useMemo, useState, useTransition } from 'react'

import {
	RATIONALE_MAX_LENGTH,
	submitAvailabilityCheckAction,
	type AvailabilityRouteScope,
} from '@/actions/opsAvailabilityCheck'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { OpsErrorState } from '@/features/ops/components/OpsErrorState'
import { OpsLoadingRegion } from '@/features/ops/components/OpsLoadingRegion'
import { getRoleDisplayLabel } from '@/features/ops/role-display'
import type {
	AvailabilityBookingSummary,
	AvailabilityDriverCandidate,
	AvailabilityTripBlock,
	AvailabilityVehicleCandidate,
} from '@/lib/ops-availability-loader'
import type { AvailabilityWindow } from '@/lib/ops-availability-window'
import { PROFILE_ROLE_OPS_DRIVER_DB } from '@/types/database.types'
import {
	isOpsActionFailure,
	opsActionCorrelationId,
	opsActionErrorMessage,
} from '@/lib/ops-action-result'
import { rangesOverlap } from '@/lib/ops-time-windows'
import { cn } from '@/lib/utils'

const TERMINAL_STATUSES = new Set(['cancelled', 'completed'])
const DISPLAY_TZ = 'Africa/Johannesburg'

type AvailabilityCheckPanelProps = {
	scope: AvailabilityRouteScope
	booking: AvailabilityBookingSummary
	window: AvailabilityWindow
	vehicles: AvailabilityVehicleCandidate[]
	drivers: AvailabilityDriverCandidate[]
	blocks: AvailabilityTripBlock[]
}

type ConflictSets = {
	vehicleIds: Set<string>
	driverIds: Set<string>
}

function blockIsLive(block: AvailabilityTripBlock): boolean {
	const st = (block.status ?? '').toLowerCase()
	return !TERMINAL_STATUSES.has(st)
}

function blockMs(block: AvailabilityTripBlock): { startMs: number; endMs: number } | null {
	const startMs = Date.parse(block.timeStart)
	const endMs = Date.parse(block.timeEnd)
	if (Number.isNaN(startMs) || Number.isNaN(endMs)) return null
	return { startMs, endMs }
}

function computeConflictSets(
	window: AvailabilityWindow,
	blocks: AvailabilityTripBlock[],
	vehicleIds: Set<string>,
	driverIds: Set<string>,
): ConflictSets {
	const vConflicts = new Set<string>()
	const dConflicts = new Set<string>()
	for (const block of blocks) {
		if (!blockIsLive(block)) continue
		const t = blockMs(block)
		if (!t) continue
		if (!rangesOverlap(window, t)) continue
		if (block.vehicleId && vehicleIds.has(block.vehicleId)) {
			vConflicts.add(block.vehicleId)
		}
		if (block.driverId && driverIds.has(block.driverId)) {
			dConflicts.add(block.driverId)
		}
	}
	return { vehicleIds: vConflicts, driverIds: dConflicts }
}

function formatTimeLabel(iso: string): string {
	const t = Date.parse(iso)
	if (Number.isNaN(t)) return '—'
	return new Intl.DateTimeFormat('en-ZA', {
		timeZone: DISPLAY_TZ,
		hour: '2-digit',
		minute: '2-digit',
		hourCycle: 'h23',
	}).format(new Date(t))
}

function formatDateTimeLabel(iso: string | null): string {
	if (!iso) return '—'
	const t = Date.parse(iso)
	if (Number.isNaN(t)) return '—'
	return new Intl.DateTimeFormat('en-ZA', {
		timeZone: DISPLAY_TZ,
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(new Date(t))
}

function blockOffsetPercent(
	block: AvailabilityTripBlock,
	window: AvailabilityWindow,
): { left: number; width: number } | null {
	const t = blockMs(block)
	if (!t) return null
	const totalMs = window.endMs - window.startMs
	if (totalMs <= 0) return null
	const clampedStart = Math.max(t.startMs, window.startMs)
	const clampedEnd = Math.min(t.endMs, window.endMs)
	if (clampedEnd <= clampedStart) return null
	const left = ((clampedStart - window.startMs) / totalMs) * 100
	const width = ((clampedEnd - clampedStart) / totalMs) * 100
	return { left, width }
}

function tickPositions(window: AvailabilityWindow): Array<{ pct: number; label: string }> {
	const totalMs = window.endMs - window.startMs
	if (totalMs <= 0) return []
	const stepCount = 4
	const out: Array<{ pct: number; label: string }> = []
	for (let i = 0; i <= stepCount; i++) {
		const pct = (i / stepCount) * 100
		const ms = window.startMs + (totalMs * i) / stepCount
		out.push({ pct, label: formatTimeLabel(new Date(ms).toISOString()) })
	}
	return out
}

export function AvailabilityCheckPanel({
	scope,
	booking,
	window,
	vehicles,
	drivers,
	blocks,
}: AvailabilityCheckPanelProps) {
	const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null)
	const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null)
	const [rationale, setRationale] = useState('')
	const [pending, startTransition] = useTransition()
	const [formError, setFormError] = useState<string | null>(null)

	const vehicleIdSet = useMemo(() => new Set(vehicles.map((v) => v.id)), [vehicles])
	const driverIdSet = useMemo(() => new Set(drivers.map((d) => d.id)), [drivers])

	const conflicts = useMemo(
		() => computeConflictSets(window, blocks, vehicleIdSet, driverIdSet),
		[window, blocks, vehicleIdSet, driverIdSet],
	)

	const vehicleBlocksByVehicle = useMemo(() => {
		const map = new Map<string, AvailabilityTripBlock[]>()
		for (const block of blocks) {
			if (!block.vehicleId || !vehicleIdSet.has(block.vehicleId)) continue
			const list = map.get(block.vehicleId) ?? []
			list.push(block)
			map.set(block.vehicleId, list)
		}
		return map
	}, [blocks, vehicleIdSet])

	const driverBlocksByDriver = useMemo(() => {
		const map = new Map<string, AvailabilityTripBlock[]>()
		for (const block of blocks) {
			if (!block.driverId || !driverIdSet.has(block.driverId)) continue
			const list = map.get(block.driverId) ?? []
			list.push(block)
			map.set(block.driverId, list)
		}
		return map
	}, [blocks, driverIdSet])

	const hasConflict = conflicts.vehicleIds.size > 0 || conflicts.driverIds.size > 0
	const rationaleTrimmed = rationale.trim()
	const rationaleRequired = hasConflict
	const rationaleError =
		rationaleTrimmed.length > RATIONALE_MAX_LENGTH
			? `Rationale must be ${RATIONALE_MAX_LENGTH} characters or fewer.`
			: rationaleRequired && rationaleTrimmed.length === 0
				? 'Rationale is required because at least one candidate has a conflict in this window.'
				: null
	const submitDisabled =
		pending ||
		selectedVehicleId == null ||
		selectedDriverId == null ||
		rationaleError != null

	const ticks = useMemo(() => tickPositions(window), [window])

	const driverLabel = getRoleDisplayLabel(PROFILE_ROLE_OPS_DRIVER_DB)

	const handleSubmit = () => {
		setFormError(null)
		if (selectedVehicleId == null || selectedDriverId == null) {
			setFormError(`Select one vehicle and one ${driverLabel.toLowerCase()} before submitting.`)
			return
		}
		if (rationaleError) {
			setFormError(rationaleError)
			return
		}
		startTransition(async () => {
			const res = await submitAvailabilityCheckAction({
				bookingId: booking.id,
				scope,
				selectedVehicleId,
				selectedDriverId,
				rationale: rationaleTrimmed.length > 0 ? rationaleTrimmed : undefined,
				candidatesConsidered: {
					vehicleIds: vehicles.map((v) => v.id),
					driverIds: drivers.map((d) => d.id),
				},
			})
			if (res && !res.ok && isOpsActionFailure(res)) {
				const ref = opsActionCorrelationId(res)
				const suffix = ref ? ` (${ref.slice(0, 8)}…)` : ''
				setFormError(`${opsActionErrorMessage(res)}${suffix}`)
			}
		})
	}

	if (vehicles.length === 0 && drivers.length === 0) {
		return (
			<OpsErrorState
				title="No candidates available"
				message="No vehicles or drivers were available to compare. Add at least one active driver and a vehicle whose category seats meet the booking passenger count."
				sanitizeMessage={false}
			/>
		)
	}

	return (
		<div className="space-y-6">
			<header className="rounded-lg border border-ops-border bg-ops-surface/50 p-4">
				<h2 className="text-lg font-semibold text-ops-foreground">Availability check</h2>
				<dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm text-ops-muted sm:grid-cols-2">
					<div>
						<dt className="inline font-medium text-ops-foreground">Booking:</dt>{' '}
						<dd className="inline">
							<code className="font-mono text-xs">
								{booking.paymentReference ?? `${booking.id.slice(0, 8)}…`}
							</code>
						</dd>
					</div>
					<div>
						<dt className="inline font-medium text-ops-foreground">Pickup:</dt>{' '}
						<dd className="inline">{formatDateTimeLabel(booking.pickupDatetime)}</dd>
					</div>
					<div>
						<dt className="inline font-medium text-ops-foreground">Passengers:</dt>{' '}
						<dd className="inline">{booking.passengerCount}</dd>
					</div>
					<div>
						<dt className="inline font-medium text-ops-foreground">Window:</dt>{' '}
						<dd className="inline">
							{formatDateTimeLabel(window.startIso)} → {formatDateTimeLabel(window.endIso)} (
							{DISPLAY_TZ})
						</dd>
					</div>
				</dl>
			</header>

			<section aria-labelledby="vehicle-strip-heading" className="space-y-3">
				<div className="flex items-baseline justify-between gap-3">
					<h3 id="vehicle-strip-heading" className="text-base font-semibold text-ops-foreground">
						Vehicles ({vehicles.length})
					</h3>
					{conflicts.vehicleIds.size > 0 ? (
						<span className="text-xs font-medium text-red-200">
							{conflicts.vehicleIds.size} with conflict in window
						</span>
					) : null}
				</div>

				<TimelineHeader window={window} ticks={ticks} />

				{vehicles.length === 0 ? (
					<p className="text-sm italic text-ops-muted">
						No vehicles meet the passenger count requirement.
					</p>
				) : (
					<ul className="space-y-2">
						{vehicles.map((vehicle) => {
							const isSelected = selectedVehicleId === vehicle.id
							const inConflict = conflicts.vehicleIds.has(vehicle.id)
							return (
								<li key={vehicle.id}>
									<RowStripCard
										title={vehicle.name}
										subtitle={[
											vehicle.licensePlate,
											vehicle.categoryName ? `${vehicle.categoryName} · ${vehicle.categorySeats} seats` : null,
										]
											.filter(Boolean)
											.join(' · ')}
										isSelected={isSelected}
										inConflict={inConflict}
										onSelect={() => setSelectedVehicleId(vehicle.id)}
										ariaLabel={`Select vehicle ${vehicle.name}`}
										blocks={vehicleBlocksByVehicle.get(vehicle.id) ?? []}
										window={window}
										dataTestId={`availability-vehicle-row-${vehicle.id}`}
									/>
								</li>
							)
						})}
					</ul>
				)}
			</section>

			<section aria-labelledby="driver-strip-heading" className="space-y-3">
				<div className="flex items-baseline justify-between gap-3">
					<h3 id="driver-strip-heading" className="text-base font-semibold text-ops-foreground">
						{driverLabel}s ({drivers.length})
					</h3>
					{conflicts.driverIds.size > 0 ? (
						<span className="text-xs font-medium text-red-200">
							{conflicts.driverIds.size} with conflict in window
						</span>
					) : null}
				</div>

				<TimelineHeader window={window} ticks={ticks} />

				{drivers.length === 0 ? (
					<p className="text-sm italic text-ops-muted">
						No active {driverLabel.toLowerCase()}s found.
					</p>
				) : (
					<ul className="space-y-2">
						{drivers.map((driver) => {
							const isSelected = selectedDriverId === driver.id
							const inConflict = conflicts.driverIds.has(driver.id)
							return (
								<li key={driver.id}>
									<RowStripCard
										title={driver.displayName}
										subtitle={driver.email}
										isSelected={isSelected}
										inConflict={inConflict}
										onSelect={() => setSelectedDriverId(driver.id)}
										ariaLabel={`Select ${driverLabel.toLowerCase()} ${driver.displayName}`}
										blocks={driverBlocksByDriver.get(driver.id) ?? []}
										window={window}
										dataTestId={`availability-driver-row-${driver.id}`}
									/>
								</li>
							)
						})}
					</ul>
				)}
			</section>

			<section aria-labelledby="rationale-heading" className="space-y-2 rounded-lg border border-ops-border bg-ops-surface/30 p-4">
				<div className="flex items-baseline justify-between gap-3">
					<h3 id="rationale-heading" className="text-base font-semibold text-ops-foreground">
						Rationale {rationaleRequired ? <span className="text-red-200">(required)</span> : <span className="text-ops-muted">(optional)</span>}
					</h3>
					<span className="text-xs text-ops-muted tabular-nums">
						{rationaleTrimmed.length}/{RATIONALE_MAX_LENGTH}
					</span>
				</div>
				<Textarea
					id="availability-rationale"
					value={rationale}
					onChange={(e) => setRationale(e.target.value)}
					maxLength={RATIONALE_MAX_LENGTH}
					placeholder={
						rationaleRequired
							? 'Explain why you intend to proceed despite the highlighted conflict(s).'
							: 'Optional notes about this availability check.'
					}
					aria-invalid={rationaleError != null}
					aria-describedby={rationaleError ? 'availability-rationale-error' : undefined}
					className="min-h-[96px]"
				/>
				{rationaleError ? (
					<p id="availability-rationale-error" className="text-sm text-red-200" role="alert">
						{rationaleError}
					</p>
				) : null}
			</section>

			<footer className="flex flex-col gap-2 border-t border-ops-border pt-4 sm:flex-row sm:items-center sm:justify-end">
				{formError ? (
					<p className="text-sm text-red-200" role="alert">
						{formError}
					</p>
				) : null}
				{pending ? <OpsLoadingRegion label="Saving availability check…" className="sm:max-w-xs" /> : null}
				<Button
					type="button"
					onClick={handleSubmit}
					disabled={submitDisabled}
					data-testid="availability-submit-button"
				>
					{pending ? 'Saving…' : 'Submit availability check'}
				</Button>
			</footer>
		</div>
	)
}

type RowStripCardProps = {
	title: string
	subtitle: string | null
	isSelected: boolean
	inConflict: boolean
	onSelect: () => void
	ariaLabel: string
	blocks: AvailabilityTripBlock[]
	window: AvailabilityWindow
	dataTestId: string
}

function RowStripCard({
	title,
	subtitle,
	isSelected,
	inConflict,
	onSelect,
	ariaLabel,
	blocks,
	window,
	dataTestId,
}: RowStripCardProps) {
	const liveBlocks = blocks.filter(blockIsLive)
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={isSelected}
			aria-label={ariaLabel}
			data-testid={dataTestId}
			data-conflict={inConflict ? 'true' : 'false'}
			data-selected={isSelected ? 'true' : 'false'}
			className={cn(
				'group flex w-full flex-col gap-2 rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
				isSelected
					? 'border-primary bg-primary/10'
					: inConflict
						? 'border-red-700/60 bg-red-950/40 hover:border-red-500'
						: 'border-ops-border bg-ops-surface/40 hover:border-primary/40',
			)}
		>
			<div className="flex items-baseline justify-between gap-3">
				<div className="min-w-0">
					<p className="truncate text-sm font-medium text-ops-foreground">{title}</p>
					{subtitle ? (
						<p className="truncate text-xs text-ops-muted">{subtitle}</p>
					) : null}
				</div>
				<div className="flex shrink-0 items-center gap-2 text-xs">
					{inConflict ? (
						<span className="rounded bg-red-900/70 px-2 py-0.5 font-medium text-red-100">
							Conflict
						</span>
					) : (
						<span className="rounded bg-emerald-900/40 px-2 py-0.5 text-emerald-200">
							Free
						</span>
					)}
					{isSelected ? (
						<span className="rounded bg-primary/20 px-2 py-0.5 font-medium text-primary">
							Selected
						</span>
					) : null}
				</div>
			</div>

			<div className="hidden md:block">
				<div className="relative h-7 rounded border border-ops-border/60 bg-ops-canvas/50">
					{liveBlocks.map((block) => {
						const pos = blockOffsetPercent(block, window)
						if (!pos) return null
						return (
							<span
								key={block.id}
								className={cn(
									'absolute top-0.5 bottom-0.5 rounded-sm border text-[10px] leading-none',
									inConflict
										? 'border-red-600 bg-red-700/80'
										: 'border-amber-500/70 bg-amber-600/60',
								)}
								style={{ left: `${pos.left}%`, width: `${Math.max(pos.width, 1.5)}%` }}
								title={`${formatTimeLabel(block.timeStart)} – ${formatTimeLabel(block.timeEnd)} (${block.source.replace('_', ' ')})`}
								aria-label={`${block.source.replace('_', ' ')} ${formatTimeLabel(block.timeStart)} to ${formatTimeLabel(block.timeEnd)}`}
							/>
						)
					})}
				</div>
			</div>

			<ul className="flex flex-wrap gap-1 md:hidden">
				{liveBlocks.length === 0 ? (
					<li className="text-xs text-ops-muted">No commitments in window.</li>
				) : (
					liveBlocks.map((block) => (
						<li
							key={block.id}
							className={cn(
								'rounded px-2 py-0.5 text-[11px]',
								inConflict
									? 'bg-red-900/70 text-red-100'
									: 'bg-amber-900/30 text-amber-100',
							)}
						>
							{formatTimeLabel(block.timeStart)}–{formatTimeLabel(block.timeEnd)}
						</li>
					))
				)}
			</ul>
		</button>
	)
}

type TimelineHeaderProps = {
	window: AvailabilityWindow
	ticks: Array<{ pct: number; label: string }>
}

function TimelineHeader({ window, ticks }: TimelineHeaderProps) {
	void window
	return (
		<div
			className="relative hidden h-5 rounded border border-ops-border/40 bg-ops-canvas/30 md:block"
			aria-hidden="true"
		>
			{ticks.map((tick) => (
				<span
					key={tick.pct}
					className="absolute top-0 h-full text-[10px] text-ops-muted"
					style={{ left: `${tick.pct}%`, transform: 'translateX(-50%)' }}
				>
					<span className="block translate-y-0.5 px-1 leading-none">{tick.label}</span>
				</span>
			))}
		</div>
	)
}
