'use client'

import { useRouter } from 'next/navigation'

import { createClientClient } from '@/lib/supabase/client'

export function OpsSignOutButton() {
	const router = useRouter()

	return (
		<button
			type="button"
			className="min-h-11 rounded-md border border-zinc-600 px-3 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
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
