'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { OpsDetailRail } from '@/features/ops/components/OpsDetailRail'
import { OpsEmptyState } from '@/features/ops/components/OpsEmptyState'
import { OpsSplitView } from '@/features/ops/components/OpsSplitView'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OpsCalendarWeek } from '@/features/ops/components/OpsCalendarWeek'
import { opsCalendarCopy } from '@/features/ops/copy/ops-calendar-copy'
import { tripStatusDisplayLabel } from '@/features/ops/copy/ops-trips-copy'
import type {
	OpsCalendarTripRailPayload,
	OpsCalendarWeekEvent,
} from '@/features/ops/lib/map-ops-calendar-trips'
import { getOpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import {
	addDaysLocal,
	buildOpsCalendarHref,
	formatYmdLocal,
	parseYmdToLocalDate,
	startOfWeekMondayLocal,
	type OpsCalendarPageView,
} from '@/lib/ops-calendar-url'
import { buildOpsTripsHref } from '@/lib/ops-trips-url'
import { cn } from '@/lib/utils'

export type OpsCalendarShellProps = {
	weekStartYmd: string
	view: OpsCalendarPageView
	selectedEventId: string | null
	events: OpsCalendarWeekEvent[]
	railByTripId: Record<string, OpsCalendarTripRailPayload>
}

export function OpsCalendarShell({
	weekStartYmd,
	view,
	selectedEventId,
	events,
	railByTripId,
}: OpsCalendarShellProps) {
	const router = useRouter()
	const listFocusReturnRef = React.useRef<HTMLElement | null>(null)
	const selectedPayload = selectedEventId ? railByTripId[selectedEventId] ?? null : null
	const detailOpen = Boolean(selectedEventId && selectedPayload)

	const handleCloseDetail = React.useCallback(() => {
		const returnId = selectedEventId
		router.push(buildOpsCalendarHref({ weekStartYmd, eventId: null, view }), { scroll: false })
		queueMicrotask(() => {
			const el =
				listFocusReturnRef.current ??
				(returnId
					? (document.querySelector(`[data-calendar-event="${returnId}"]`) as HTMLElement | null)
					: null)
			el?.focus()
		})
	}, [router, weekStartYmd, view, selectedEventId])

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
			router.push(
				buildOpsCalendarHref({
					weekStartYmd,
					eventId: selectedEventId === ev.id ? null : ev.id,
					view,
				}),
				{ scroll: false },
			)
		},
		[router, weekStartYmd, view, selectedEventId],
	)

	const prevWeek = formatYmdLocal(addDaysLocal(parseYmdToLocalDate(weekStartYmd), -7))
	const nextWeek = formatYmdLocal(addDaysLocal(parseYmdToLocalDate(weekStartYmd), 7))
	const thisWeek = formatYmdLocal(startOfWeekMondayLocal(new Date()))

	const hrefForWeek = (ymd: string) =>
		buildOpsCalendarHref({ weekStartYmd: ymd, eventId: selectedEventId, view })

	const listBody =
		events.length === 0 ? (
			<div className="flex min-h-[720px] items-center justify-center rounded-ops-card border border-ops-border bg-ops-surface p-6">
				<OpsEmptyState title={opsCalendarCopy.emptyWeekTitle} description={opsCalendarCopy.emptyWeekDescription} />
			</div>
		) : (
			<ul
				className="min-h-[720px] space-y-2 rounded-ops-card border border-ops-border bg-ops-surface p-3"
				aria-label={opsCalendarCopy.listRegionAria}
			>
				{events.map((ev) => {
					const selected = selectedEventId === ev.id
					return (
						<li key={ev.id}>
							<button
								type="button"
								data-calendar-event={ev.id}
								aria-label={opsCalendarCopy.eventOpenDetailAria(ev.title)}
								aria-pressed={selected}
								className={cn(
									'w-full rounded-md border border-ops-border px-3 py-2 text-left text-sm transition hover:bg-ops-accent-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
									selected ? 'bg-ops-accent-soft ring-1 ring-ops' : 'bg-ops-surface',
								)}
								onClick={() => activateEvent(ev)}
							>
								<div className="font-medium text-ops-foreground">{ev.title}</div>
								<div className="mt-0.5 text-xs text-ops-muted">{ev.subtitle}</div>
								<div className="mt-1 text-[11px] text-ops-muted">
									{new Date(ev.startsAt).toLocaleString()} → {new Date(ev.endsAt).toLocaleString()}
								</div>
							</button>
						</li>
					)
				})}
			</ul>
		)

	const weekBody =
		events.length === 0 ? (
			<div className="flex min-h-[720px] items-center justify-center rounded-ops-card border border-ops-border bg-ops-surface p-6">
				<OpsEmptyState title={opsCalendarCopy.emptyWeekTitle} description={opsCalendarCopy.emptyWeekDescription} />
			</div>
		) : (
			<OpsCalendarWeek
				weekStartYmd={weekStartYmd}
				events={events}
				selectedEventId={selectedEventId}
				onActivateEvent={activateEvent}
			/>
		)

	const main = (
		<div className="min-w-0 space-y-3">
			<div
				className="flex min-h-[44px] flex-wrap items-center justify-between gap-3"
				role="toolbar"
				aria-label={opsCalendarCopy.viewToggleGroupAria}
			>
				<div className="flex flex-wrap items-center gap-2">
					<Button type="button" size="sm" variant="outline" className="border-ops-border" asChild>
						<Link href={hrefForWeek(prevWeek)} scroll={false} aria-label={opsCalendarCopy.prevWeekAria}>
							<span aria-hidden>←</span>
						</Link>
					</Button>
					<Button type="button" size="sm" variant="outline" className="border-ops-border" asChild>
						<Link href={hrefForWeek(nextWeek)} scroll={false} aria-label={opsCalendarCopy.nextWeekAria}>
							<span aria-hidden>→</span>
						</Link>
					</Button>
					<Button type="button" size="sm" variant="secondary" className="border-ops-border" asChild>
						<Link href={hrefForWeek(thisWeek)} scroll={false}>
							{opsCalendarCopy.thisWeek}
						</Link>
					</Button>
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
							href={buildOpsCalendarHref({ weekStartYmd, eventId: selectedEventId, view: 'week' })}
							scroll={false}
						>
							{opsCalendarCopy.viewWeek}
						</Link>
					</Button>
					<Button
						type="button"
						size="sm"
						variant={view === 'list' ? 'default' : 'ghost'}
						className={cn(view === 'list' ? 'shadow-sm' : 'text-ops-muted')}
						asChild
					>
						<Link
							href={buildOpsCalendarHref({ weekStartYmd, eventId: selectedEventId, view: 'list' })}
							scroll={false}
						>
							{opsCalendarCopy.viewList}
						</Link>
					</Button>
				</div>
			</div>
			{view === 'week' ? weekBody : listBody}
		</div>
	)

	const detail =
		selectedPayload ? (
			<OpsDetailRail title={opsCalendarCopy.detailRailTitle} onClose={handleCloseDetail}>
				<div className="space-y-4">
					<div className="flex flex-wrap items-center gap-2">
						<OpsStatusPill tone={getOpsStatusPillTone(selectedPayload.status)}>
							{tripStatusDisplayLabel(selectedPayload.status)}
						</OpsStatusPill>
						<span className="font-mono text-xs text-ops-muted">{selectedPayload.tripId}</span>
					</div>
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsCalendarCopy.sectionSchedule}
						</h3>
						<p className="mt-1 text-sm text-ops-foreground">{selectedPayload.scheduleLabel}</p>
					</section>
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsCalendarCopy.sectionVehicle}
						</h3>
						<p className="mt-1 text-sm text-ops-foreground">{selectedPayload.vehicleName}</p>
					</section>
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsCalendarCopy.sectionClient}
						</h3>
						<p className="mt-1 text-sm text-ops-foreground">{selectedPayload.clientLabel}</p>
					</section>
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsCalendarCopy.sectionDriver}
						</h3>
						<p className="mt-1 text-sm text-ops-foreground">{selectedPayload.driverName}</p>
					</section>
					{selectedPayload.serviceType ? (
						<section>
							<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
								{opsCalendarCopy.serviceTypeLabel}
							</h3>
							<p className="mt-1 text-sm text-ops-foreground">{selectedPayload.serviceType}</p>
						</section>
					) : null}
					<section>
						<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
							{opsCalendarCopy.sectionNotes}
						</h3>
						<p className="mt-1 text-sm text-ops-muted">
							{selectedPayload.notes ?? opsCalendarCopy.noNotes}
						</p>
					</section>
					<p>
						<Link
							href={buildOpsTripsHref({ id: selectedPayload.tripId })}
							className="text-sm text-ops-info underline-offset-2 hover:underline"
						>
							{opsCalendarCopy.openTripsPage}
						</Link>
					</p>
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
