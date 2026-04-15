'use client'

import { useState, useTransition } from 'react'

import {
	confirmChauffeurAssignmentAction,
	logChauffeurContactIntentAction,
	updateChauffeurTripStatusAction,
} from '@/actions/fieldChauffeur'

type Props = {
	tripId: string
	status: string
	canConfirm: boolean
	canComplete: boolean
	telHref: string | null
	maskedPhone: string | null
	googleMapsUrl: string | null
	appleMapsUrl: string | null
	/** Fixed bottom bar with safe-area padding — keeps confirm / complete / call / maps reachable while scrolling. */
	stickyFooter?: boolean
}

const fieldActionFocus =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950'

export function FieldTripDetailActions({
	tripId,
	status,
	canConfirm,
	canComplete,
	telHref,
	maskedPhone,
	googleMapsUrl,
	appleMapsUrl,
	stickyFooter = false,
}: Props) {
	const [pending, start] = useTransition()
	const [msg, setMsg] = useState<string | null>(null)

	function runAction(
		fn: () => Promise<{ ok: boolean; message?: string }>,
		onOk?: () => void,
	) {
		setMsg(null)
		start(async () => {
			const r = await fn()
			if (!r.ok && r.message) {
				setMsg(r.message)
				return
			}
			onOk?.()
		})
	}

	const body = (
		<>
			{msg ? (
				<p className="text-sm text-red-400" role="alert">
					{msg}
				</p>
			) : null}

			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
				{googleMapsUrl ? (
					<a
						href={googleMapsUrl}
						target="_blank"
						rel="noopener noreferrer"
						className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700 active:bg-slate-600 ${fieldActionFocus}`}
					>
						Open in Google Maps
					</a>
				) : null}
				{appleMapsUrl ? (
					<a
						href={appleMapsUrl}
						target="_blank"
						rel="noopener noreferrer"
						className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-100 hover:bg-slate-800 active:bg-slate-700/80 ${fieldActionFocus}`}
					>
						Open in Apple Maps
					</a>
				) : null}
			</div>

			<div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
				{canConfirm ? (
					<button
						type="button"
						disabled={pending}
						className={`min-h-11 min-w-11 rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-500 active:bg-amber-400 disabled:opacity-60 ${fieldActionFocus}`}
						onClick={() =>
							runAction(() => confirmChauffeurAssignmentAction({ tripId }))
						}
					>
						Confirm assignment
					</button>
				) : null}
				{canComplete ? (
					<button
						type="button"
						disabled={pending}
						className={`min-h-11 min-w-11 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 active:bg-emerald-500 disabled:opacity-60 ${fieldActionFocus}`}
						onClick={() =>
							runAction(() =>
								updateChauffeurTripStatusAction({ tripId, nextStatus: 'completed' }),
							)
						}
					>
						Mark completed
					</button>
				) : null}
			</div>

			{telHref && maskedPhone ? (
				<div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
					<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
						Customer phone
					</p>
					<p className="mt-1 text-lg font-semibold text-slate-100">{maskedPhone}</p>
					<button
						type="button"
						disabled={pending}
						className={`mt-3 min-h-11 w-full min-w-11 rounded-md border border-amber-600/60 px-4 py-2.5 text-sm font-semibold text-amber-400 hover:bg-amber-950/40 active:bg-amber-950/60 disabled:opacity-60 sm:w-auto ${fieldActionFocus}`}
						onClick={() =>
							runAction(async () => {
								const r = await logChauffeurContactIntentAction({ tripId })
								if (r.ok && typeof window !== 'undefined') {
									window.location.href = telHref
								}
								return r
							})
						}
					>
						Call customer
					</button>
					<p className="mt-2 text-xs text-slate-500">
						Status: {status}. Only assigned and en_route trips show contact.
					</p>
				</div>
			) : null}
		</>
	)

	if (!stickyFooter) {
		return <div className="space-y-4">{body}</div>
	}

	return (
		<div
			className="fixed inset-x-0 bottom-0 z-30 w-full max-w-full min-w-0 border-t border-slate-800 bg-slate-950/95 shadow-[0_-12px_40px_rgba(0,0,0,0.5)] backdrop-blur-md supports-[backdrop-filter]:bg-slate-950/90"
			role="region"
			aria-label="Trip actions"
		>
			<div className="mx-auto max-h-[min(50vh,22rem)] w-full min-w-0 max-w-3xl space-y-4 overflow-y-auto overflow-x-hidden px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]">
				{body}
			</div>
		</div>
	)
}
