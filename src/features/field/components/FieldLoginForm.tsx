'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { createClientClient } from '@/lib/supabase/client'

export function FieldLoginForm({ nextPath }: { nextPath: string }) {
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
				<label htmlFor="field-email" className="block text-sm font-medium text-slate-300">
					Email
				</label>
				<input
					id="field-email"
					name="email"
					type="email"
					autoComplete="username"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className="mt-1 w-full min-h-11 rounded-md border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-amber-500 focus:ring-2"
				/>
			</div>
			<div>
				<label htmlFor="field-password" className="block text-sm font-medium text-slate-300">
					Password
				</label>
				<input
					id="field-password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className="mt-1 w-full min-h-11 rounded-md border border-slate-600 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none ring-amber-500 focus:ring-2"
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
				className="w-full min-h-11 rounded-md bg-amber-600 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-500 disabled:opacity-60"
			>
				{loading ? 'Signing in…' : 'Sign in'}
			</button>
		</form>
	)
}
