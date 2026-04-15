'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { createClientClient } from '@/lib/supabase/client'

export function OpsLoginForm({ nextPath }: { nextPath: string }) {
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
				<label htmlFor="ops-email" className="block text-sm font-medium text-foreground">
					Email
				</label>
				<Input
					id="ops-email"
					name="email"
					type="email"
					autoComplete="username"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className="mt-1 min-h-11"
				/>
			</div>
			<div>
				<label htmlFor="ops-password" className="block text-sm font-medium text-foreground">
					Password
				</label>
				<Input
					id="ops-password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className="mt-1 min-h-11"
				/>
			</div>
			{err ? (
				<p className="text-sm text-destructive" role="alert">
					{err}
				</p>
			) : null}
			<Button type="submit" disabled={loading} className="min-h-11 w-full">
				{loading ? 'Signing in…' : 'Sign in'}
			</Button>
		</form>
	)
}
