'use client'

import Image from 'next/image'
import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { TripOpsForms } from '@/features/ops/components/TripOpsForms'
import { OpsDetailRail } from '@/features/ops/components/OpsDetailRail'
import { OpsSplitView } from '@/features/ops/components/OpsSplitView'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OpsTableShell } from '@/features/ops/components/ops-primitives'
import { opsTripsCopy, tripStatusDisplayLabel } from '@/features/ops/copy/ops-trips-copy'
import { getOpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { buildOpsTripsHref } from '@/lib/ops-trips-url'
import { cn } from '@/lib/utils'

export type OpsTripsSplitBrowserTripRow = {
	id: string
	status: string
	time_start_estimate: string
	time_end_estimate: string
	vehicle_id: string
	chauffeur_id: string
	service_run_id: string | null
	ops_delay_note: string | null
	ops_revised_time_end_estimate: string | null
}

export type OpsTripsSplitBrowserVehicleOption = {
	id: string
	name: string
	primary_image_url: string | null
}

export type OpsTripsSplitBrowserProps = {
	trips: OpsTripsSplitBrowserTripRow[]
	vehicles: OpsTripsSplitBrowserVehicleOption[]
	driverNameByProfileId: Readonly<Record<string, string>>
	selectedTripId: string | null
}

function formatSchedule(startIso: string, endIso: string) {
	return opsTripsCopy.scheduleFromTo(
		new Date(startIso).toLocaleString(),
		new Date(endIso).toLocaleString(),
	)
}

export function OpsTripsSplitBrowser({
	trips,
	vehicles,
	driverNameByProfileId,
	selectedTripId,
}: OpsTripsSplitBrowserProps) {
	const router = useRouter()
	const listFocusReturnRef = React.useRef<HTMLTableRowElement | null>(null)
	const selectedTrip = React.useMemo(
		() => trips.find((t) => t.id === selectedTripId) ?? null,
		[trips, selectedTripId],
	)
	const detailOpen = Boolean(selectedTripId && selectedTrip)
	const vehicleById = React.useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles])
	const vehicleOptsForForms = React.useMemo(
		() => vehicles.map((v) => ({ id: v.id, name: v.name })),
		[vehicles],
	)

	const handleCloseDetail = () => {
		const returnId = selectedTripId
		router.push(buildOpsTripsHref({ id: null }), { scroll: false })
		queueMicrotask(() => {
			const el =
				listFocusReturnRef.current ??
				(returnId
					? (document.querySelector(
							`[data-ops-trip-row="${returnId}"]`,
						) as HTMLTableRowElement | null)
					: null)
			el?.focus()
		})
	}

	const openOrToggleTrip = (trip: OpsTripsSplitBrowserTripRow, rowEl: HTMLTableRowElement) => {
		listFocusReturnRef.current = rowEl
		const next = selectedTripId === trip.id ? null : trip.id
		router.push(buildOpsTripsHref({ id: next }), { scroll: false })
	}

	const tableBody = (
		<OpsTableShell caption={opsTripsCopy.tableCaption} tableClassName="text-sm">
			<thead>
				<tr className="border-b border-ops-border text-ops-table-header text-ops-muted">
					<th scope="col" className="py-2 pr-4 font-semibold">
						Trip
					</th>
					<th scope="col" className="py-2 pr-4 font-semibold">
						Status
					</th>
					<th scope="col" className="py-2 pr-4 font-semibold">
						Schedule
					</th>
					<th scope="col" className="py-2 pr-4 font-semibold">
						Vehicle / driver
					</th>
					<th scope="col" className="py-2 pr-4 font-semibold">
						Links
					</th>
				</tr>
			</thead>
			<tbody>
				{trips.map((t) => {
					const veh = vehicleById.get(t.vehicle_id)
					const vehicleLabel = veh?.name?.trim() || `${t.vehicle_id.slice(0, 8)}…`
					const driverRaw = driverNameByProfileId[t.chauffeur_id]?.trim()
					const driverLabel = driverRaw || `${t.chauffeur_id.slice(0, 8)}…`
					const selected = selectedTripId === t.id
					const statusKey = String(t.status ?? '')
					return (
						<tr
							key={t.id}
							data-ops-trip-row={t.id}
							data-testid="ops-trips-row"
							tabIndex={0}
							aria-label={opsTripsCopy.rowOpenDetailAria(t.id.slice(0, 8))}
							className={cn(
								'cursor-pointer border-b border-ops-border/80 outline-none transition-colors hover:bg-ops-accent-soft focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
								selected ? 'bg-ops-accent-soft' : null,
							)}
							onClick={(e) => {
								if ((e.target as HTMLElement).closest('button, a')) return
								openOrToggleTrip(t, e.currentTarget)
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									if ((e.target as HTMLElement).closest('button, a')) return
									e.preventDefault()
									openOrToggleTrip(t, e.currentTarget)
								}
							}}
						>
							<td className="py-3 pr-4 font-mono text-xs text-ops-muted">{t.id}</td>
							<td className="py-3 pr-4">
								<OpsStatusPill tone={getOpsStatusPillTone(statusKey)}>
									{tripStatusDisplayLabel(statusKey)}
								</OpsStatusPill>
							</td>
							<td className="max-w-[14rem] py-3 pr-4 text-ops-foreground/90">
								{formatSchedule(t.time_start_estimate, t.time_end_estimate)}
							</td>
							<td className="max-w-[12rem] py-3 pr-4 text-xs text-ops-muted">
								<div className="truncate text-ops-foreground/90">{vehicleLabel}</div>
								<div className="truncate">{driverLabel}</div>
								{t.service_run_id ? (
									<div className="truncate text-ops-dense">
										{opsTripsCopy.metaRun}: {opsTripsCopy.runValueShort(String(t.service_run_id).slice(0, 8))}
									</div>
								) : null}
								{t.ops_delay_note ? (
									<div className="mt-1 rounded-md bg-ops-warning/10 px-2 py-1 text-ops-warning">
										<span className="font-medium">{opsTripsCopy.delayLabel}:</span>{' '}
										{t.ops_delay_note}
										{t.ops_revised_time_end_estimate ? (
											<span className="mt-0.5 block text-[11px] text-ops-warning/90">
												{opsTripsCopy.revisedEndLabel}:{' '}
												{new Date(t.ops_revised_time_end_estimate).toLocaleString()}
											</span>
										) : null}
									</div>
								) : null}
							</td>
							<td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
								<Link
									href={`/ops/close-protection?tripId=${encodeURIComponent(t.id)}`}
									className="text-sm text-ops-info underline-offset-2 hover:underline"
								>
									{opsTripsCopy.closeProtectionLink}
								</Link>
							</td>
						</tr>
					)
				})}
			</tbody>
		</OpsTableShell>
	)

	const selectedVehicle = selectedTrip ? vehicleById.get(selectedTrip.vehicle_id) : null

	const detail =
		selectedTrip ? (
			<OpsDetailRail
				title={opsTripsCopy.detailRailTitle(selectedTrip.id)}
				onClose={handleCloseDetail}
				footer={
					<TripOpsForms
						tripId={selectedTrip.id}
						currentStatus={String(selectedTrip.status ?? 'booking')}
						vehicles={vehicleOptsForForms}
						currentVehicleId={selectedTrip.vehicle_id}
					/>
				}
			>
				<div className="space-y-5">
					<section aria-labelledby="ops-trip-assignment-summary">
						<h3
							id="ops-trip-assignment-summary"
							className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
						>
							{opsTripsCopy.assignmentSummaryHeading}
						</h3>
						<dl className="mt-2 space-y-1 text-sm">
							<div className="flex justify-between gap-2">
								<dt className="text-ops-muted">Trip ID</dt>
								<dd className="font-mono text-right text-xs text-ops-foreground">{selectedTrip.id}</dd>
							</div>
							<div className="flex flex-wrap items-center justify-between gap-2">
								<dt className="text-ops-muted">Status</dt>
								<dd>
									<OpsStatusPill tone={getOpsStatusPillTone(String(selectedTrip.status ?? ''))}>
										{tripStatusDisplayLabel(String(selectedTrip.status ?? ''))}
									</OpsStatusPill>
								</dd>
							</div>
							<div>
								<dt className="text-ops-muted">Schedule</dt>
								<dd className="mt-0.5 text-ops-foreground">
									{formatSchedule(selectedTrip.time_start_estimate, selectedTrip.time_end_estimate)}
								</dd>
							</div>
							{selectedTrip.service_run_id ? (
								<div className="flex justify-between gap-2">
									<dt className="text-ops-muted">{opsTripsCopy.metaRun}</dt>
									<dd className="font-mono text-xs text-ops-foreground">{selectedTrip.service_run_id}</dd>
								</div>
							) : null}
						</dl>
						{selectedTrip.ops_delay_note ? (
							<div
								className="mt-3 rounded-md border border-ops-warning/30 bg-ops-warning/10 p-3 text-sm text-ops-warning"
								role="status"
							>
								<p className="font-medium">{opsTripsCopy.delayLabel}</p>
								<p className="mt-1">{selectedTrip.ops_delay_note}</p>
								{selectedTrip.ops_revised_time_end_estimate ? (
									<p className="mt-2 text-xs text-ops-warning/90">
										{opsTripsCopy.revisedEndLabel}:{' '}
										{new Date(selectedTrip.ops_revised_time_end_estimate).toLocaleString()}
									</p>
								) : null}
							</div>
						) : null}
						<p className="mt-3 text-xs">
							<Link
								href={`/ops/close-protection?tripId=${encodeURIComponent(selectedTrip.id)}`}
								className="text-ops-info underline-offset-2 hover:underline"
							>
								{opsTripsCopy.closeProtectionLink}
							</Link>
						</p>
					</section>

					<section aria-labelledby="ops-trip-vehicle-visual">
						<h3
							id="ops-trip-vehicle-visual"
							className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
						>
							{opsTripsCopy.vehicleHeading}
						</h3>
						<div className="mt-2 flex gap-3">
							<div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-md border border-ops-border bg-ops-surface-active">
								{selectedVehicle?.primary_image_url?.trim() ? (
									<Image
										src={selectedVehicle.primary_image_url.trim()}
										alt=""
										width={112}
										height={80}
										className="h-full w-full object-cover"
										sizes="112px"
									/>
								) : (
									<div
										className="flex h-full w-full items-center justify-center text-ops-muted"
										aria-hidden
									>
										<MapPin className="h-8 w-8 opacity-40" strokeWidth={1.25} />
									</div>
								)}
							</div>
							<div className="min-w-0 text-sm">
								<p className="font-medium text-ops-foreground">
									{selectedVehicle?.name?.trim() || `${selectedTrip.vehicle_id.slice(0, 8)}…`}
								</p>
								<p className="mt-1 text-xs text-ops-muted">
									{opsTripsCopy.metaDriver}:{' '}
									<span className="text-ops-foreground/90">
										{driverNameByProfileId[selectedTrip.chauffeur_id]?.trim() ||
											`${selectedTrip.chauffeur_id.slice(0, 8)}…`}
									</span>
								</p>
							</div>
						</div>
					</section>

					<section aria-labelledby="ops-trip-map-heading">
						<h3
							id="ops-trip-map-heading"
							className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
						>
							{opsTripsCopy.mapSectionHeading}
						</h3>
						<div
							className="mt-2 aspect-[16/10] w-full shrink-0 overflow-hidden rounded-md border border-ops-border bg-ops-surface-active"
							role="img"
							aria-label={opsTripsCopy.mapPlaceholderAriaLabel}
						>
							<div className="flex h-full min-h-[7.5rem] flex-col items-center justify-center gap-2 px-4 text-center">
								<MapPin className="h-10 w-10 text-ops-muted opacity-50" strokeWidth={1} aria-hidden />
								<p className="text-xs text-ops-muted">{opsTripsCopy.mapPlaceholderHint}</p>
							</div>
						</div>
					</section>

					<section aria-labelledby="ops-trip-comms-heading">
						<h3
							id="ops-trip-comms-heading"
							className="text-xs font-semibold uppercase tracking-wide text-ops-muted"
						>
							{opsTripsCopy.commsHeading}
						</h3>
						<p className="mt-2 min-h-[4rem] rounded-md border border-dashed border-ops-border/80 bg-ops-surface-active/40 px-3 py-3 text-sm text-ops-muted">
							{opsTripsCopy.commsStubBody}
						</p>
					</section>
				</div>
			</OpsDetailRail>
		) : null

	return (
		<OpsSplitView
			detailVisible={detailOpen}
			onCloseDetail={handleCloseDetail}
			listFocusReturnRef={listFocusReturnRef}
			list={tableBody}
			detail={detail}
		/>
	)
}
