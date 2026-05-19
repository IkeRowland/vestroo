'use client'

import * as React from 'react'

import { opsFleetDriversCopy } from '@/features/ops/copy/ops-fleet-drivers-copy'
import type { OpsCalendarWeekEvent } from '@/features/ops/lib/map-ops-calendar-trips'
import type { OpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { addDaysLocal, formatYmdLocal, monthGridStartMondayLocal, parseYmToFirstDay } from '@/lib/ops-calendar-url'
import { cn } from '@/lib/utils'

const CHIP: Record<OpsStatusPillTone, string> = {
	success: 'border-ops-success/50 bg-ops-success/15 text-ops-foreground',
	warning: 'border-ops-warning/50 bg-ops-warning/15 text-ops-foreground',
	danger: 'border-ops-danger/50 bg-ops-danger/15 text-ops-foreground',
	info: 'border-ops-info/50 bg-ops-info/15 text-ops-foreground',
	neutral: 'border-ops-muted/40 bg-ops-muted/10 text-ops-foreground',
}

const MAX_VISIBLE = 3

function eventDayYmdLocal(iso: string): string {
	return formatYmdLocal(new Date(iso))
}

export type OpsCalendarMonthProps = {
	/** **`YYYY-MM`** */
	monthYm: string
	events: OpsCalendarWeekEvent[]
	selectedEventId: string | null
	onActivateEvent: (ev: OpsCalendarWeekEvent) => void
	/** Defaults to fleet drivers copy (shifts); pass calendar copy on **`/ops/calendar`**. */
	regionAriaLabel?: string
	className?: string
}

/**
 * FE.17.9 **month** grid: **6×7** cells, **chips** with **max 3** + overflow (**Story 17.15**).
 */
export function OpsCalendarMonth({
	monthYm,
	events,
	selectedEventId,
	onActivateEvent,
	regionAriaLabel = opsFleetDriversCopy.gridMonthAria,
	className,
}: OpsCalendarMonthProps) {
	const [expandedYmd, setExpandedYmd] = React.useState<Record<string, boolean>>({})
	const monthFirst = React.useMemo(() => parseYmToFirstDay(monthYm), [monthYm])
	const gridStart = React.useMemo(() => monthGridStartMondayLocal(monthFirst), [monthFirst])
	const todayYmd = formatYmdLocal(new Date())

	const eventsByYmd = React.useMemo(() => {
		const m = new Map<string, OpsCalendarWeekEvent[]>()
		for (const ev of events) {
			const ymd = eventDayYmdLocal(ev.startsAt)
			if (!m.has(ymd)) m.set(ymd, [])
			m.get(ymd)!.push(ev)
		}
		for (const list of m.values()) {
			list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
		}
		return m
	}, [events])

	const cells = React.useMemo(() => {
		const out: { date: Date; ymd: string; inMonth: boolean }[] = []
		for (let i = 0; i < 42; i += 1) {
			const d = addDaysLocal(gridStart, i)
			const ymd = formatYmdLocal(d)
			out.push({
				date: d,
				ymd,
				inMonth: d.getMonth() === monthFirst.getMonth(),
			})
		}
		return out
	}, [gridStart, monthFirst])

	const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

	return (
		<div
			className={cn('min-h-[720px] min-w-0', className)}
			role="region"
			aria-label={regionAriaLabel}
		>
			<div className="rounded-ops-card border border-ops-border bg-ops-surface p-2">
				<div
					className="grid grid-cols-7 gap-px border-b border-ops-border pb-1 text-center text-[10px] font-semibold uppercase tracking-wide text-ops-muted"
					aria-hidden
				>
					{weekdayLabels.map((w) => (
						<div key={w} className="py-1">
							{w}
						</div>
					))}
				</div>
				<div className="grid grid-cols-7 gap-px pt-1">
					{cells.map(({ date, ymd, inMonth }) => {
						const dayEvents = eventsByYmd.get(ymd) ?? []
						const visible = dayEvents.slice(0, MAX_VISIBLE)
						const hidden = dayEvents.slice(MAX_VISIBLE)
						const expanded = expandedYmd[ymd] === true
						const showHidden = hidden.length > 0 && expanded
						const isToday = ymd === todayYmd
						return (
							<div
								key={ymd}
								className={cn(
									'flex min-h-[5.5rem] flex-col border border-ops-border/60 p-1',
									inMonth ? 'bg-ops-surface' : 'bg-ops-surface-active/30',
									isToday ? 'ring-1 ring-ops' : null,
								)}
							>
								<div
									className={cn(
										'text-[11px] font-semibold tabular-nums',
										inMonth ? 'text-ops-foreground' : 'text-ops-muted',
										isToday ? 'text-ops-accent' : null,
									)}
								>
									{date.getDate()}
								</div>
								<div className="mt-0.5 flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden">
									{visible.map((ev) => (
										<button
											key={ev.id}
											type="button"
											data-calendar-event={ev.id}
											aria-label={`${ev.title}. ${ev.subtitle}`}
											aria-pressed={selectedEventId === ev.id}
											onClick={() => onActivateEvent(ev)}
											onKeyDown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault()
													onActivateEvent(ev)
												}
											}}
											className={cn(
												'w-full truncate rounded border px-0.5 py-px text-left text-[9px] font-medium leading-tight transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ops',
												CHIP[ev.tone],
												selectedEventId === ev.id ? 'ring-1 ring-ops' : null,
											)}
										>
											<span className="block truncate">{ev.title}</span>
										</button>
									))}
									{showHidden
										? hidden.map((ev) => (
												<button
													key={ev.id}
													type="button"
													data-calendar-event={ev.id}
													aria-label={`${ev.title}. ${ev.subtitle}`}
													aria-pressed={selectedEventId === ev.id}
													onClick={() => onActivateEvent(ev)}
													onKeyDown={(e) => {
														if (e.key === 'Enter' || e.key === ' ') {
															e.preventDefault()
															onActivateEvent(ev)
														}
													}}
													className={cn(
														'w-full truncate rounded border px-0.5 py-px text-left text-[9px] font-medium leading-tight transition hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ops',
														CHIP[ev.tone],
														selectedEventId === ev.id ? 'ring-1 ring-ops' : null,
													)}
												>
													<span className="block truncate">{ev.title}</span>
												</button>
											))
										: null}
									{hidden.length > 0 && !showHidden ? (
										<button
											type="button"
											className="mt-auto text-left text-[9px] font-medium text-ops-info underline-offset-2 hover:underline"
											aria-expanded={expanded}
											aria-label={opsFleetDriversCopy.expandDayShiftsAria(ymd, hidden.length)}
											onClick={() =>
												setExpandedYmd((prev) => ({
													...prev,
													[ymd]: !prev[ymd],
												}))
											}
										>
											{expanded ? opsFleetDriversCopy.showLess : opsFleetDriversCopy.moreShiftsLabel(hidden.length)}
										</button>
									) : null}
								</div>
							</div>
						)
					})}
				</div>
			</div>
		</div>
	)
}
