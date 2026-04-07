'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
				<label htmlFor="ops-email" className="block text-sm font-medium text-zinc-300">
					Email
				</label>
				<input
					id="ops-email"
					name="email"
					type="email"
					autoComplete="username"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none ring-emerald-600 focus:ring-2 min-h-11"
				/>
			</div>
			<div>
				<label htmlFor="ops-password" className="block text-sm font-medium text-zinc-300">
					Password
				</label>
				<input
					id="ops-password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none ring-emerald-600 focus:ring-2 min-h-11"
				/>
			</div>
			{err ? (
				<p className="text-sm text-red-400" role="alert">
					{err}
				</p>
			) : null}
			<button
				type="submit"
				disabled={loading}
				className="w-full min-h-11 rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 disabled:opacity-60"
			>
				{loading ? 'Signing in…' : 'Sign in'}
			</button>
		</form>
	)
}
