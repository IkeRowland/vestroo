'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { opsSetPasswordCopy } from '@/features/ops/copy/ops-set-password-copy'
import { cn } from '@/lib/utils'
import { createClientClient } from '@/lib/supabase/client'

const C = opsSetPasswordCopy

const MIN_PASSWORD_LENGTH = 8

export function OpsSetPasswordForm() {
	const router = useRouter()
	const [password, setPassword] = useState('')
	const [confirm, setConfirm] = useState('')
	const [err, setErr] = useState('')
	const [loading, setLoading] = useState(false)

	const inputChrome =
		'mt-1 min-h-11 border-ops-border bg-ops-canvas text-sm font-normal text-ops-foreground shadow-sm placeholder:font-normal placeholder:text-ops-muted focus-visible:border-ops-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ops-surface'

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setErr('')

		if (password.length < MIN_PASSWORD_LENGTH) {
			setErr(C.errorWeak)
			return
		}
		if (password !== confirm) {
			setErr(C.errorMismatch)
			return
		}

		setLoading(true)
		const supabase = createClientClient()
		const { error } = await supabase.auth.updateUser({ password })
		setLoading(false)

		if (error) {
			setErr(error.message || C.errorGeneric)
			return
		}

		router.replace('/ops')
		router.refresh()
	}

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div>
				<label htmlFor="ops-new-password" className="block text-sm font-medium text-ops-foreground">
					{C.fieldNewPassword}
				</label>
				<Input
					id="ops-new-password"
					name="new_password"
					type="password"
					autoComplete="new-password"
					required
					minLength={MIN_PASSWORD_LENGTH}
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className={inputChrome}
				/>
			</div>
			<div>
				<label htmlFor="ops-confirm-password" className="block text-sm font-medium text-ops-foreground">
					{C.fieldConfirmPassword}
				</label>
				<Input
					id="ops-confirm-password"
					name="confirm_password"
					type="password"
					autoComplete="new-password"
					required
					minLength={MIN_PASSWORD_LENGTH}
					value={confirm}
					onChange={(e) => setConfirm(e.target.value)}
					className={inputChrome}
				/>
			</div>
			{err ? (
				<p className="text-sm text-ops-danger" role="alert">
					{err}
				</p>
			) : null}
			<Button
				type="submit"
				disabled={loading}
				className={cn(
					'min-h-11 w-full border-0 bg-ops-accent text-ops-accent-foreground shadow-sm',
					'hover:bg-ops-accent/90',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ops-surface',
				)}
			>
				{loading ? C.submitPending : C.submit}
			</Button>
			<p className="text-center text-sm text-ops-muted">
				<Link
					href={C.backToLoginHref}
					className="font-medium text-ops-accent underline-offset-4 hover:text-ops-accent/90 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ops-surface"
				>
					{C.backToLogin}
				</Link>
			</p>
		</form>
	)
}
