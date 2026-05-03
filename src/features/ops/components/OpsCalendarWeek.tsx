'use client'

import * as React from 'react'

import { opsCalendarCopy } from '@/features/ops/copy/ops-calendar-copy'
import type { OpsCalendarWeekEvent } from '@/features/ops/lib/map-ops-calendar-trips'
import type { OpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { addDaysLocal, formatYmdLocal } from '@/lib/ops-calendar-url'
import { cn } from '@/lib/utils'

const PX_PER_HOUR = 48

const EVENT_BLOCK: Record<OpsStatusPillTone, string> = {
	success: 'border-ops-success/60 bg-ops-success/15',
	warning: 'border-ops-warning/60 bg-ops-warning/15',
	danger: 'border-ops-danger/60 bg-ops-danger/15',
	info: 'border-ops-info/60 bg-ops-info/15',
	neutral: 'border-ops-muted/50 bg-ops-muted/10',
}

function parseLocalDateYmd(ymd: string): Date {
	const [y, m, d] = ymd.split('-').map(Number)
	return new Date(y, m - 1, d)
}

function minutesSinceMidnight(d: Date): number {
	return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60
}

function eventDayYmdLocal(iso: string): string {
	return formatYmdLocal(new Date(iso))
}

function layoutOverlaps(
	ids: string[],
	startMin: Record<string, number>,
	endMin: Record<string, number>,
): { col: Record<string, number>; maxCols: number } {
	const sorted = [...ids].sort((a, b) => startMin[a] - startMin[b])
	const laneEnd: number[] = []
	const col: Record<string, number> = {}
	for (const id of sorted) {
		const s = startMin[id]
		const endT = endMin[id]
		let c = 0
		while (c < laneEnd.length && laneEnd[c] > s) {
			c += 1
		}
		if (c === laneEnd.length) {
			laneEnd.push(endT)
		} else {
			laneEnd[c] = endT
		}
		col[id] = c
	}
	return { col, maxCols: Math.max(1, laneEnd.length) }
}

function useMinuteTick(): Date {
	const [now, setNow] = React.useState(() => new Date())
	React.useEffect(() => {
		const id = window.setInterval(() => setNow(new Date()), 60_000)
		return () => window.clearInterval(id)
	}, [])
	return now
}

export type OpsCalendarWeekProps = {
	/** Monday **`YYYY-MM-DD`** (local week start). */
	weekStartYmd: string
	events: OpsCalendarWeekEvent[]
	/** Inclusive start hour (default **6**). */
	startHour?: number
	/** Exclusive end hour (default **24**); use **24** for midnight end-of-day window. */
	endHour?: number
	selectedEventId: string | null
	onActivateEvent: (event: OpsCalendarWeekEvent) => void
	className?: string
}

/**
 * FE.17.9 week grid: **7** day columns, hour bands **06:00–24:00** by default — CSS positioning (**no** `react-big-calendar`).
 */
export function OpsCalendarWeek({
	weekStartYmd,
	events,
	startHour = 6,
	endHour = 24,
	selectedEventId,
	onActivateEvent,
	className,
}: OpsCalendarWeekProps) {
	const [mounted, setMounted] = React.useState(false)
	const [focusedEventId, setFocusedEventId] = React.useState<string | null>(null)
	const now = useMinuteTick()
	const weekStart = React.useMemo(() => parseLocalDateYmd(weekStartYmd), [weekStartYmd])
	const totalHours = Math.max(1, endHour - startHour)
	const gridHeightPx = totalHours * PX_PER_HOUR
	const dayDates = React.useMemo(
		() => Array.from({ length: 7 }, (_, i) => addDaysLocal(weekStart, i)),
		[weekStart],
	)
	const todayYmd = formatYmdLocal(new Date())

	React.useEffect(() => {
		setMounted(true)
	}, [])

	const dayYmds = dayDates.map((d) => formatYmdLocal(d))

	const eventsByDay = React.useMemo(() => {
		const m = new Map<string, OpsCalendarWeekEvent[]>()
		for (const ymd of dayYmds) {
			m.set(ymd, [])
		}
		for (const ev of events) {
			const ymd = eventDayYmdLocal(ev.startsAt)
			if (!m.has(ymd)) continue
			m.get(ymd)!.push(ev)
		}
		for (const list of m.values()) {
			list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
		}
		return m
	}, [events, dayYmds])

	const slotStartMin = startHour * 60
	const slotEndMin = endHour * 60

	const eventRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map())
	const orderedEventIds = React.useMemo(
		() =>
			[...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()).map((e) => e.id),
		[events],
	)

	const focusEventById = React.useCallback((id: string | null) => {
		if (!id) return
		queueMicrotask(() => eventRefs.current.get(id)?.focus())
	}, [])

	const onKeyDownGrid = React.useCallback(
		(e: React.KeyboardEvent) => {
			const cur = focusedEventId ?? selectedEventId
			if (!cur) return
			const idx = orderedEventIds.indexOf(cur)
			if (idx < 0) return
			if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
				e.preventDefault()
				const next = orderedEventIds[Math.min(idx + 1, orderedEventIds.length - 1)]
				setFocusedEventId(next)
				focusEventById(next)
			} else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
				e.preventDefault()
				const next = orderedEventIds[Math.max(idx - 1, 0)]
				setFocusedEventId(next)
				focusEventById(next)
			} else if (e.key === 'Home') {
				e.preventDefault()
				const next = orderedEventIds[0]
				if (next) {
					setFocusedEventId(next)
					focusEventById(next)
				}
			} else if (e.key === 'End') {
				e.preventDefault()
				const next = orderedEventIds[orderedEventIds.length - 1]
				if (next) {
					setFocusedEventId(next)
					focusEventById(next)
				}
			}
		},
		[focusedEventId, selectedEventId, orderedEventIds, focusEventById],
	)

	const HEADER_H = 48

	/* eslint-disable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions -- FE.17.9 week grid composite */
	return (
		<div
			className={cn('min-h-[720px] min-w-0', className)}
			role="region"
			aria-label={opsCalendarCopy.gridRegionAria}
			tabIndex={0}
			onKeyDown={onKeyDownGrid}
		>
			<div className="flex min-w-0 gap-0 overflow-x-auto rounded-ops-card border border-ops-border bg-ops-surface">
				<div
					className="sticky left-0 z-20 w-12 shrink-0 border-r border-ops-border bg-ops-surface text-right text-[10px] text-ops-muted"
					aria-hidden
				>
					<div style={{ height: HEADER_H }} className="shrink-0 border-b border-ops-border bg-ops-surface" />
					{Array.from({ length: totalHours }, (_, i) => {
						const h = startHour + i
						const label = `${String(h % 24).padStart(2, '0')}:00`
						return (
							<div
								key={h}
								className="box-border flex items-start justify-end pr-1"
								style={{ height: PX_PER_HOUR }}
							>
								{label}
							</div>
						)
					})}
				</div>
				<div
					className="grid min-w-[640px] flex-1"
					style={{
						gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
					}}
				>
					{dayDates.map((dayDate, dayIdx) => {
						const ymd = dayYmds[dayIdx]
						const isTodayCol = ymd === todayYmd
						const dayEvents = eventsByDay.get(ymd) ?? []
						const startMin: Record<string, number> = {}
						const endMin: Record<string, number> = {}
						for (const ev of dayEvents) {
							const s = new Date(ev.startsAt)
							const en = new Date(ev.endsAt)
							let sm = minutesSinceMidnight(s)
							let em = minutesSinceMidnight(en)
							if (eventDayYmdLocal(ev.endsAt) !== ymd) {
								em = slotEndMin
							}
							if (eventDayYmdLocal(ev.startsAt) !== ymd) {
								sm = slotStartMin
							}
							sm = Math.max(slotStartMin, Math.min(sm, slotEndMin))
							em = Math.max(slotStartMin, Math.min(em, slotEndMin))
							if (em <= sm) {
								em = Math.min(sm + 30, slotEndMin)
							}
							startMin[ev.id] = sm
							endMin[ev.id] = em
						}
						const { col, maxCols } = layoutOverlaps(
							dayEvents.map((e) => e.id),
							startMin,
							endMin,
						)

						let nowTopPx: number | null = null
						if (mounted && isTodayCol) {
							const nm = minutesSinceMidnight(now)
							if (nm >= slotStartMin && nm <= slotEndMin) {
								nowTopPx = ((nm - slotStartMin) / 60) * PX_PER_HOUR
							}
						}

						return (
							<div
								key={ymd}
								className={cn(
									'relative border-l border-ops-border first:border-l-0',
									isTodayCol ? 'bg-ops-accent-soft/40' : null,
								)}
							>
								<div
									className={cn(
										'sticky top-0 z-10 flex h-12 flex-col items-center justify-center border-b border-ops-border px-1 text-center text-[11px] font-semibold leading-tight',
										isTodayCol ? 'text-ops-accent' : 'text-ops-foreground',
									)}
								>
									<div className="text-ops-muted">
										{dayDate.toLocaleDateString(undefined, { weekday: 'short' })}
									</div>
									<div>{dayDate.getDate()}</div>
								</div>
								<div className="relative" style={{ height: gridHeightPx }}>
									{Array.from({ length: totalHours }, (_, i) => (
										<div
											key={i}
											className="box-border border-b border-ops-border/40"
											style={{ height: PX_PER_HOUR }}
										/>
									))}
									{nowTopPx != null ? (
										<div
											className="pointer-events-none absolute left-0 right-0 z-30 border-t-2 border-ops-danger"
											style={{ top: nowTopPx }}
											aria-hidden
										/>
									) : null}
									{dayEvents.map((ev) => {
										const sm = startMin[ev.id]!
										const em = endMin[ev.id]!
										const topPx = ((sm - slotStartMin) / 60) * PX_PER_HOUR
										const heightPx = Math.max(((em - sm) / 60) * PX_PER_HOUR, 22)
										const lane = col[ev.id] ?? 0
										const wPct = 100 / maxCols
										const leftPct = lane * wPct
										const selected = selectedEventId === ev.id
										return (
											<button
												key={ev.id}
												type="button"
												data-calendar-event={ev.id}
												ref={(el) => {
													if (el) eventRefs.current.set(ev.id, el)
													else eventRefs.current.delete(ev.id)
												}}
												tabIndex={selected || focusedEventId === ev.id ? 0 : -1}
												aria-label={opsCalendarCopy.eventOpenDetailAria(ev.title)}
												aria-pressed={selected}
												className={cn(
													'absolute overflow-hidden rounded-md border px-1 py-0.5 text-left text-[10px] leading-snug shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-1 focus-visible:ring-offset-ops-canvas',
													EVENT_BLOCK[ev.tone],
													selected ? 'ring-2 ring-ops' : 'hover:brightness-110',
												)}
												style={{
													top: topPx,
													height: heightPx,
													left: `${leftPct}%`,
													width: `${wPct}%`,
												}}
												onClick={() => onActivateEvent(ev)}
												onFocus={() => setFocusedEventId(ev.id)}
												onKeyDown={(e) => {
													if (e.key === 'Enter' || e.key === ' ') {
														e.preventDefault()
														onActivateEvent(ev)
													}
												}}
											>
												<div className="truncate font-medium text-ops-foreground">{ev.title}</div>
												<div className="truncate text-ops-muted">{ev.subtitle}</div>
											</button>
										)
									})}
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
	/* eslint-enable jsx-a11y/no-noninteractive-tabindex, jsx-a11y/no-noninteractive-element-interactions */
}
