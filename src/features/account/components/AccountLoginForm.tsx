'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { accountAuthSurfacesCopy } from '@/features/account/copy/account-auth-surfaces-copy'
import { createClientClient } from '@/lib/supabase/client'

const accountAuthInputClassName =
	'mt-1 min-h-11 border-account-border bg-account-surface text-account-foreground placeholder:text-account-muted focus-visible:border-account-border focus-visible:ring-account'

const accountAccentSubmitClassName =
	'min-h-11 w-full bg-account-accent text-account-accent-foreground hover:bg-account-accent/90 focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas'

export function AccountLoginForm({ nextPath }: { nextPath: string }) {
	const router = useRouter()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [err, setErr] = useState('')
	const [loading, setLoading] = useState(false)

	async function onSubmit(e: React.FormEvent) {
		e.preventDefault()
		setLoading(true)
		setErr('')
		const supabase = createClientClient()
		const { error } = await supabase.auth.signInWithPassword({ email, password })
		setLoading(false)
		if (error) {
			setErr(error.message)
			return
		}
		router.push(nextPath)
		router.refresh()
	}

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div>
				<label htmlFor="account-email" className="block text-sm font-medium text-account-foreground">
					{accountAuthSurfacesCopy.login.emailLabel}
				</label>
				<Input
					id="account-email"
					name="email"
					type="email"
					autoComplete="username"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className={accountAuthInputClassName}
				/>
			</div>
			<div>
				<label htmlFor="account-password" className="block text-sm font-medium text-account-foreground">
					{accountAuthSurfacesCopy.login.passwordLabel}
				</label>
				<Input
					id="account-password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className={accountAuthInputClassName}
				/>
			</div>
			{err ? (
				<p className="text-sm text-destructive" role="alert">
					{err}
				</p>
			) : null}
			<Button type="submit" disabled={loading} className={accountAccentSubmitClassName}>
				{loading ? accountAuthSurfacesCopy.login.submitPending : accountAuthSurfacesCopy.login.submit}
			</Button>
		</form>
	)
}
