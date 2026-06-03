'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'

import { opsAuthCallbackCopy } from '@/features/ops/copy/ops-auth-callback-copy'
import { OpsLoadingRegion } from '@/features/ops/components/OpsLoadingRegion'
import { createClientClient } from '@/lib/supabase/client'

const C = opsAuthCallbackCopy

function parseHashParams(hash: string): URLSearchParams {
	const raw = hash.startsWith('#') ? hash.slice(1) : hash
	return new URLSearchParams(raw)
}

function opsNextPath(next: string | null): string {
	return next && next.startsWith('/ops') ? next : '/ops'
}

export function OpsAuthCallbackClient() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		let cancelled = false

		async function complete() {
			const supabase = createClientClient()
			const code = searchParams.get('code')

			if (code) {
				const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
				if (cancelled) return
				if (exchangeErr) {
					setError(exchangeErr.message)
					return
				}
				window.history.replaceState(null, '', window.location.pathname)
				const dest = opsNextPath(searchParams.get('next'))
				router.replace(dest)
				router.refresh()
				return
			}

			const hash = window.location.hash
			if (!hash || !hash.includes('access_token')) {
				setError(C.errorMissingTokens)
				return
			}

			const params = parseHashParams(hash)
			const access_token = params.get('access_token')
			const refresh_token = params.get('refresh_token')
			const type = params.get('type')

			if (!access_token || !refresh_token) {
				setError(C.errorMissingTokens)
				return
			}

			const { error: sessionErr } = await supabase.auth.setSession({
				access_token,
				refresh_token,
			})

			window.history.replaceState(null, '', window.location.pathname + window.location.search)

			if (cancelled) return
			if (sessionErr) {
				setError(sessionErr.message)
				return
			}

			if (type === 'invite' || type === 'recovery') {
				router.replace('/ops/auth/set-password')
				router.refresh()
				return
			}

			router.replace(opsNextPath(searchParams.get('next')))
			router.refresh()
		}

		void complete()

		return () => {
			cancelled = true
		}
	}, [router, searchParams])

	if (error) {
		return (
			<div className="text-center">
				<p className="text-sm font-medium text-ops-foreground" role="alert">
					{C.errorTitle}
				</p>
				<p className="mt-2 text-sm text-ops-danger">{error}</p>
				<p className="mt-4">
					<Link
						href={C.backToLoginHref}
						className="text-sm font-medium text-ops-accent underline-offset-4 hover:text-ops-accent/90 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ops-surface"
					>
						{C.backToLogin}
					</Link>
				</p>
			</div>
		)
	}

	return (
		<div className="flex justify-center py-4">
			<OpsLoadingRegion label={C.loading} />
		</div>
	)
}
