'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useId, useState } from 'react'

import {
	identifyClientForBookingAction,
	searchCustomerAccountsForOps,
} from '@/actions/opsIdentifyClient'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isOpsActionFailure, opsActionCorrelationId, opsActionErrorMessage } from '@/lib/ops-action-result'
import { cn } from '@/lib/utils'

const PAID_TOOLTIP =
	"Paid walk-ins can't be retro-linked. Reason: finance reconciliation."

function suggestSlug(name: string): string {
	const s = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 80)
	return s.length > 0 ? s : 'account'
}

type IdentifyClientDialogProps = {
	bookingId: string
	paymentStatus: string | null
	clientType: string | null
	linkedAccountName: string | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function IdentifyClientDialog({
	bookingId,
	paymentStatus,
	clientType,
	linkedAccountName,
	open,
	onOpenChange,
}: IdentifyClientDialogProps) {
	const router = useRouter()
	const titleId = useId()
	const paid = paymentStatus === 'paid'
	const isAccount = clientType === 'account_client'

	const [error, setError] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)

	const [searchQ, setSearchQ] = useState('')
	const [searchResults, setSearchResults] = useState<{ id: string; name: string; status: string }[]>(
		[],
	)
	const [searchLoading, setSearchLoading] = useState(false)
	const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)

	const [newName, setNewName] = useState('')
	const [newSlug, setNewSlug] = useState('')

	const resetForm = useCallback(() => {
		setError(null)
		setSearchQ('')
		setSearchResults([])
		setSelectedAccountId(null)
		setNewName('')
		setNewSlug('')
	}, [])

	useEffect(() => {
		if (!open) {
			resetForm()
		}
	}, [open, resetForm])

	useEffect(() => {
		if (!open || paid || searchQ.trim().length < 2) {
			setSearchResults([])
			return
		}
		const t = window.setTimeout(() => {
			void (async () => {
				setSearchLoading(true)
				const res = await searchCustomerAccountsForOps({ q: searchQ.trim() })
				setSearchLoading(false)
				if (!res.ok && isOpsActionFailure(res)) {
					setSearchResults([])
					return
				}
				if (res.ok) {
					setSearchResults(res.accounts)
				}
			})()
		}, 350)
		return () => window.clearTimeout(t)
	}, [searchQ, open, paid])

	async function onLinkExisting() {
		if (!selectedAccountId) {
			setError('Select an account from the list.')
			return
		}
		setError(null)
		setBusy(true)
		const res = await identifyClientForBookingAction({
			bookingId,
			intent: 'link',
			customerAccountId: selectedAccountId,
		})
		setBusy(false)
		if (!res.ok && isOpsActionFailure(res)) {
			const ref = opsActionCorrelationId(res)
			const suffix = ref ? ` Reference: ${ref.slice(0, 8)}…` : ''
			setError(`${opsActionErrorMessage(res)}${suffix}`)
			return
		}
		if (res.ok && 'warning' in res && res.warning) {
			console.warn('identifyClient:', res.warning)
		}
		router.refresh()
		onOpenChange(false)
	}

	async function onCreateAndLink() {
		const name = newName.trim()
		const slug = newSlug.trim() || suggestSlug(name)
		if (name.length < 1) {
			setError('Enter an account name.')
			return
		}
		setError(null)
		setBusy(true)
		const res = await identifyClientForBookingAction({
			bookingId,
			intent: 'create_and_link',
			account: { name, slug },
		})
		setBusy(false)
		if (!res.ok && isOpsActionFailure(res)) {
			const ref = opsActionCorrelationId(res)
			const suffix = ref ? ` Reference: ${ref.slice(0, 8)}…` : ''
			setError(`${opsActionErrorMessage(res)}${suffix}`)
			return
		}
		if (res.ok && 'warning' in res && res.warning) {
			console.warn('identifyClient:', res.warning)
		}
		router.refresh()
		onOpenChange(false)
	}

	async function onUnlink() {
		setError(null)
		setBusy(true)
		const res = await identifyClientForBookingAction({
			bookingId,
			intent: 'unlink',
		})
		setBusy(false)
		if (!res.ok && isOpsActionFailure(res)) {
			const ref = opsActionCorrelationId(res)
			const suffix = ref ? ` Reference: ${ref.slice(0, 8)}…` : ''
			setError(`${opsActionErrorMessage(res)}${suffix}`)
			return
		}
		if (res.ok && 'warning' in res && res.warning) {
			console.warn('identifyClient:', res.warning)
		}
		router.refresh()
		onOpenChange(false)
	}

	useEffect(() => {
		if (!open) {
			return
		}
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				onOpenChange(false)
			}
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [open, onOpenChange])

	if (!open) {
		return null
	}

	return (
		<div
			className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) {
					onOpenChange(false)
				}
			}}
		>
			<div
				role="dialog"
				data-testid="ops-identify-client-dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				className="max-h-[min(90vh,40rem)] w-full max-w-lg overflow-y-auto rounded-lg border border-ops-border bg-ops-surface p-5 shadow-xl"
			>
				<h2 id={titleId} className="text-lg font-semibold text-ops-foreground">
					Identify client
				</h2>
				<p className="mt-1 text-sm text-ops-muted">
					Correct account linkage before payment settles. Paid bookings are locked.
				</p>

				{paid ? (
					<p className="mt-4 text-sm text-amber-200/95">{PAID_TOOLTIP}</p>
				) : (
					<div className="mt-4 space-y-6">
						{error ? (
							<Alert variant="destructive" className="border-red-900/60 bg-red-950/50 py-2 text-red-100">
								<AlertDescription className="text-xs">{error}</AlertDescription>
							</Alert>
						) : null}
						{isAccount && linkedAccountName ? (
							<p className="text-sm text-ops-foreground">
								Currently linked:{' '}
								<strong className="font-medium">{linkedAccountName}</strong>
							</p>
						) : null}

						<section className="space-y-2">
							<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
								Link to existing account
							</h3>
							<Label htmlFor="identify-search">Search by name</Label>
							<Input
								id="identify-search"
								value={searchQ}
								onChange={(e) => setSearchQ(e.target.value)}
								placeholder="Type at least 2 characters…"
								disabled={busy}
								autoComplete="off"
							/>
							{searchLoading ? (
								<p className="text-xs text-ops-muted">Searching…</p>
							) : null}
							{searchResults.length > 0 ? (
								<ul className="max-h-40 overflow-y-auto rounded border border-ops-border">
									{searchResults.map((a) => (
										<li key={a.id}>
											<button
												type="button"
												className={cn(
													'flex w-full flex-col items-start px-3 py-2 text-left text-sm transition-colors',
													selectedAccountId === a.id
														? 'bg-primary/15 text-ops-foreground'
														: 'hover:bg-ops-surface-hover',
												)}
												onClick={() => setSelectedAccountId(a.id)}
											>
												<span>{a.name}</span>
												<span className="text-xs text-ops-muted">Status: {a.status}</span>
											</button>
										</li>
									))}
								</ul>
							) : null}
							<Button
								type="button"
								size="sm"
								disabled={busy || !selectedAccountId}
								onClick={() => void onLinkExisting()}
							>
								{busy ? 'Saving…' : 'Apply link'}
							</Button>
						</section>

						<section className="space-y-2 border-t border-ops-border pt-4">
							<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
								Create new account &amp; link
							</h3>
							<div>
								<Label htmlFor="new-acc-name">Organisation name</Label>
								<Input
									id="new-acc-name"
									value={newName}
									onChange={(e) => setNewName(e.target.value)}
									onBlur={() => {
										if (!newSlug.trim() && newName.trim()) {
											setNewSlug(suggestSlug(newName))
										}
									}}
									disabled={busy}
								/>
							</div>
							<div>
								<Label htmlFor="new-acc-slug">URL slug (unique)</Label>
								<Input
									id="new-acc-slug"
									value={newSlug}
									onChange={(e) => setNewSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
									placeholder="e.g. acme-logistics"
									disabled={busy}
									className="font-mono text-xs"
								/>
								<p className="mt-1 text-xs text-ops-muted">Lowercase, hyphens; auto-filled from name.</p>
							</div>
							<Button
								type="button"
								size="sm"
								variant="secondary"
								disabled={busy || newName.trim().length < 1}
								onClick={() => void onCreateAndLink()}
							>
								{busy ? 'Saving…' : 'Create & link'}
							</Button>
						</section>

						{isAccount ? (
							<section className="border-t border-ops-border pt-4">
								<h3 className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
									Revert to walk-in
								</h3>
								<p className="mb-2 text-xs text-ops-muted">
									Clears account linkage and snapshot. Use when the booking should not be on a
									corporate account.
								</p>
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="border-amber-800/60 text-amber-100 hover:bg-amber-950/40"
									disabled={busy}
									onClick={() => void onUnlink()}
								>
									{busy ? 'Saving…' : 'Revert to walk-in'}
								</Button>
							</section>
						) : null}
					</div>
				)}

				<div className="mt-6 flex justify-end gap-2 border-t border-ops-border pt-4">
					<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
				</div>
			</div>
		</div>
	)
}
