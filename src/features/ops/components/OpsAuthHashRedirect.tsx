'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * Safety net: Supabase invite links that land on `/` with hash tokens redirect to the ops callback route.
 */
export function OpsAuthHashRedirect() {
	const pathname = usePathname()

	useEffect(() => {
		if (pathname !== '/') return
		const hash = window.location.hash
		if (!hash.includes('access_token')) return
		window.location.replace(`/ops/auth/callback${hash}`)
	}, [pathname])

	return null
}
