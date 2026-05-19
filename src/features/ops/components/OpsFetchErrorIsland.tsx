'use client'

import { useRouter } from 'next/navigation'

import { OpsErrorState } from '@/features/ops/components/OpsErrorState'

type OpsFetchErrorIslandProps = {
	title: string
	message: string
	correlationId?: string
}

/**
 * Client island: fetch/load errors on ops pages with `router.refresh()` recovery via Try again (AC2).
 */
export function OpsFetchErrorIsland({ title, message, correlationId }: OpsFetchErrorIslandProps) {
	const router = useRouter()
	return (
		<OpsErrorState
			title={title}
			message={message}
			correlationId={correlationId}
			onRetry={() => router.refresh()}
			secondaryAction={{ label: 'Trips', href: '/ops/trips' }}
		/>
	)
}
