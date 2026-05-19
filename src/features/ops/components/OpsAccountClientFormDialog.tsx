'use client'

import { useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
	createAccountClientAction,
	type CreateAccountClientSuccess,
	type UpdateAccountClientSuccess,
	updateAccountClientAction,
} from '@/actions/opsClients'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { opsClientsCopy } from '@/features/ops/copy/ops-clients-copy'
import type { OpsAccountClientRow } from '@/features/ops/types/ops-account-client'
import { isOpsActionFailure, opsActionErrorMessage } from '@/lib/ops-action-result'
import { buildOpsClientsHref } from '@/lib/ops-clients-url'

const STATUS_VALUES = ['active', 'on_hold', 'suspended', 'closed'] as const

function safeAccountStatus(status: string): (typeof STATUS_VALUES)[number] {
	return STATUS_VALUES.includes(status as (typeof STATUS_VALUES)[number])
		? (status as (typeof STATUS_VALUES)[number])
		: 'active'
}

function suggestSlug(name: string): string {
	const s = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 80)
	return s.length > 0 ? s : 'account'
}

function toDateInputValue(iso: string | null): string {
	if (!iso) return ''
	const d = iso.slice(0, 10)
	return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : ''
}

type SuccessPayload = {
	flow: 'create' | 'edit'
	accountId: string
	initialAdminInviteUrl?: string
	initialAdminInviteEmailWarning?: string
}

export type OpsAccountClientFormDialogProps =
	| { mode: 'create'; onClose: () => void }
	| { mode: 'edit'; account: OpsAccountClientRow; onClose: () => void }

