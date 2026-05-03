'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCircle2, X } from 'lucide-react'

import { createClientClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
	acknowledgeOpsAlertAction,
	dismissOpsAlertAction,
} from '@/actions/opsAlerts'
import { opsUnreadNotificationsAria } from '@/features/ops/copy/ops-top-bar-copy'
import type {
	OpsAlertKindDb,
	OpsAlertRowDb,
	OpsAlertSeverityDb,
} from '@/types/database.types'

type OpsAlert = {
	id: string
	kind: OpsAlertKindDb
	severity: OpsAlertSeverityDb
	subjectTable: string
	subjectId: string | null
	payload: Record<string, unknown>
	createdAt: string
}

const KIND_LABELS: Record<OpsAlertKindDb, string> = {
	maintenance_due: 'Vehicle maintenance due',
	license_expiring: 'Driver licence expiring',
	prdp_expiring: 'PrDP expiring',
	quote_expiring_soon: 'Quote expiring soon',
	email_retry_failed: 'Email retry failed',
	delayed_trip: 'Trip is delayed',
	overdue_invoice: 'Overdue invoice',
}

const SEVERITY_STYLES: Record<OpsAlertSeverityDb, string> = {
	low: 'bg-emerald-500/15 text-emerald-100 border-emerald-500/40',
	medium: 'bg-amber-500/15 text-amber-100 border-amber-500/40',
	high: 'bg-orange-500/15 text-orange-100 border-orange-500/40',
	critical: 'bg-red-500/15 text-red-100 border-red-500/40',
}

function describeAlert(alert: OpsAlert): string {
	const label = KIND_LABELS[alert.kind] ?? 'Operational alert'
	const payloadName = (alert.payload?.['name'] as string | undefined) ?? null
	if (payloadName) return `${label} — ${payloadName}`
	return label
}

function alertHref(alert: OpsAlert): string | null {
	switch (alert.subjectTable) {
		case 'bookings':
			return alert.subjectId ? `/ops/bookings?focus=${alert.subjectId}` : '/ops/bookings'
		case 'trips':
			return '/ops/trips'
		case 'vehicles':
			return '/ops/vehicles'
		case 'driver_profiles':
		case 'profiles':
			return '/ops/roster'
		case 'invoices':
			return '/ops/invoicing'
		case 'booking_quotes':
			return '/ops/bookings/comms-retry'
		default:
			return null
	}
}

function timeAgo(iso: string): string {
	const ms = Date.now() - new Date(iso).getTime()
	if (Number.isNaN(ms) || ms < 0) return 'just now'
	const sec = Math.floor(ms / 1000)
	if (sec < 60) return 'just now'
	const min = Math.floor(sec / 60)
	if (min < 60) return `${min}m ago`
	const hr = Math.floor(min / 60)
	if (hr < 24) return `${hr}h ago`
	const day = Math.floor(hr / 24)
	return `${day}d ago`
}

