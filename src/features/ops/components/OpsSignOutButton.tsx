'use client'

import { useRouter } from 'next/navigation'

import { createClientClient } from '@/lib/supabase/client'

export function OpsSignOutButton() {
	const router = useRouter()

	return (
		<button
			type="button"
			className="min-h-11 rounded-md border border-ops-border px-3 py-2.5 text-sm font-medium text-ops-foreground hover:bg-ops-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas"
			onClick={async () => {
				const supabase = createClientClient()
				await supabase.auth.signOut()
				router.push('/ops/login')
				router.refresh()
			}}
		>
			Sign out
		</button>
	)
}
