'use client'

import { useRouter } from 'next/navigation'

import { createClientClient } from '@/lib/supabase/client'

export function FieldSignOutButton() {
	const router = useRouter()

	return (
		<button
			type="button"
			className="min-h-11 rounded-md border border-slate-600 px-3 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
			onClick={async () => {
				const supabase = createClientClient()
				await supabase.auth.signOut()
				router.push('/field/login')
				router.refresh()
			}}
		>
			Sign out
		</button>
	)
}