export function OpsNotificationsBell() {
	const [open, setOpen] = useState(false)
	const [alerts, setAlerts] = useState<OpsAlert[]>([])
	const [loading, setLoading] = useState(false)
	const [busyId, setBusyId] = useState<string | null>(null)
	const containerRef = useRef<HTMLDivElement | null>(null)

	const refreshAlerts = useCallback(async () => {
		setLoading(true)
		try {
			const supabase = createClientClient()
			const { data, error } = await supabase
				.from('ops_alerts')
				.select(
					'id, kind, severity, subject_table, subject_id, payload, created_at, acknowledged_at, dismissed_at',
				)
				.is('acknowledged_at', null)
				.is('dismissed_at', null)
				.order('created_at', { ascending: false })
				.limit(20)
			if (error) {
				setAlerts([])
				return
			}
			const rows = (data ?? []) as OpsAlertRowDb[]
			setAlerts(
				rows.map((r) => ({
					id: r.id,
					kind: r.kind,
					severity: r.severity,
					subjectTable: r.subject_table,
					subjectId: r.subject_id,
					payload: (r.payload as Record<string, unknown>) ?? {},
					createdAt: r.created_at,
				})),
			)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		void refreshAlerts()
		const id = window.setInterval(() => void refreshAlerts(), 60_000)
		return () => window.clearInterval(id)
	}, [refreshAlerts])

	useEffect(() => {
		if (!open) return
		const onClick = (e: MouseEvent) => {
			if (!containerRef.current) return
			if (!containerRef.current.contains(e.target as Node)) {
				setOpen(false)
			}
		}
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setOpen(false)
		}
		document.addEventListener('mousedown', onClick)
		document.addEventListener('keydown', onKey)
		return () => {
			document.removeEventListener('mousedown', onClick)
			document.removeEventListener('keydown', onKey)
		}
	}, [open])

	const onAcknowledge = useCallback(
		async (id: string) => {
			setBusyId(id)
			const res = await acknowledgeOpsAlertAction({ id })
			setBusyId(null)
			if (res.ok) {
				setAlerts((prev) => prev.filter((a) => a.id !== id))
			}
		},
		[],
	)

	const onDismiss = useCallback(async (id: string) => {
		setBusyId(id)
		const res = await dismissOpsAlertAction({ id })
		setBusyId(null)
		if (res.ok) {
			setAlerts((prev) => prev.filter((a) => a.id !== id))
		}
	}, [])

	const focusRing =
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas'

	const unread = alerts.length

	return (
		<div ref={containerRef} className="relative">
			<button
				type="button"
				className={cn(
					'relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-ops-border text-ops-foreground hover:bg-ops-surface-hover',
					focusRing,
				)}
				aria-label={opsUnreadNotificationsAria(unread)}
				aria-expanded={open}
				aria-haspopup="dialog"
				onClick={() => {
					setOpen((o) => !o)
					if (!open) void refreshAlerts()
				}}
			>
				<Bell className="h-5 w-5" aria-hidden />
				{unread > 0 ? (
					<span
						className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-ops-surface"
						aria-hidden
					/>
				) : null}
			</button>

			{open ? (
				<div
					role="dialog"
					aria-label="Notifications"
					className="absolute right-0 top-full z-50 mt-2 w-[22rem] max-w-[90vw] rounded-md border border-ops-border bg-ops-surface text-ops-foreground shadow-xl"
				>
					<div className="flex items-center justify-between border-b border-ops-border px-3 py-2">
						<span className="text-sm font-semibold">Notifications</span>
						<button
							type="button"
							className={cn('rounded p-1 text-ops-muted hover:bg-ops-surface-hover', focusRing)}
							onClick={() => setOpen(false)}
							aria-label="Close notifications"
						>
							<X className="h-4 w-4" aria-hidden />
						</button>
					</div>

					<ul className="max-h-[26rem] divide-y divide-ops-border overflow-y-auto" role="list">
						{loading && alerts.length === 0 ? (
							<li className="px-3 py-6 text-center text-sm text-ops-muted">Loading…</li>
						) : null}

						{!loading && alerts.length === 0 ? (
							<li className="px-3 py-6 text-center text-sm text-ops-muted">
								No new notifications
							</li>
						) : null}

						{alerts.map((a) => {
							const href = alertHref(a)
							return (
								<li key={a.id} className="px-3 py-3">
									<div className="flex items-start gap-2">
										<span
											className={cn(
												'mt-0.5 inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide',
												SEVERITY_STYLES[a.severity],
											)}
										>
											{a.severity}
										</span>
										<div className="min-w-0 flex-1">
											{href ? (
												<Link
													href={href}
													onClick={() => setOpen(false)}
													className="block text-sm font-medium text-ops-foreground hover:underline"
												>
													{describeAlert(a)}
												</Link>
											) : (
												<span className="block text-sm font-medium text-ops-foreground">
													{describeAlert(a)}
												</span>
											)}
											<p className="mt-0.5 text-xs text-ops-muted">{timeAgo(a.createdAt)}</p>
										</div>
									</div>
									<div className="mt-2 flex items-center justify-end gap-2 text-xs">
										<button
											type="button"
											className={cn(
												'inline-flex items-center gap-1 rounded border border-ops-border px-2 py-1 text-ops-muted hover:bg-ops-surface-hover hover:text-ops-foreground',
												focusRing,
											)}
											disabled={busyId === a.id}
											onClick={() => void onAcknowledge(a.id)}
										>
											<CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
											Acknowledge
										</button>
										<button
											type="button"
											className={cn(
												'inline-flex items-center gap-1 rounded border border-ops-border px-2 py-1 text-ops-muted hover:bg-ops-surface-hover hover:text-ops-foreground',
												focusRing,
											)}
											disabled={busyId === a.id}
											onClick={() => void onDismiss(a.id)}
										>
											Dismiss
										</button>
									</div>
								</li>
							)
						})}
					</ul>
				</div>
			) : null}
		</div>
	)
}
