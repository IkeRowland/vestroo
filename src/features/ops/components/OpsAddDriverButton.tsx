'use client'

import { useEffect, useId, useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'

import { createDriverWithoutInviteAction, inviteDriverAction } from '@/actions/opsDrivers'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isOpsActionFailure, opsActionErrorMessage } from '@/lib/ops-action-result'

export function OpsAddDriverButton() {
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
				Add driver
			</Button>
			{open ? <AddDriverDialog onClose={() => setOpen(false)} /> : null}
		</>
	)
}

function AddDriverDialog({ onClose }: { onClose: () => void }) {
	const router = useRouter()
	const titleId = useId()
	const [fullName, setFullName] = useState('')
	const [email, setEmail] = useState('')
	const [phone, setPhone] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [pending, setPending] = useState<'invite' | 'direct' | null>(null)
	const [success, setSuccess] = useState<string | null>(null)
	const busy = pending !== null

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

	function parseForm(): { fullName: string; email: string; phone: string | null } | null {
		const trimmedName = fullName.trim()
		const trimmedEmail = email.trim()
		const trimmedPhone = phone.trim()

		if (trimmedName.length < 2) {
			setError('Full name is required.')
			return null
		}
		if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail)) {
			setError('Enter a valid email address.')
			return null
		}
		return { fullName: trimmedName, email: trimmedEmail, phone: trimmedPhone || null }
	}

	async function onSubmitInvite(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault()
		setError(null)
		setSuccess(null)

		const payload = parseForm()
		if (!payload) {
			return
		}

		setPending('invite')
		let res: Awaited<ReturnType<typeof inviteDriverAction>>
		try {
			res = await inviteDriverAction(payload)
		} finally {
			setPending(null)
		}

		if (!res.ok && isOpsActionFailure(res)) {
			setError(opsActionErrorMessage(res) ?? 'Could not invite the driver.')
			return
		}
		setSuccess('Invite sent. The driver will receive an email to set up their account.')
		setFullName('')
		setEmail('')
		setPhone('')
		router.refresh()
	}

	async function onAddWithoutInvite() {
		setError(null)
		setSuccess(null)

		const payload = parseForm()
		if (!payload) {
			return
		}

		setPending('direct')
		let res: Awaited<ReturnType<typeof createDriverWithoutInviteAction>>
		try {
			res = await createDriverWithoutInviteAction(payload)
		} finally {
			setPending(null)
		}

		if (!res.ok && isOpsActionFailure(res)) {
			setError(opsActionErrorMessage(res) ?? 'Could not add the driver.')
			return
		}
		setSuccess(
			'Driver added. No email was sent — they can use Forgot password on the sign-in page when they need access.',
		)
		setFullName('')
		setEmail('')
		setPhone('')
		router.refresh()
	}

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
				<h2 id={titleId} className="text-lg font-semibold text-ops-foreground">
					Add driver
				</h2>
				<p className="mt-1 text-sm text-ops-muted">
					Send an invite so they receive email to set a password, or add them as a driver now without email
					(they can use Forgot password on sign-in when ready).
				</p>

				<form onSubmit={onSubmitInvite} className="mt-4 space-y-4">
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
						<Label htmlFor="driver-full-name">Full name</Label>
						<Input
							id="driver-full-name"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							placeholder="Jane Doe"
							disabled={busy}
							autoComplete="name"
							required
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="driver-email">Email</Label>
						<Input
							id="driver-email"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="driver@company.com"
							disabled={busy}
							autoComplete="email"
							required
						/>
					</div>

					<div className="space-y-1.5">
						<Label htmlFor="driver-phone">Phone (optional)</Label>
						<Input
							id="driver-phone"
							type="tel"
							value={phone}
							onChange={(e) => setPhone(e.target.value)}
							placeholder="+27..."
							disabled={busy}
							autoComplete="tel"
						/>
					</div>

					<div className="flex flex-wrap items-center justify-end gap-2 pt-2">
						<Button type="button" variant="outline" onClick={onClose} disabled={busy}>
							Cancel
						</Button>
						<Button
							type="button"
							variant="outline"
							disabled={busy}
							onClick={() => void onAddWithoutInvite()}
						>
							{pending === 'direct' ? 'Adding…' : 'Add without email'}
						</Button>
						<Button type="submit" disabled={busy}>
							{pending === 'invite' ? 'Sending…' : 'Send invite'}
						</Button>
					</div>
				</form>
			</div>
		</div>
	)
}
