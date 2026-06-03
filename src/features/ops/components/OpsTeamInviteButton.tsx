'use client'

import { useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'

import { inviteTeamMemberAction } from '@/actions/opsTeam'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { opsTeamCopy } from '@/features/ops/copy/ops-team-copy'
import { isOpsActionFailure, opsActionErrorMessage } from '@/lib/ops-action-result'
import type { ProfileRole } from '@/types/database.types'

const C = opsTeamCopy

export function OpsTeamInviteButton() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button
				type="button"
				variant="default"
				size="sm"
				className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
				onClick={() => setOpen(true)}
			>
				<UserPlus className="h-4 w-4" aria-hidden />
				{C.inviteButton}
			</Button>
			{open ? <InviteTeamDialog onClose={() => setOpen(false)} /> : null}
		</>
	)
}

function InviteTeamDialog({ onClose }: { onClose: () => void }) {
	const router = useRouter()
	const titleId = useId()
	const [fullName, setFullName] = useState('')
	const [email, setEmail] = useState('')
	const [phone, setPhone] = useState('')
	const [role, setRole] = useState<Extract<ProfileRole, 'admin' | 'dispatcher'>>('dispatcher')
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)
	const [pending, setPending] = useState(false)

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

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setError(null)
		setSuccess(null)

		const trimmedName = fullName.trim()
		const trimmedEmail = email.trim()
		const trimmedPhone = phone.trim()

		if (trimmedName.length < 2) {
			setError('Full name is required.')
			return
		}
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
			setError('Enter a valid email address.')
			return
		}

		setPending(true)
		let res: Awaited<ReturnType<typeof inviteTeamMemberAction>>
		try {
			res = await inviteTeamMemberAction({
				fullName: trimmedName,
				email: trimmedEmail,
				phone: trimmedPhone || null,
				role,
			})
		} finally {
			setPending(false)
		}

		if (!res.ok && isOpsActionFailure(res)) {
			setError(opsActionErrorMessage(res) ?? 'Could not send invitation.')
			return
		}

		setSuccess(C.inviteSuccess)
		setFullName('')
		setEmail('')
		setPhone('')
		setRole('dispatcher')
		router.refresh()
	}

	return (
		<div
			className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
			role="presentation"
			onMouseDown={(ev) => {
				if (ev.target === ev.currentTarget) onClose()
			}}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				className="w-full max-w-md overflow-y-auto rounded-lg border border-ops-border bg-ops-surface p-5 shadow-xl"
			>
				<h2 id={titleId} className="text-lg font-semibold text-ops-foreground">
					{C.inviteDialogTitle}
				</h2>
				<p className="mt-1 text-sm text-ops-muted">{C.inviteDialogDescription}</p>

				<form onSubmit={onSubmit} className="mt-4 space-y-4">
					{error ? (
						<Alert variant="destructive" className="border-red-900/60 bg-red-950/50 py-2 text-red-100">
							<AlertDescription className="text-xs">{error}</AlertDescription>
						</Alert>
					) : null}
					{success ? (
						<Alert className="border-emerald-700/60 bg-emerald-950/40 py-2 text-emerald-100">
							<AlertDescription className="text-xs">{success}</AlertDescription>
						</Alert>
					) : null}

					<div className="space-y-1.5">
						<Label htmlFor="team-full-name">{C.fieldFullName}</Label>
						<Input
							id="team-full-name"
							value={fullName}
							onChange={(ev) => setFullName(ev.target.value)}
							placeholder="Jane Doe"
							disabled={pending}
							autoComplete="name"
							required
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="team-email">{C.fieldEmail}</Label>
						<Input
							id="team-email"
							type="email"
							value={email}
							onChange={(ev) => setEmail(ev.target.value)}
							placeholder="staff@company.com"
							disabled={pending}
							autoComplete="email"
							required
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="team-phone">{C.fieldPhone}</Label>
						<Input
							id="team-phone"
							type="tel"
							value={phone}
							onChange={(ev) => setPhone(ev.target.value)}
							placeholder="+27..."
							disabled={pending}
							autoComplete="tel"
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="team-role">{C.fieldRole}</Label>
						<select
							id="team-role"
							value={role}
							onChange={(ev) =>
								setRole(ev.target.value === 'admin' ? 'admin' : 'dispatcher')
							}
							disabled={pending}
							className="flex h-10 w-full rounded-md border border-ops-border bg-ops-surface px-3 py-2 text-sm text-ops-foreground"
						>
							<option value="dispatcher">{C.roleDispatcher}</option>
							<option value="admin">{C.roleAdmin}</option>
						</select>
					</div>

					<div className="flex flex-wrap items-center justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose} disabled={pending}>
							{C.cancel}
						</Button>
						<Button type="submit" disabled={pending}>
							{pending ? C.sendingInvite : C.sendInvite}
						</Button>
					</div>
				</form>
			</div>
		</div>
	)
}