export function OpsAccountClientFormDialog(props: OpsAccountClientFormDialogProps) {
	const { mode, onClose } = props
	const isEdit = mode === 'edit'
	const account = isEdit ? props.account : undefined

	const router = useRouter()
	const titleId = useId()

	const [name, setName] = useState(() => (isEdit ? account!.name : ''))
	const [slug, setSlug] = useState(() => (isEdit ? account!.slug : ''))
	const [domains, setDomains] = useState(() =>
		isEdit ? account!.authorized_email_domains.join(', ') : '',
	)
	const [creditTerms, setCreditTerms] = useState(() =>
		isEdit ? String(account!.credit_terms_days) : '0',
	)
	const [creditLimit, setCreditLimit] = useState(() =>
		isEdit && account!.credit_limit_zar != null && Number.isFinite(account!.credit_limit_zar)
			? String(account!.credit_limit_zar)
			: '',
	)
	const [status, setStatus] = useState(() => (isEdit ? safeAccountStatus(account!.status) : 'active'))
	const [contractStarts, setContractStarts] = useState(() =>
		isEdit ? toDateInputValue(account!.contract_starts_on) : '',
	)
	const [contractEnds, setContractEnds] = useState(() =>
		isEdit ? toDateInputValue(account!.contract_ends_on) : '',
	)
	const [adminEmail, setAdminEmail] = useState('')
	const [sendInvite, setSendInvite] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [busy, setBusy] = useState(false)
	const [success, setSuccess] = useState<SuccessPayload | null>(null)
	const [copied, setCopied] = useState(false)

	useEffect(() => {
		if (!isEdit || !account) return
		setName(account.name)
		setSlug(account.slug)
		setDomains(account.authorized_email_domains.join(', '))
		setCreditTerms(String(account.credit_terms_days))
		setCreditLimit(
			account.credit_limit_zar != null && Number.isFinite(account.credit_limit_zar)
				? String(account.credit_limit_zar)
				: '',
		)
		setStatus(safeAccountStatus(account.status))
		setContractStarts(toDateInputValue(account.contract_starts_on))
		setContractEnds(toDateInputValue(account.contract_ends_on))
		setError(null)
		setSuccess(null)
	}, [isEdit, account])

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				onClose()
			}
		}
		window.addEventListener('keydown', onKey)
		const original = document.body.style.overflow
		document.body.style.overflow = 'hidden'
		return () => {
			window.removeEventListener('keydown', onKey)
			document.body.style.overflow = original
		}
	}, [onClose])

	useEffect(() => {
		if (isEdit) return
		if (!slug && name.trim()) {
			setSlug(suggestSlug(name))
		}
	}, [isEdit, name, slug])

	useEffect(() => {
		if (!adminEmail.trim()) {
			setSendInvite(false)
		}
	}, [adminEmail])

	function finishSuccessAndClose(payload: SuccessPayload | null) {
		if (payload?.flow === 'create' && payload.accountId) {
			router.push(buildOpsClientsHref({ id: payload.accountId }), { scroll: false })
		}
		router.refresh()
		onClose()
	}

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setError(null)

		const trimmedName = name.trim()
		const trimmedSlug = slug.trim().toLowerCase()
		if (trimmedName.length < 2) {
			setError('Account name is required.')
			return
		}
		if (!/^[a-z0-9](?:[a-z0-9-]{0,79})$/.test(trimmedSlug)) {
			setError('Slug must use lowercase letters, numbers, or hyphens.')
			return
		}

		const parsedDomains = domains
			.split(/[\s,]+/)
			.map((d) => d.trim().toLowerCase())
			.filter(Boolean)

		const ct = Number.parseInt(creditTerms || '0', 10)
		const cl = creditLimit.trim() ? Number.parseFloat(creditLimit) : null

		if (isEdit) {
			if (!account?.id) {
				setError('Missing account.')
				return
			}
			const adminTrim = adminEmail.trim().toLowerCase()
			setBusy(true)
			const res = await updateAccountClientAction({
				accountId: account.id,
				name: trimmedName,
				slug: trimmedSlug,
				authorizedEmailDomains: parsedDomains,
				creditTermsDays: Number.isFinite(ct) ? ct : 0,
				creditLimitZar: cl != null && Number.isFinite(cl) ? cl : null,
				status: safeAccountStatus(status),
				contractStartsOn: contractStarts.trim() || null,
				contractEndsOn: contractEnds.trim() || null,
				initialAdminEmail: adminTrim.length > 0 ? adminTrim : '',
				sendInitialAdminInvite: sendInvite && adminTrim.length > 0,
			})
			setBusy(false)
			if (!res.ok && isOpsActionFailure(res)) {
				setError(opsActionErrorMessage(res) ?? 'Could not save changes.')
				return
			}
			const ok = res as UpdateAccountClientSuccess
			const payload: SuccessPayload = {
				flow: 'edit',
				accountId: account.id,
				initialAdminInviteUrl: ok.initialAdminInviteUrl,
				initialAdminInviteEmailWarning: ok.initialAdminInviteEmailWarning,
			}
			const needsFollowUp =
				Boolean(payload.initialAdminInviteUrl) || Boolean(payload.initialAdminInviteEmailWarning)
			if (needsFollowUp) {
				setSuccess(payload)
				return
			}
			finishSuccessAndClose(payload)
			return
		}

		const adminTrim = adminEmail.trim().toLowerCase()
		setBusy(true)
		const res = await createAccountClientAction({
			name: trimmedName,
			slug: trimmedSlug,
			authorizedEmailDomains: parsedDomains,
			creditTermsDays: Number.isFinite(ct) ? ct : 0,
			creditLimitZar: cl != null && Number.isFinite(cl) ? cl : null,
			initialAdminEmail: adminTrim.length > 0 ? adminTrim : '',
			sendInitialAdminInvite: sendInvite && adminTrim.length > 0,
		})
		setBusy(false)

		if (!res.ok && isOpsActionFailure(res)) {
			setError(opsActionErrorMessage(res) ?? 'Could not create account.')
			return
		}

		const ok = res as CreateAccountClientSuccess
		const payload: SuccessPayload = {
			flow: 'create',
			accountId: ok.accountId,
			initialAdminInviteUrl: ok.initialAdminInviteUrl,
			initialAdminInviteEmailWarning: ok.initialAdminInviteEmailWarning,
		}
		const needsFollowUp =
			Boolean(payload.initialAdminInviteUrl) || Boolean(payload.initialAdminInviteEmailWarning)
		if (needsFollowUp) {
			setSuccess(payload)
			return
		}
		finishSuccessAndClose(payload)
	}

	async function copyInviteUrl(url: string) {
		try {
			await navigator.clipboard.writeText(url)
			setCopied(true)
			window.setTimeout(() => setCopied(false), 2000)
		} catch {
			setCopied(false)
		}
	}

	const idSuffix = isEdit ? account!.id.slice(0, 8) : 'new'

	return (
		<div
			className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose()
			}}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				className="w-full max-w-md overflow-y-auto rounded-lg border border-ops-border bg-ops-surface p-5 shadow-xl"
			>
				{success ? (
					<>
						<h2 id={titleId} className="text-lg font-semibold text-ops-foreground">
							{success.flow === 'edit'
								? opsClientsCopy.formDialogEditSuccessTitle
								: opsClientsCopy.formDialogCreateSuccessTitle}
						</h2>
						<p className="mt-1 text-sm text-ops-muted">
							{success.flow === 'edit'
								? opsClientsCopy.formDialogEditSuccessDescription
								: opsClientsCopy.formDialogCreateSuccessDescription}
						</p>
						<div className="mt-4 space-y-3">
							{success.initialAdminInviteEmailWarning ? (
								<Alert className="border-amber-900/40 bg-amber-950/40 py-2 text-amber-100">
									<AlertDescription className="text-xs">
										{success.flow === 'edit'
											? opsClientsCopy.editInviteEmailWarning(success.initialAdminInviteEmailWarning)
											: opsClientsCopy.createInviteEmailWarning(
													success.initialAdminInviteEmailWarning,
												)}
									</AlertDescription>
								</Alert>
							) : null}
							{success.initialAdminInviteUrl ? (
								<div className="space-y-2">
									<p className="text-xs font-medium text-ops-foreground">
										{opsClientsCopy.createInviteLinkHeading}
									</p>
									<p className="text-xs text-ops-muted">{opsClientsCopy.createSendInviteHint}</p>
									<div className="flex gap-2">
										<Input readOnly value={success.initialAdminInviteUrl} className="font-mono text-xs" />
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="shrink-0"
											onClick={() => copyInviteUrl(success.initialAdminInviteUrl!)}
										>
											{copied ? opsClientsCopy.createInviteLinkCopied : opsClientsCopy.createInviteLinkCopy}
										</Button>
									</div>
								</div>
							) : null}
						</div>
						<div className="mt-6 flex justify-end gap-2">
							<Button type="button" onClick={() => finishSuccessAndClose(success)}>
								Done
							</Button>
						</div>
					</>
				) : (
					<>
						<h2 id={titleId} className="text-lg font-semibold text-ops-foreground">
							{isEdit ? opsClientsCopy.formDialogEditTitle : opsClientsCopy.formDialogCreateTitle}
						</h2>
						<p className="mt-1 text-sm text-ops-muted">
							{isEdit ? opsClientsCopy.formDialogEditDescription : opsClientsCopy.formDialogCreateDescription}
						</p>

						<form onSubmit={onSubmit} className="mt-4 space-y-4">
							{error ? (
								<Alert variant="destructive" className="border-red-900/60 bg-red-950/50 py-2 text-red-100">
									<AlertDescription className="text-xs">{error}</AlertDescription>
								</Alert>
							) : null}

							<div className="space-y-1.5">
								<Label htmlFor={`ac-name-${idSuffix}`}>Account name</Label>
								<Input
									id={`ac-name-${idSuffix}`}
									value={name}
									onChange={(e) => setName(e.target.value)}
									disabled={busy}
									required
								/>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor={`ac-slug-${idSuffix}`}>Slug</Label>
								<Input
									id={`ac-slug-${idSuffix}`}
									value={slug}
									onChange={(e) => setSlug(e.target.value)}
									disabled={busy}
									required
									placeholder="acme-corp"
								/>
								<p className="text-xs text-ops-muted">
									Used as a unique key. Lowercase letters, numbers, and hyphens only.
								</p>
							</div>

							<div className="space-y-1.5">
								<Label htmlFor={`ac-domains-${idSuffix}`}>Authorised email domains (optional)</Label>
								<Input
									id={`ac-domains-${idSuffix}`}
									value={domains}
									onChange={(e) => setDomains(e.target.value)}
									disabled={busy}
									placeholder="acme.com, acmecorp.com"
								/>
								<p className="text-xs text-ops-muted">
									Members signing up with these domains can be auto-linked.
								</p>
							</div>

							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<Label htmlFor={`ac-terms-${idSuffix}`}>Credit terms (days)</Label>
									<Input
										id={`ac-terms-${idSuffix}`}
										type="number"
										min={0}
										value={creditTerms}
										onChange={(e) => setCreditTerms(e.target.value)}
										disabled={busy}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor={`ac-limit-${idSuffix}`}>Credit limit (ZAR)</Label>
									<Input
										id={`ac-limit-${idSuffix}`}
										type="number"
										min={0}
										value={creditLimit}
										onChange={(e) => setCreditLimit(e.target.value)}
										disabled={busy}
										placeholder="Optional"
									/>
								</div>
							</div>

							{isEdit ? (
								<>
									<div className="space-y-1.5">
										<Label htmlFor={`ac-status-${idSuffix}`}>Account status</Label>
										<select
											id={`ac-status-${idSuffix}`}
											value={status}
											onChange={(e) => setStatus(safeAccountStatus(e.target.value))}
											disabled={busy}
											className="flex h-9 w-full rounded-md border border-ops-border bg-ops-canvas px-2 text-sm text-ops-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops"
										>
											{STATUS_VALUES.map((v) => (
												<option key={v} value={v}>
													{opsClientsCopy.statusOption(v)}
												</option>
											))}
										</select>
									</div>
									<div className="grid grid-cols-2 gap-3">
										<div className="space-y-1.5">
											<Label htmlFor={`ac-cs-${idSuffix}`}>Contract starts</Label>
											<Input
												id={`ac-cs-${idSuffix}`}
												type="date"
												value={contractStarts}
												onChange={(e) => setContractStarts(e.target.value)}
												disabled={busy}
											/>
										</div>
										<div className="space-y-1.5">
											<Label htmlFor={`ac-ce-${idSuffix}`}>Contract ends</Label>
											<Input
												id={`ac-ce-${idSuffix}`}
												type="date"
												value={contractEnds}
												onChange={(e) => setContractEnds(e.target.value)}
												disabled={busy}
											/>
										</div>
									</div>
								</>
							) : null}

							<div className="rounded-md border border-ops-border bg-ops-canvas/50 p-3">
								<p className="text-xs font-semibold uppercase tracking-wide text-ops-muted">
									{opsClientsCopy.createInitialAdminHeading}
								</p>
								<div className="mt-3 space-y-1.5">
									<Label htmlFor={`ac-admin-email-${idSuffix}`}>
										{opsClientsCopy.createInitialAdminEmailLabel}
									</Label>
									<Input
										id={`ac-admin-email-${idSuffix}`}
										type="email"
										autoComplete="email"
										value={adminEmail}
										onChange={(e) => setAdminEmail(e.target.value)}
										disabled={busy}
										placeholder="ops@client.com"
									/>
								</div>
								<div className="mt-3 flex items-start gap-2">
									<input
										id={`ac-send-invite-${idSuffix}`}
										type="checkbox"
										className="mt-0.5 h-4 w-4 rounded border-ops-border bg-ops-canvas text-primary focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas"
										checked={sendInvite}
										disabled={busy || !adminEmail.trim()}
										onChange={(e) => setSendInvite(e.target.checked)}
									/>
									<div>
										<label htmlFor={`ac-send-invite-${idSuffix}`} className="text-sm text-ops-foreground">
											{opsClientsCopy.createSendInviteLabel}
										</label>
										<p className="mt-0.5 text-xs text-ops-muted">{opsClientsCopy.createSendInviteHint}</p>
									</div>
								</div>
							</div>

							<div className="flex items-center justify-end gap-2 pt-2">
								<Button type="button" variant="outline" onClick={onClose} disabled={busy}>
									Cancel
								</Button>
								<Button type="submit" disabled={busy}>
									{busy
										? isEdit
											? opsClientsCopy.formDialogSavingEdit
											: opsClientsCopy.formDialogSavingCreate
										: isEdit
											? opsClientsCopy.formDialogSubmitEdit
											: opsClientsCopy.formDialogSubmitCreate}
								</Button>
							</div>
						</form>
					</>
				)}
			</div>
		</div>
	)
}
