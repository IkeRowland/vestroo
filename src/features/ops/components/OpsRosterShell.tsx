'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { OpsDetailRail } from '@/features/ops/components/OpsDetailRail'
import { OpsEmptyState } from '@/features/ops/components/OpsEmptyState'
import { OpsSplitView } from '@/features/ops/components/OpsSplitView'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OpsCalendarMonth } from '@/features/ops/components/OpsCalendarMonth'
import { OpsCalendarWeek } from '@/features/ops/components/OpsCalendarWeek'
import { opsRosterCopy } from '@/features/ops/copy/ops-roster-copy'
import { tripStatusDisplayLabel } from '@/features/ops/copy/ops-trips-copy'
import type { OpsCalendarWeekEvent } from '@/features/ops/lib/map-ops-calendar-trips'
import { getOpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import {
	addDaysLocal,
	formatYmdLocal,
	parseYmdToLocalDate,
	startOfWeekMondayLocal,
} from '@/lib/ops-calendar-url'
import {
	addMonthsYm,
	buildOpsRosterHref,
	formatMonthYmFromDate,
	type OpsRosterPageView,
} from '@/lib/ops-roster-url'
import { cn } from '@/lib/utils'

export type OpsRosterDriverRow = {
	id: string
	full_name: string
	status: string
	phone: string | null
}

export type RosterShiftRailPayload = {
	shiftId: string
	driverId: string
	driverName: string
	phone: string | null
	profileStatus: string
	workDate: string
	shift: string | null
	hours: number | null
	scheduleStatus: string | null
	vehicleLabel: string
}

export type RosterShiftListItem = {
	id: string
	work_date: string
	shift: string | null
	status: string | null
	total_working_hours: number | null
}

export type OpsRosterShellProps = {
	view: OpsRosterPageView
	weekStartYmd: string
	monthYm: string
	selectedDriverId: string | null
	selectedShiftId: string | null
	events: OpsCalendarWeekEvent[]
	drivers: OpsRosterDriverRow[]
	shiftDetailById: Record<string, RosterShiftRailPayload>
	shiftsByDriverId: Record<string, RosterShiftListItem[]>
}

export function OpsRosterShell({
	view,
	weekStartYmd,
	monthYm,
	selectedDriverId,
	selectedShiftId,
	events,
	drivers,
	shiftDetailById,
	shiftsByDriverId,
}: OpsRosterShellProps) {
	const router = useRouter()
	const listFocusReturnRef = React.useRef<HTMLElement | null>(null)

	const selectedShift = selectedShiftId ? shiftDetailById[selectedShiftId] ?? null : null
	const selectedDriver = selectedDriverId
		? drivers.find((d) => d.id === selectedDriverId) ?? null
		: null

	const detailOpen = Boolean(
		selectedShift || (selectedDriverId && selectedDriver && !selectedShiftId),
	)

	const handleCloseDetail = React.useCallback(() => {
		const returnId = selectedShiftId ?? selectedDriverId
		router.push(
			buildOpsRosterHref({
				view,
				weekStartYmd,
				monthYm,
				driverId: null,
				shiftId: null,
			}),
			{ scroll: false },
		)
		queueMicrotask(() => {
			const el =
				listFocusReturnRef.current ??
				(returnId
					? (document.querySelector(`[data-calendar-event="${returnId}"]`) as HTMLElement | null)
					: null)
			el?.focus()
		})
	}, [router, view, weekStartYmd, monthYm, selectedShiftId, selectedDriverId])

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
			const det = shiftDetailById[ev.id]
			const nextDriver = det?.driverId ?? selectedDriverId
			const toggled = selectedShiftId === ev.id ? null : ev.id
			router.push(
				buildOpsRosterHref({
					view,
					weekStartYmd,
					monthYm,
					driverId: nextDriver,
					shiftId: toggled,
				}),
				{ scroll: false },
			)
		},
		[router, view, weekStartYmd, monthYm, selectedShiftId, shiftDetailById, selectedDriverId],
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
					title={opsRosterCopy.emptyShiftsTitle}
					description={opsRosterCopy.emptyShiftsDescription}
				/>
			</div>
		) : view === 'week' ? (
			<OpsCalendarWeek
				weekStartYmd={weekStartYmd}
				events={events}
				selectedEventId={selectedShiftId}
				onActivateEvent={activateEvent}
			/>
		) : (
			<OpsCalendarMonth
				monthYm={monthYm}
				events={events}
				selectedEventId={selectedShiftId}
				onActivateEvent={activateEvent}
			/>
		)

	const main = (
		<div className="min-w-0 space-y-3">
			<div
				className="flex min-h-[44px] flex-wrap items-center justify-between gap-3"
				role="toolbar"
				aria-label={opsRosterCopy.viewToggleAria}
			>
				<div className="flex flex-wrap items-center gap-2">
					{view === 'week' ? (
						<>
							<Button type="button" size="sm" variant="outline" className="border-ops-border" asChild>
								<Link
									href={buildOpsRosterHref({
										view,
										weekStartYmd: prevWeek,
										monthYm,
										driverId: selectedDriverId,
										shiftId: selectedShiftId,
									})}
									scroll={false}
									aria-label={opsRosterCopy.prevWeekAria}
								>
									<span aria-hidden>←</span>
								</Link>
							</Button>
							<Button type="button" size="sm" variant="outline" className="border-ops-border" asChild>
								<Link
									href={buildOpsRosterHref({
										view,
										weekStartYmd: nextWeek,
										monthYm,
										driverId: selectedDriverId,
										shiftId: selectedShiftId,
									})}
									scroll={false}
									aria-label={opsRosterCopy.nextWeekAria}
								>
									<span aria-hidden>→</span>
								</Link>
							</Button>
							<Button type="button" size="sm" variant="secondary" className="border-ops-border" asChild>
								<Link
									href={buildOpsRosterHref({
										view,
										weekStartYmd: thisWeek,
										monthYm,
										driverId: selectedDriverId,
										shiftId: selectedShiftId,
									})}
									scroll={false}
								>
									{opsRosterCopy.thisWeek}
								</Link>
							</Button>
						</>
					) : (
						<>
							<Button type="button" size="sm" variant="outline" className="border-ops-border" asChild>
								<Link
									href={buildOpsRosterHref({
										view,
										weekStartYmd,
										monthYm: prevMonth,
										driverId: selectedDriverId,
										shiftId: selectedShiftId,
									})}
									scroll={false}
									aria-label={opsRosterCopy.prevMonthAria}
								>
									<span aria-hidden>←</span>
								</Link>
							</Button>
							<Button type="button" size="sm" variant="outline" className="border-ops-border" asChild>
								<Link
									href={buildOpsRosterHref({
										view,
										weekStartYmd,
										monthYm: nextMonth,
										driverId: selectedDriverId,
										shiftId: selectedShiftId,
									})}
									scroll={false}
									aria-label={opsRosterCopy.nextMonthAria}
								>
									<span aria-hidden>→</span>
								</Link>
							</Button>
							<Button type="button" size="sm" variant="secondary" className="border-ops-border" asChild>
								<Link
									href={buildOpsRosterHref({
										view,
										weekStartYmd,
										monthYm: thisMonthYm,
										driverId: selectedDriverId,
										shiftId: selectedShiftId,
									})}
									scroll={false}
								>
									{opsRosterCopy.thisMonth}
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
							href={buildOpsRosterHref({
								view: 'week',
								weekStartYmd,
								monthYm,
								driverId: selectedDriverId,
								shiftId: selectedShiftId,
							})}
							scroll={false}
						>
							{opsRosterCopy.viewWeek}
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
							href={buildOpsRosterHref({
								view: 'month',
								weekStartYmd,
								monthYm,
								driverId: selectedDriverId,
								shiftId: selectedShiftId,
							})}
							scroll={false}
						>
							{opsRosterCopy.viewMonth}
						</Link>
					</Button>
				</div>
			</div>
			{calendarBody}
		</div>
	)

	const driverShifts =
		selectedDriverId && !selectedShiftId ? shiftsByDriverId[selectedDriverId] ?? [] : []

	const detail =
		selectedShift ? (
			<OpsDetailRail title={opsRosterCopy.detailShiftTitle} onClose={handleCloseDetail}>
				<div className="space-y-4">
					<div className="flex flex-wrap items-center gap-2">
						<OpsStatusPill tone={getOpsStatusPillTone(selectedShift.scheduleStatus ?? '')}>
							{tripStatusDisplayLabel(selectedShift.scheduleStatus ?? '')}
						</OpsStatusPill>
						<span className="font-mono text-xs text-ops-muted">{selectedShift.shiftId}</span>
					</div>
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsRosterCopy.sectionProfile}
						</h3>
						<p className="mt-1 text-sm font-medium text-ops-foreground">{selectedShift.driverName}</p>
						<p className="mt-0.5 text-xs text-ops-muted">{selectedShift.phone ?? opsRosterCopy.noPhone}</p>
						<p className="mt-1 text-xs capitalize text-ops-muted">Status: {selectedShift.profileStatus}</p>
					</section>
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsRosterCopy.sectionScheduleRow}
						</h3>
						<dl className="mt-1 space-y-1 text-sm">
							<div className="flex justify-between gap-2">
								<dt className="text-ops-muted">Date</dt>
								<dd className="text-ops-foreground">{selectedShift.workDate}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-ops-muted">Shift</dt>
								<dd className="text-ops-foreground">{selectedShift.shift ?? '—'}</dd>
							</div>
							<div className="flex justify-between gap-2">
								<dt className="text-ops-muted">Hours</dt>
								<dd className="tabular-nums text-ops-foreground">{selectedShift.hours ?? '—'}</dd>
							</div>
						</dl>
					</section>
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsRosterCopy.sectionVehicle}
						</h3>
						<p className="mt-1 text-sm text-ops-foreground">{selectedShift.vehicleLabel}</p>
					</section>
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsRosterCopy.sectionNotes}
						</h3>
						<p className="mt-1 text-sm text-ops-muted">{opsRosterCopy.readOnlyShiftNote}</p>
					</section>
				</div>
			</OpsDetailRail>
		) : selectedDriver ? (
			<OpsDetailRail title={opsRosterCopy.detailDriverTitle} onClose={handleCloseDetail}>
				<div className="space-y-4">
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsRosterCopy.sectionProfile}
						</h3>
						<p className="mt-1 text-sm font-medium text-ops-foreground">{selectedDriver.full_name}</p>
						<p className="mt-0.5 text-xs text-ops-muted">{selectedDriver.phone ?? opsRosterCopy.noPhone}</p>
						<p className="mt-1 text-xs capitalize text-ops-muted">Status: {selectedDriver.status}</p>
					</section>
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsRosterCopy.shiftsForDriverHeading}
						</h3>
						{driverShifts.length === 0 ? (
							<p className="mt-2 text-sm text-ops-muted">{opsRosterCopy.selectShiftHint}</p>
						) : (
							<ul className="mt-2 space-y-2 text-sm">
								{driverShifts.map((s) => (
									<li key={s.id}>
										<button
											type="button"
											className="w-full rounded-md border border-ops-border px-2 py-2 text-left hover:bg-ops-accent-soft"
											onClick={() =>
												router.push(
													buildOpsRosterHref({
														view,
														weekStartYmd,
														monthYm,
														driverId: selectedDriver.id,
														shiftId: s.id,
													}),
													{ scroll: false },
												)
											}
										>
											<span className="font-medium">{String(s.work_date).slice(0, 10)}</span>
											{s.shift ? <span className="text-ops-muted"> · {s.shift}</span> : null}
										</button>
									</li>
								))}
							</ul>
						)}
					</section>
					<p className="text-sm text-ops-muted">{opsRosterCopy.readOnlyShiftNote}</p>
				</div>
			</OpsDetailRail>
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
