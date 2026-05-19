'use client'

import {
	forwardRef,
	useCallback,
	useEffect,
	useId,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react'

import { resolveAccountsByEmailDomain } from '@/actions/resolveAccountsByEmailDomain'
import type { WebClientTypeResolution } from '@/actions/booking-schemas'
import {
	type AccountDomainCandidateRow,
	verifyAccountIdAllowedForEmailDomain,
} from '@/actions/client-type-resolution'
import { useBookingStore } from '@/features/booking/hooks/useBookingStore'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 500

function emailLooksValidForProbe(value: string): boolean {
	const t = value.trim()
	return t.includes('@') && t.includes('.') && t.length > 5
}

function domainFromEmail(email: string): string {
	const t = email.trim()
	const at = t.lastIndexOf('@')
	if (at < 0 || at >= t.length - 1) return ''
	return t.slice(at + 1).toLowerCase()
}

export type BookingAccountDomainGateHandle = {
	/** Call before submitting contact details — returns false if Q6 still needs attention (modal variant only). */
	ensureReadyForSubmit: () => boolean
}

export type AccountInvoicingUiContext = {
	accountDisplayName: string
	defaultPoRequired: boolean
}

export type BookingAccountDomainGateVariant = 'modal' | 'inline'

type BookingAccountDomainGateProps = {
	email: string
	/** When false, skips domain probe (e.g. tests). */
	enabled?: boolean
	className?: string
	/**
	 * `modal` — blocking dialog until confirm/dismiss (default `/book` wizard).
	 * `inline` — FE.19.8 trip-request: passive notice under email; first org auto-selected; Submit never gated.
	 */
	variant?: BookingAccountDomainGateVariant
	/** Default true — `/book` wizard checkout path. Set false for trip-request (uses `onClientTypeResolutionChange` only). */
	syncToBookingStore?: boolean
	/** Called on every resolution change (e.g. trip-request funnel). */
	onClientTypeResolutionChange?: (resolution: WebClientTypeResolution | null) => void
	/** Story 12.7 — PO-required UI context from the matched `customer_accounts` candidate row. */
	onInvoicingContextChange?: (ctx: AccountInvoicingUiContext | null) => void
	/** When Q6 probe / resolution blocks submit (modal path only). */
	onReadyChange?: (ready: boolean) => void
}

/**
 * Story 12.5 / Q6 — debounced domain lookup; modal (`/book`) or passive inline notice (trip-request FE.19.8).
 * Syncs `clientTypeResolution` into `useBookingStore` for booking submit when `syncToBookingStore` is true.
 */
export const BookingAccountDomainGate = forwardRef<
	BookingAccountDomainGateHandle,
	BookingAccountDomainGateProps
>(function BookingAccountDomainGate(
	{
		email,
		enabled = true,
		className,
		variant = 'modal',
		syncToBookingStore = true,
		onClientTypeResolutionChange,
		onInvoicingContextChange,
		onReadyChange,
	},
	ref,
) {
	const isInline = variant === 'inline'
	const setClientTypeResolution = useBookingStore((s) => s.setClientTypeResolution)
	const setAccountInvoicingContext = useBookingStore((s) => s.setAccountInvoicingContext)
	const [probe, setProbe] = useState<'idle' | 'loading' | 'done'>('idle')
	const [candidates, setCandidates] = useState<AccountDomainCandidateRow[]>([])
	const [resolution, setResolution] = useState<WebClientTypeResolution | null>(null)
	const [modalOpen, setModalOpen] = useState(false)
	const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
	const [probeError, setProbeError] = useState<string | null>(null)
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const orgGroupId = useId()

	const invoicingContextFor = useCallback(
		(
			next: WebClientTypeResolution | null,
			candidateRows: AccountDomainCandidateRow[],
		): AccountInvoicingUiContext | null => {
			if (next?.clientType !== 'account_client' || !next.customerAccountId) {
				return null
			}
			const row = verifyAccountIdAllowedForEmailDomain(candidateRows, next.customerAccountId)
			if (!row) {
				return null
			}
			return {
				accountDisplayName: row.name,
				defaultPoRequired: row.default_po_required,
			}
		},
		[],
	)

	const applyResolutionWithRows = useCallback(
		(next: WebClientTypeResolution | null, candidateRows: AccountDomainCandidateRow[]) => {
			setResolution(next)
			onClientTypeResolutionChange?.(next)
			const ctx = invoicingContextFor(next, candidateRows)
			onInvoicingContextChange?.(ctx)
			if (syncToBookingStore) {
				setClientTypeResolution(next)
				setAccountInvoicingContext(ctx)
			}
		},
		[
			invoicingContextFor,
			onClientTypeResolutionChange,
			onInvoicingContextChange,
			setAccountInvoicingContext,
			setClientTypeResolution,
			syncToBookingStore,
		],
	)

	const applyResolution = useCallback(
		(next: WebClientTypeResolution | null) => {
			applyResolutionWithRows(next, candidates)
		},
		[applyResolutionWithRows, candidates],
	)

	const pickOrgInline = useCallback(
		(accountId: string, rows: AccountDomainCandidateRow[]) => {
			setSelectedAccountId(accountId)
			applyResolutionWithRows(
				{
					clientType: 'account_client',
					customerAccountId: accountId,
					clientTypeSource: 'user_confirmed_domain_match',
				},
				rows,
			)
		},
		[applyResolutionWithRows],
	)

	useEffect(() => {
		// When the gate is disabled (e.g. `TripRequestBookingShell` + verified portal session —
		// `enabled={!portalHandoffActive}`), do **not** push `null` into `onClientTypeResolutionChange`.
		// The first line used to always `applyResolutionWithRows(null)`, which wiped
		// `portal_active_account_session` set from the booking store before submit (Q6 error).
		if (!enabled) {
			setProbe('idle')
			return
		}

		applyResolutionWithRows(null, [])
		setCandidates([])
		setModalOpen(false)
		setSelectedAccountId(null)
		setProbeError(null)

		if (!emailLooksValidForProbe(email)) {
			setProbe('idle')
			return
		}

		if (debounceRef.current) {
			clearTimeout(debounceRef.current)
		}

		setProbe('loading')
		debounceRef.current = setTimeout(() => {
			void (async () => {
				const trimmed = email.trim()
				const result = await resolveAccountsByEmailDomain(trimmed)

				if (!result.success) {
					setProbeError(result.error)
					setProbe('done')
					setCandidates([])
					applyResolutionWithRows(null, [])
					return
				}

				setProbeError(null)
				const accounts = result.accounts
				setCandidates(accounts)

				if (accounts.length === 0) {
					applyResolutionWithRows(
						{
							clientType: 'walk_in',
							customerAccountId: null,
							clientTypeSource: 'no_match',
						},
						[],
					)
					setModalOpen(false)
				} else if (isInline) {
					const firstId = accounts[0]?.id ?? null
					setSelectedAccountId(firstId)
					if (firstId) {
						applyResolutionWithRows(
							{
								clientType: 'account_client',
								customerAccountId: firstId,
								clientTypeSource: 'user_confirmed_domain_match',
							},
							accounts,
						)
					}
					setModalOpen(false)
				} else {
					applyResolutionWithRows(null, accounts)
					setSelectedAccountId(accounts[0]?.id ?? null)
					setModalOpen(true)
				}
				setProbe('done')
			})()
		}, DEBOUNCE_MS)

		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current)
			}
		}
	}, [email, enabled, applyResolutionWithRows, isInline])

	const closeModalAsDeclined = useCallback(() => {
		applyResolution({
			clientType: 'walk_in',
			customerAccountId: null,
			clientTypeSource: 'user_declined_domain_match',
		})
		setModalOpen(false)
	}, [applyResolution])

	useEffect(() => {
		if (!modalOpen) {
			return
		}
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				closeModalAsDeclined()
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [modalOpen, closeModalAsDeclined])

	const readyForSubmit = useMemo(() => {
		if (isInline) {
			if (!enabled || !emailLooksValidForProbe(email)) {
				return true
			}
			return probe !== 'loading'
		}
		if (!enabled || !emailLooksValidForProbe(email)) {
			return true
		}
		if (probe !== 'done') {
			return false
		}
		if (probeError) {
			return false
		}
		if (candidates.length === 0) {
			return resolution?.clientTypeSource === 'no_match'
		}
		return resolution !== null
	}, [isInline, enabled, email, probe, probeError, candidates.length, resolution])

	useEffect(() => {
		onReadyChange?.(readyForSubmit)
	}, [readyForSubmit, onReadyChange])

	const confirmAccount = useCallback(() => {
		if (candidates.length === 0) {
			return
		}
		const id =
			candidates.length === 1 ? candidates[0].id : selectedAccountId ?? candidates[0].id
		if (!id) {
			return
		}
		applyResolutionWithRows(
			{
				clientType: 'account_client',
				customerAccountId: id,
				clientTypeSource: 'user_confirmed_domain_match',
			},
			candidates,
		)
		setModalOpen(false)
	}, [candidates, selectedAccountId, applyResolutionWithRows])

	const ensureReadyForSubmit = useCallback(() => {
		if (isInline) {
			return true
		}
		if (readyForSubmit) {
			return true
		}
		if (probe === 'done' && !probeError && candidates.length > 0 && resolution === null) {
			setModalOpen(true)
		}
		return false
	}, [isInline, readyForSubmit, probe, probeError, candidates.length, resolution])

	useImperativeHandle(ref, () => ({ ensureReadyForSubmit }), [ensureReadyForSubmit])

	const domainLabel = domainFromEmail(email)

	return (
		<div className={cn('space-y-2', className)}>
			{probe === 'loading' && enabled && emailLooksValidForProbe(email) ? (
				<p className="text-xs text-slate-500" role="status" aria-live="polite">
					Checking your email for a matching business account…
				</p>
			) : null}
			{probeError ? (
				<p className="text-sm text-amber-800" role="alert" aria-live="assertive">
					{probeError}
				</p>
			) : null}

			{isInline &&
			probe === 'done' &&
			!probeError &&
			candidates.length > 0 &&
			resolution?.clientType === 'account_client' &&
			resolution.clientTypeSource === 'user_confirmed_domain_match' ? (
				<div
					className="rounded-lg border border-slate-200 bg-slate-50/90 p-4 text-sm text-slate-700 shadow-sm"
					role="region"
					aria-labelledby={`${orgGroupId}-title`}
					data-testid="booking-account-domain-inline"
				>
					<p id={`${orgGroupId}-title`} className="font-medium text-slate-900">
						Business account
					</p>
					<p className="mt-2 leading-relaxed">
						We recognise <span className="font-medium text-slate-900">{domainLabel}</span> as{' '}
						{candidates.length === 1 ? (
							<strong className="font-medium text-slate-900">{candidates[0].name}</strong>
						) : (
							<>one of the organisations listed below.</>
						)}
						. Your trip request may be linked to this account for billing. You can change the organisation or
						continue as a guest.
					</p>

					{candidates.length > 1 ? (
						<div className="mt-4" role="radiogroup" aria-label="Matching organisations">
							{candidates.map((c) => {
								const checked = (selectedAccountId ?? candidates[0]?.id) === c.id
								return (
									<label
										key={c.id}
										className={cn(
											'mr-2 mb-2 inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors',
											checked
												? 'border-[#25A89B] bg-[#25A89B]/10 text-slate-900'
												: 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
										)}
									>
										<input
											type="radio"
											className="h-4 w-4 shrink-0 border-slate-300 text-[#25A89B] focus:ring-[#25A89B]"
											name={`trip-org-${orgGroupId}`}
											checked={checked}
											data-testid={`booking-account-domain-org-${c.id}`}
											onChange={() => pickOrgInline(c.id, candidates)}
										/>
										<span>{c.name}</span>
									</label>
								)
							})}
						</div>
					) : null}

					<div className="mt-4">
						<Button
							type="button"
							variant="outline"
							size="sm"
							className="border-slate-300"
							data-testid="booking-account-domain-dismiss-guest"
							onClick={closeModalAsDeclined}
						>
							Book as a guest instead
						</Button>
					</div>
				</div>
			) : null}

			{!isInline && modalOpen && candidates.length > 0 ? (
				<div
					className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
					role="presentation"
					onMouseDown={(e) => {
						if (e.target === e.currentTarget) {
							closeModalAsDeclined()
						}
					}}
				>
					<div
						role="dialog"
						data-testid="booking-account-domain-dialog"
						aria-modal="true"
						aria-labelledby="account-domain-match-title"
						className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-xl"
					>
						<h2
							id="account-domain-match-title"
							className="text-lg font-semibold text-slate-900"
						>
							Business account
						</h2>
						<p className="mt-3 text-sm leading-relaxed text-slate-600">
							Looks like you might be booking for{' '}
							<strong className="font-medium text-slate-900">
								{candidates.length === 1 ? candidates[0].name : 'a listed organisation'}
							</strong>
							. Is this a business booking on their account?
						</p>

						{candidates.length > 1 ? (
							<div className="mt-4">
								<label htmlFor="account-domain-select" className="sr-only">
									Select organisation
								</label>
								<Select
									id="account-domain-select"
									value={selectedAccountId ?? ''}
									onChange={(e) => setSelectedAccountId(e.target.value || null)}
									className="w-full"
								>
									<option value="" disabled>
										Select an account…
									</option>
									{candidates.map((c) => (
										<option key={c.id} value={c.id}>
											{c.name}
										</option>
									))}
								</Select>
							</div>
						) : null}

						<div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
							<Button
								type="button"
								variant="outline"
								className="border-slate-300"
								onClick={closeModalAsDeclined}
							>
								No, personal booking
							</Button>
							<Button
								type="button"
								data-testid="booking-account-domain-confirm"
								className="bg-[#25A89B] hover:bg-[#1f8f83]"
								onClick={confirmAccount}
								disabled={
									candidates.length > 1 &&
									(!selectedAccountId ||
										!candidates.some((c) => c.id === selectedAccountId))
								}
							>
								{candidates.length === 1
									? `Yes, use ${candidates[0].name} account`
									: 'Yes, use this account'}
							</Button>
						</div>
					</div>
				</div>
			) : null}
		</div>
	)
})

BookingAccountDomainGate.displayName = 'BookingAccountDomainGate'
