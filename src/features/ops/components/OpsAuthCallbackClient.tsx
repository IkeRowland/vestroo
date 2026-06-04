'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

import { opsAuthCallbackCopy } from '@/features/ops/copy/ops-auth-callback-copy'
import { OpsLoadingRegion } from '@/features/ops/components/OpsLoadingRegion'
import {
	hashHasImplicitSessionTokens,
	isOpsPasswordSetupAuthType,
	opsAuthNextPath,
	parseAuthHashParams,
} from '@/lib/ops-auth-callback'
import { createClientClient } from '@/lib/supabase/client'

const C = opsAuthCallbackCopy

function stripHashFromUrl(): void {
	const url = new URL(window.location.href)
	url.hash = ''
	const next = url.searchParams.get('next')
	const path = url.pathname + (next ? `?next=${encodeURIComponent(next)}` : '')
	window.history.replaceState(null, '', path)
}

function userNeedsPasswordSetup(user: { invited_at?: string | null } | null): boolean {
	return Boolean(user?.invited_at)
}

export function OpsAuthCallbackClient() {
	const router = useRouter()
	const searchParams = useSearchParams()
	const [error, setError] = useState<string | null>(null)
	const effectRunRef = useRef(0)

	const queryType = searchParams.get('type')
	const next = searchParams.get('next')

	useEffect(() => {
		const runId = ++effectRunRef.current
		const isStale = () => runId !== effectRunRef.current
		const supabase = createClientClient()
		let authType = queryType

		function goAfterSignIn(): void {
			if (isOpsPasswordSetupAuthType(authType)) {
				router.replace('/ops/auth/set-password')
				return
			}
			router.replace(opsAuthNextPath(next))
		}

		async function complete() {
			const hash = window.location.hash
			if (hashHasImplicitSessionTokens(hash)) {
				const params = parseAuthHashParams(hash)
				const access_token = params.get('access_token')
				const refresh_token = params.get('refresh_token')
				authType = params.get('type') ?? authType

				if (!access_token || !refresh_token) {
					setError(C.errorMissingTokens)
					return
				}

				const { error: sessionErr } = await supabase.auth.setSession({
					access_token,
					refresh_token,
				})

				stripHashFromUrl()

				if (isStale()) return
				if (sessionErr) {
					setError(sessionErr.message)
					return
				}

				if (isOpsPasswordSetupAuthType(authType)) {
					router.replace('/ops/auth/set-password')
					return
				}

				const {
					data: { user },
				} = await supabase.auth.getUser()
				if (isStale()) return
				if (userNeedsPasswordSetup(user)) {
					router.replace('/ops/auth/set-password')
					return
				}

				router.replace(opsAuthNextPath(next))
				return
			}

			const {
				data: { session },
			} = await supabase.auth.getSession()
			if (isStale()) return

			if (session) {
				if (isOpsPasswordSetupAuthType(authType) || userNeedsPasswordSetup(session.user)) {
					router.replace('/ops/auth/set-password')
					return
				}
				router.replace(opsAuthNextPath(next))
				return
			}

			setError(C.errorMissingTokens)
		}

		const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
			if (isStale() || event !== 'SIGNED_IN' || !session) return
			if (isOpsPasswordSetupAuthType(authType) || userNeedsPasswordSetup(session.user)) {
				router.replace('/ops/auth/set-password')
				return
			}
			goAfterSignIn()
		})

		void complete()

		return () => {
			authListener.subscription.unsubscribe()
		}
	}, [queryType, next, router])

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
