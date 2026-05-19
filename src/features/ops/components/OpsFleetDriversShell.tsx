'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { OpsDriverAvatarThumb } from '@/features/ops/components/OpsDriverAvatarThumb'
import { OpsCardGrid } from '@/features/ops/components/OpsCardGrid'
import { OpsDetailRail } from '@/features/ops/components/OpsDetailRail'
import { OpsEmptyState } from '@/features/ops/components/OpsEmptyState'
import { OpsFleetDriverCard } from '@/features/ops/components/OpsFleetDriverCard'
import { OpsFleetDriverDetailRail } from '@/features/ops/components/OpsFleetDriverDetailRail'
import { OpsSplitView } from '@/features/ops/components/OpsSplitView'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OpsTableShell } from '@/features/ops/components/ops-primitives'
import { OpsCalendarMonth } from '@/features/ops/components/OpsCalendarMonth'
import { OpsCalendarWeek } from '@/features/ops/components/OpsCalendarWeek'
import { opsCalendarCopy } from '@/features/ops/copy/ops-calendar-copy'
import {
	opsFleetDriversCopy,
	fleetDriverShiftStatusLabel,
	fleetDriverTripStatusLabel,
} from '@/features/ops/copy/ops-fleet-drivers-copy'
import { tripStatusDisplayLabel } from '@/features/ops/copy/ops-trips-copy'
import type { OpsCalendarTripRailPayload, OpsCalendarWeekEvent } from '@/features/ops/lib/map-ops-calendar-trips'
import type {
	FleetDriverShiftStatus,
	FleetDriverTripStatus,
} from '@/features/ops/lib/ops-fleet-drivers-availability'
import {
	fleetDriverShiftStatusPillKey,
	fleetDriverTripStatusPillKey,
} from '@/features/ops/lib/ops-fleet-drivers-availability'
import { getOpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { opsFulfilQueueHref } from '@/lib/ops-fulfil-nav'
import { buildOpsTripsHref } from '@/lib/ops-trips-url'
import {
	addDaysLocal,
	formatYmdLocal,
	parseYmdToLocalDate,
	startOfWeekMondayLocal,
} from '@/lib/ops-calendar-url'
import {
	addMonthsYm,
	buildOpsFleetDriversHref,
	formatMonthYmFromDate,
	type OpsFleetDriversLayout,
	type OpsFleetDriversPageView,
} from '@/lib/ops-fleet-drivers-url'
import type { OpsFleetDriverRow } from '@/features/ops/ops-fleet-drivers-types'
import { cn } from '@/lib/utils'

export type { OpsFleetDriverRow } from '@/features/ops/ops-fleet-drivers-types'

export type OpsFleetDriversShellProps = {
	view: OpsFleetDriversPageView
	driversLayout: OpsFleetDriversLayout
	weekStartYmd: string
	monthYm: string
	selectedDriverId: string | null
	selectedTripId: string | null
	events: OpsCalendarWeekEvent[]
	drivers: OpsFleetDriverRow[]
	railByTripId: Record<string, OpsCalendarTripRailPayload>
	/** Active fleet vehicles for default-vehicle picker in driver detail. */
	fleetVehicleOptions: { id: string; name: string }[]
	/** Resolved display name for each driver’s default vehicle (when set). */
	defaultVehicleDisplayByDriverId: Record<string, string>
	/** Non-terminal trips per driver (same rule as fleet vehicles tab, capped query). */
	activeTripCountByDriverId: Record<string, number>
	driverTripStatusById: Record<string, FleetDriverTripStatus>
	driverShiftStatusById: Record<string, FleetDriverShiftStatus>
	/** Fleet drivers URL: **`?driverEdit=1`** with selected driver. */
	fleetDriversDriverEditOpen: boolean
	/** Fleet drivers URL: **`?driverArchive=1`** with selected driver. */
	fleetDriversDriverArchiveOpen: boolean
}

export function OpsFleetDriversShell({
	view,
	driversLayout,
	weekStartYmd,
	monthYm,
	selectedDriverId,
	selectedTripId,
	events,
	drivers,
	railByTripId,
	fleetVehicleOptions,
	defaultVehicleDisplayByDriverId,
	activeTripCountByDriverId,
	driverTripStatusById,
	driverShiftStatusById,
	fleetDriversDriverEditOpen,
	fleetDriversDriverArchiveOpen,
}: OpsFleetDriversShellProps) {
	const router = useRouter()
	const listFocusReturnRef = React.useRef<HTMLElement | null>(null)

	const driversPageHref = React.useCallback(
		(
			overrides: Partial<{
				view: OpsFleetDriversPageView
				weekStartYmd: string
				monthYm: string
				driverId: string | null
				tripId: string | null
				driversView: OpsFleetDriversLayout
				driverEdit: boolean
				driverArchive: boolean
			}> = {},
		) => {
			const driverId =
				overrides.driverId !== undefined ? overrides.driverId : selectedDriverId
			const tripIdResolved =
				overrides.tripId !== undefined ? overrides.tripId : selectedTripId
			const driverEdit =
				overrides.driverEdit !== undefined
					? overrides.driverEdit
					: Boolean(fleetDriversDriverEditOpen && driverId)
			const driverArchive =
				overrides.driverArchive !== undefined
					? overrides.driverArchive
					: Boolean(fleetDriversDriverArchiveOpen && driverId)
			return buildOpsFleetDriversHref({
				view: overrides.view ?? view,
				weekStartYmd: overrides.weekStartYmd ?? weekStartYmd,
				monthYm: overrides.monthYm ?? monthYm,
				driverId,
				tripId: tripIdResolved,
				driversView: overrides.driversView ?? driversLayout,
				driverEdit: Boolean(driverId && driverEdit),
				driverArchive: Boolean(driverId && driverArchive),
			})
		},
		[
			view,
			weekStartYmd,
			monthYm,
			selectedDriverId,
			selectedTripId,
			driversLayout,
			fleetDriversDriverEditOpen,
			fleetDriversDriverArchiveOpen,
		],
	)

	const clearFleetDriversIntentQuery = React.useCallback(() => {
		router.push(driversPageHref({ driverEdit: false, driverArchive: false }), { scroll: false })
	}, [router, driversPageHref])

	const selectedTrip = selectedTripId ? railByTripId[selectedTripId] ?? null : null
	const selectedDriver = selectedDriverId
		? drivers.find((d) => d.id === selectedDriverId) ?? null
		: null

	const detailOpen = Boolean(
		selectedTrip || (selectedDriverId && selectedDriver && !selectedTripId),
	)

	const handleCloseDetail = React.useCallback(() => {
		const returnTargetId = selectedTripId ?? selectedDriverId
		const preferCalendarEvent = Boolean(selectedTripId)
		router.push(
			driversPageHref({ driverId: null, tripId: null, driverEdit: false, driverArchive: false }),
			{ scroll: false },
		)
		queueMicrotask(() => {
			let fallback: HTMLElement | null = null
			if (returnTargetId) {
				if (preferCalendarEvent) {
					fallback =
						(document.querySelector(
							`[data-calendar-event="${returnTargetId}"]`,
						) as HTMLElement | null) ??
						(document.querySelector(
							`[data-ops-fleet-drivers-row="${returnTargetId}"]`,
						) as HTMLElement | null)
				} else {
					fallback =
						(document.querySelector(
							`[data-ops-fleet-drivers-row="${returnTargetId}"]`,
						) as HTMLElement | null) ??
						(document.querySelector(
							`[data-calendar-event="${returnTargetId}"]`,
						) as HTMLElement | null)
				}
			}
			const el = listFocusReturnRef.current ?? fallback
			el?.focus()
		})
	}, [router, driversPageHref, selectedTripId, selectedDriverId])

	React.useEffect(() => {
		if (!detailOpen) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				handleCloseDetail()
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [detailOpen, handleCloseDetail])

	const activateEvent = React.useCallback(
		(ev: OpsCalendarWeekEvent) => {
			const el = document.querySelector(`[data-calendar-event="${ev.id}"]`) as HTMLElement | null
			listFocusReturnRef.current = el
			if (ev.href) {
				router.push(ev.href)
				return
			}
			const det = railByTripId[ev.id]
			const nextDriver =
				det?.chauffeurProfileId?.trim() ? det.chauffeurProfileId : selectedDriverId
			const toggled = selectedTripId === ev.id ? null : ev.id
			router.push(
				driversPageHref({
					driverId: nextDriver,
					tripId: toggled,
					driverEdit: false,
					driverArchive: false,
				}),
				{ scroll: false },
			)
		},
		[router, driversPageHref, selectedTripId, railByTripId, selectedDriverId],
	)

	const openOrToggleDriver = React.useCallback(
		(d: OpsFleetDriverRow, rowEl: HTMLTableRowElement) => {
			listFocusReturnRef.current = rowEl
			if (selectedTripId) {
				router.push(
					driversPageHref({ driverId: d.id, tripId: null, driverEdit: false, driverArchive: false }),
					{ scroll: false },
				)
				return
			}
			if (selectedDriverId === d.id) {
				router.push(
					driversPageHref({ driverId: null, tripId: null, driverEdit: false, driverArchive: false }),
					{ scroll: false },
				)
				return
			}
			router.push(
				driversPageHref({ driverId: d.id, tripId: null, driverEdit: false, driverArchive: false }),
				{ scroll: false },
			)
		},
		[router, driversPageHref, selectedDriverId, selectedTripId],
	)

	const openDriverFromCard = React.useCallback(
		(d: OpsFleetDriverRow) => {
			router.push(
				driversPageHref({ driverId: d.id, tripId: null, driverEdit: false, driverArchive: false }),
				{ scroll: false },
			)
		},
		[router, driversPageHref],
	)

	const prevWeek = formatYmdLocal(addDaysLocal(parseYmdToLocalDate(weekStartYmd), -7))
	const nextWeek = formatYmdLocal(addDaysLocal(parseYmdToLocalDate(weekStartYmd), 7))
	const thisWeek = formatYmdLocal(startOfWeekMondayLocal(new Date()))
	const prevMonth = addMonthsYm(monthYm, -1)
	const nextMonth = addMonthsYm(monthYm, 1)
	const thisMonthYm = formatMonthYmFromDate(new Date())

	const calendarBody =
		events.length === 0 ? (
			<div className="flex min-h-[720px] items-center justify-center rounded-ops-card border border-ops-border bg-ops-surface p-6">
				<OpsEmptyState
					title={opsFleetDriversCopy.emptyTripsTitle}
					description={opsFleetDriversCopy.emptyTripsDescription}
				/>
			</div>
		) : view === 'week' ? (
			<OpsCalendarWeek
				weekStartYmd={weekStartYmd}
				events={events}
				selectedEventId={selectedTripId}
				onActivateEvent={activateEvent}
			/>
		) : (
			<OpsCalendarMonth
				monthYm={monthYm}
				events={events}
				selectedEventId={selectedTripId}
				onActivateEvent={activateEvent}
			/>
		)

	const main = (
		<div className="min-w-0 space-y-3">
			<p className="text-sm leading-relaxed text-ops-muted">{opsFleetDriversCopy.driversCalendarHint}</p>

			<section className="space-y-3" aria-labelledby="ops-fleet-drivers-section-heading">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 id="ops-fleet-drivers-section-heading" className="text-sm font-semibold text-ops-foreground">
						{opsFleetDriversCopy.driversSectionHeading}
					</h2>
					<div
						className="inline-flex rounded-md border border-ops-border p-0.5"
						role="group"
						aria-label={opsFleetDriversCopy.driversViewToggleAria}
					>
						<Button
							type="button"
							size="sm"
							variant={driversLayout === 'list' ? 'default' : 'ghost'}
							className={cn(driversLayout === 'list' ? 'shadow-sm' : 'text-ops-muted')}
							asChild
						>
							<Link href={driversPageHref({ driversView: 'list' })} scroll={false}>
								{opsFleetDriversCopy.viewList}
							</Link>
						</Button>
						<Button
							type="button"
							size="sm"
							variant={driversLayout === 'grid' ? 'default' : 'ghost'}
							className={cn(driversLayout === 'grid' ? 'shadow-sm' : 'text-ops-muted')}
							asChild
						>
							<Link href={driversPageHref({ driversView: 'grid' })} scroll={false}>
								{opsFleetDriversCopy.viewGrid}
							</Link>
						</Button>
					</div>
				</div>
				{driversLayout === 'list' ? (
					<OpsTableShell caption={opsFleetDriversCopy.driversTableCaption} tableClassName="text-sm">
						<thead>
							<tr className="border-b border-ops-border text-ops-table-header text-ops-muted">
								<th scope="col" className="py-2 pr-4 font-semibold">
									Driver
								</th>
								<th scope="col" className="py-2 pr-4 font-semibold">
									Phone
								</th>
								<th scope="col" className="py-2 pr-4 font-semibold">
									{opsFleetDriversCopy.activeTripsColumn}
								</th>
								<th scope="col" className="py-2 pr-4 font-semibold">
									{opsFleetDriversCopy.columnTripStatus}
								</th>
								<th scope="col" className="py-2 pr-4 font-semibold">
									{opsFleetDriversCopy.columnShiftStatus}
								</th>
								<th scope="col" className="py-2 pr-2 text-right font-semibold">
									{opsFleetDriversCopy.columnActions}
								</th>
							</tr>
						</thead>
						<tbody>
							{drivers.length === 0 ? (
								<tr>
									<td colSpan={6} className="py-6 text-center text-sm text-ops-muted">
										No driver profiles.
									</td>
								</tr>
							) : (
								drivers.map((d) => {
									const displayName = d.full_name?.trim() || 'Unnamed'
									const rowSelected = selectedDriverId === d.id && !selectedTripId
									const activeTrips = activeTripCountByDriverId[d.id] ?? 0
									const tripSt = driverTripStatusById[d.id] ?? 'idle'
									const shiftSt = driverShiftStatusById[d.id] ?? 'inactive'
									const tripPillKey = fleetDriverTripStatusPillKey(tripSt)
									const shiftPillKey = fleetDriverShiftStatusPillKey(shiftSt)
									const shiftOff = d.status === 'inactive'
									return (
										<tr
											key={d.id}
											data-ops-fleet-drivers-row={d.id}
											tabIndex={0}
											aria-label={opsFleetDriversCopy.driverRowOpenDetailAria(displayName)}
											className={cn(
												'cursor-pointer border-b border-ops-border/80 outline-none transition-colors hover:bg-ops-accent-soft focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
												rowSelected ? 'bg-ops-accent-soft' : null,
											)}
											onClick={(e) => {
												if ((e.target as HTMLElement).closest('button, a')) return
												openOrToggleDriver(d, e.currentTarget)
											}}
											onKeyDown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													if ((e.target as HTMLElement).closest('button, a')) return
													e.preventDefault()
													openOrToggleDriver(d, e.currentTarget)
												}
											}}
										>
											<td className="py-3 pr-4 text-ops-foreground">
												<div className="flex items-center gap-3">
													<OpsDriverAvatarThumb
														imageUrl={d.avatar_url}
														objectPosition={d.avatar_object_position}
														displayName={displayName}
														sizeClassName="h-10 w-10"
														imageSizes="40px"
													/>
													<div className="min-w-0 font-medium">{displayName}</div>
												</div>
											</td>
											<td className="py-3 pr-4 text-sm text-ops-muted">
												{d.phone ?? opsFleetDriversCopy.noPhone}
											</td>
											<td className="py-3 pr-4 tabular-nums text-sm text-ops-muted">{activeTrips}</td>
											<td className="py-3 pr-4">
												<OpsStatusPill tone={getOpsStatusPillTone(tripPillKey)}>
													{fleetDriverTripStatusLabel(tripSt)}
												</OpsStatusPill>
											</td>
											<td className="py-3 pr-4">
												<OpsStatusPill tone={getOpsStatusPillTone(shiftPillKey)}>
													{fleetDriverShiftStatusLabel(shiftSt)}
												</OpsStatusPill>
											</td>
											<td className="py-3 pr-2 text-right" onClick={(e) => e.stopPropagation()}>
												<div className="flex flex-wrap justify-end gap-2">
													<Button
														type="button"
														size="sm"
														variant="outline"
														className="border-ops-border"
														onClick={(e) => {
															const tr = (e.currentTarget as HTMLElement).closest('tr')
															if (tr) listFocusReturnRef.current = tr
															router.push(
																driversPageHref({
																	driverId: d.id,
																	tripId: null,
																	driverEdit: true,
																	driverArchive: false,
																}),
																{ scroll: false },
															)
														}}
													>
														{opsFleetDriversCopy.editDriver}
													</Button>
													<Button
														type="button"
														size="sm"
														variant="outline"
														className="border-red-500/50 text-red-600 hover:bg-red-500/10"
														disabled={shiftOff}
														onClick={(e) => {
															const tr = (e.currentTarget as HTMLElement).closest('tr')
															if (tr) listFocusReturnRef.current = tr
															router.push(
																driversPageHref({
																	driverId: d.id,
																	tripId: null,
																	driverEdit: false,
																	driverArchive: true,
																}),
																{ scroll: false },
															)
														}}
													>
														{opsFleetDriversCopy.archiveDriver}
													</Button>
													{shiftOff ? (
														<Button
															type="button"
															size="sm"
															variant="secondary"
															className="border-ops-border"
															disabled
														>
															{opsFleetDriversCopy.assignDriverToTrip}
														</Button>
													) : (
														<Button
															type="button"
															size="sm"
															variant="secondary"
															className="border-ops-border"
															asChild
														>
															<Link
																href={opsFulfilQueueHref('paid', {
																	focusDriverProfileId: d.id,
																})}
																scroll={false}
																onClick={(e) => {
																	const tr = (e.currentTarget as HTMLElement).closest('tr')
																	if (tr) listFocusReturnRef.current = tr
																}}
															>
																{opsFleetDriversCopy.assignDriverToTrip}
															</Link>
														</Button>
													)}
												</div>
											</td>
										</tr>
									)
								})
							)}
						</tbody>
					</OpsTableShell>
				) : drivers.length === 0 ? (
					<p className="py-6 text-center text-sm text-ops-muted">No driver profiles.</p>
				) : (
					<div role="region" aria-label={opsFleetDriversCopy.driversGridRegionAria}>
						<OpsCardGrid>
							{drivers.map((d) => (
								<OpsFleetDriverCard
									key={d.id}
									driver={d}
									activeTripCount={activeTripCountByDriverId[d.id] ?? 0}
									tripStatus={driverTripStatusById[d.id] ?? 'idle'}
									shiftStatus={driverShiftStatusById[d.id] ?? 'inactive'}
									selected={selectedDriverId === d.id && !selectedTripId}
									onOpen={() => openDriverFromCard(d)}
									onEdit={() =>
										router.push(
											driversPageHref({
												driverId: d.id,
												tripId: null,
												driverEdit: true,
												driverArchive: false,
											}),
											{ scroll: false },
										)
									}
								/>
							))}
						</OpsCardGrid>
					</div>
				)}
			</section>

			<div
				className="flex min-h-[44px] flex-wrap items-center justify-between gap-3"
				role="toolbar"
				aria-label={opsFleetDriversCopy.viewToggleAria}
			>
				<div className="flex flex-wrap items-center gap-2">
					{view === 'week' ? (
						<>
							<Button type="button" size="sm" variant="outline" className="border-ops-border" asChild>
								<Link
									href={driversPageHref({
										view,
										weekStartYmd: prevWeek,
										monthYm,
										driverId: selectedDriverId,
										tripId: selectedTripId,
									})}
									scroll={false}
									aria-label={opsFleetDriversCopy.prevWeekAria}
								>
									<span aria-hidden>←</span>
								</Link>
							</Button>
							<Button type="button" size="sm" variant="outline" className="border-ops-border" asChild>
								<Link
									href={driversPageHref({
										view,
										weekStartYmd: nextWeek,
										monthYm,
										driverId: selectedDriverId,
										tripId: selectedTripId,
									})}
									scroll={false}
									aria-label={opsFleetDriversCopy.nextWeekAria}
								>
									<span aria-hidden>→</span>
								</Link>
							</Button>
							<Button type="button" size="sm" variant="secondary" className="border-ops-border" asChild>
								<Link
									href={driversPageHref({
										view,
										weekStartYmd: thisWeek,
										monthYm,
										driverId: selectedDriverId,
										tripId: selectedTripId,
									})}
									scroll={false}
								>
									{opsFleetDriversCopy.thisWeek}
								</Link>
							</Button>
						</>
					) : (
						<>
							<Button type="button" size="sm" variant="outline" className="border-ops-border" asChild>
								<Link
									href={driversPageHref({
										view,
										weekStartYmd,
										monthYm: prevMonth,
										driverId: selectedDriverId,
										tripId: selectedTripId,
									})}
									scroll={false}
									aria-label={opsFleetDriversCopy.prevMonthAria}
								>
									<span aria-hidden>←</span>
								</Link>
							</Button>
							<Button type="button" size="sm" variant="outline" className="border-ops-border" asChild>
								<Link
									href={driversPageHref({
										view,
										weekStartYmd,
										monthYm: nextMonth,
										driverId: selectedDriverId,
										tripId: selectedTripId,
									})}
									scroll={false}
									aria-label={opsFleetDriversCopy.nextMonthAria}
								>
									<span aria-hidden>→</span>
								</Link>
							</Button>
							<Button type="button" size="sm" variant="secondary" className="border-ops-border" asChild>
								<Link
									href={driversPageHref({
										view,
										weekStartYmd,
										monthYm: thisMonthYm,
										driverId: selectedDriverId,
										tripId: selectedTripId,
									})}
									scroll={false}
								>
									{opsFleetDriversCopy.thisMonth}
								</Link>
							</Button>
						</>
					)}
				</div>
				<div className="inline-flex rounded-md border border-ops-border p-0.5">
					<Button
						type="button"
						size="sm"
						variant={view === 'week' ? 'default' : 'ghost'}
						className={cn(view === 'week' ? 'shadow-sm' : 'text-ops-muted')}
						asChild
					>
						<Link
							href={driversPageHref({
								view: 'week',
								weekStartYmd,
								monthYm,
								driverId: selectedDriverId,
								tripId: selectedTripId,
							})}
							scroll={false}
						>
							{opsFleetDriversCopy.viewWeek}
						</Link>
					</Button>
					<Button
						type="button"
						size="sm"
						variant={view === 'month' ? 'default' : 'ghost'}
						className={cn(view === 'month' ? 'shadow-sm' : 'text-ops-muted')}
						asChild
					>
						<Link
							href={driversPageHref({
								view: 'month',
								weekStartYmd,
								monthYm,
								driverId: selectedDriverId,
								tripId: selectedTripId,
							})}
							scroll={false}
						>
							{opsFleetDriversCopy.viewMonth}
						</Link>
					</Button>
				</div>
			</div>
			{calendarBody}
		</div>
	)

	const detail =
		selectedTrip ? (
			<OpsDetailRail title={opsCalendarCopy.detailRailTitle} onClose={handleCloseDetail}>
				<div className="space-y-4">
					<div className="flex flex-wrap items-center gap-2">
						<OpsStatusPill tone={getOpsStatusPillTone(selectedTrip.status)}>
							{tripStatusDisplayLabel(selectedTrip.status)}
						</OpsStatusPill>
						<span className="font-mono text-xs text-ops-muted">{selectedTrip.tripId}</span>
					</div>
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsCalendarCopy.sectionSchedule}
						</h3>
						<p className="mt-1 text-sm text-ops-foreground">{selectedTrip.scheduleLabel}</p>
					</section>
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsCalendarCopy.sectionVehicle}
						</h3>
						<p className="mt-1 text-sm text-ops-foreground">{selectedTrip.vehicleName}</p>
					</section>
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsCalendarCopy.sectionClient}
						</h3>
						<p className="mt-1 text-sm text-ops-foreground">{selectedTrip.clientLabel}</p>
					</section>
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsCalendarCopy.sectionDriver}
						</h3>
						<p className="mt-1 text-sm text-ops-foreground">{selectedTrip.driverName}</p>
					</section>
					{selectedTrip.serviceType ? (
						<section>
							<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
								{opsCalendarCopy.serviceTypeLabel}
							</h3>
							<p className="mt-1 text-sm text-ops-foreground">{selectedTrip.serviceType}</p>
						</section>
					) : null}
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsCalendarCopy.sectionNotes}
						</h3>
						<p className="mt-1 text-sm text-ops-muted">
							{selectedTrip.notes ?? opsCalendarCopy.noNotes}
						</p>
					</section>
					<p>
						<Link
							href={buildOpsTripsHref({ id: selectedTrip.tripId })}
							className="text-sm text-ops-info underline-offset-2 hover:underline"
						>
							{opsCalendarCopy.openTripsPage}
						</Link>
					</p>
				</div>
			</OpsDetailRail>
		) : selectedDriver ? (
			<OpsFleetDriverDetailRail
				driver={selectedDriver}
				tripStatus={driverTripStatusById[selectedDriver.id] ?? 'idle'}
				shiftStatus={driverShiftStatusById[selectedDriver.id] ?? 'inactive'}
				defaultVehicleDisplay={defaultVehicleDisplayByDriverId[selectedDriver.id] ?? null}
				vehicleOptions={fleetVehicleOptions}
				onClose={handleCloseDetail}
				openEditInitially={fleetDriversDriverEditOpen}
				openArchiveInitially={fleetDriversDriverArchiveOpen}
				onClearFleetDriversIntentParams={clearFleetDriversIntentQuery}
			/>
		) : null

	return (
		<OpsSplitView
			detailVisible={detailOpen}
			onCloseDetail={handleCloseDetail}
			listFocusReturnRef={listFocusReturnRef}
			list={main}
			detail={detail}
		/>
	)
}
