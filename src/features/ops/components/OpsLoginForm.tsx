'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { opsLoginCopy } from '@/features/ops/copy/ops-login-copy'
import { cn } from '@/lib/utils'
import { createClientClient } from '@/lib/supabase/client'

const C = opsLoginCopy

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

	const inputChrome =
		'mt-1 min-h-11 border-ops-border bg-ops-canvas text-sm font-normal text-ops-foreground shadow-sm placeholder:font-normal placeholder:text-ops-muted focus-visible:border-ops-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ops-surface'

	return (
		<form onSubmit={onSubmit} className="space-y-4">
			<div>
				<label htmlFor="ops-email" className="block text-sm font-medium text-ops-foreground">
					{C.fieldEmail}
				</label>
				<Input
					id="ops-email"
					name="email"
					type="email"
					autoComplete="username"
					required
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					className={inputChrome}
				/>
			</div>
			<div>
				<label htmlFor="ops-password" className="block text-sm font-medium text-ops-foreground">
					{C.fieldPassword}
				</label>
				<Input
					id="ops-password"
					name="password"
					type="password"
					autoComplete="current-password"
					required
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					className={inputChrome}
				/>
				<div className="mt-2 flex justify-end">
					<Link
						href={C.forgotPasswordHref}
						className="text-sm font-medium text-ops-accent underline-offset-4 hover:text-ops-accent/90 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ops-surface"
					>
						{C.forgotPassword}
					</Link>
				</div>
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
		</form>
	)
}
