'use client'

import { useRouter } from 'next/navigation'

import { OpsErrorState } from '@/features/ops/components/OpsErrorState'

type OpsFetchErrorIslandProps = {
	title: string
	message: string
	correlationId?: string
}

/**
 * Client island: fetch/load errors on ops pages with explicit `router.refresh()` recovery (AC2).
 */
export function OpsFetchErrorIsland({ title, message, correlationId }: OpsFetchErrorIslandProps) {
	const router = useRouter()
	return (
		<OpsErrorState
			title={title}
			message={message}
			correlationId={correlationId}
			onRefresh={() => router.refresh()}
			refreshLabel="Refresh page"
			secondaryAction={{ label: 'Trips', href: '/ops/trips' }}
		/>
	)
}
