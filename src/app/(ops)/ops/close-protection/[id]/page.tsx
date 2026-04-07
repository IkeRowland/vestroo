import Link from 'next/link'
import { notFound } from 'next/navigation'

import { getCloseProtectionEngagementByIdAction } from '@/actions/opsCloseProtection'
import { CloseProtectionEngagementEditForm } from '@/features/ops/components/CloseProtectionOpsForms'

type PageProps = {
	params: Promise<{ id: string }>
}

export default async function OpsCloseProtectionDetailPage({ params }: PageProps) {
	const { id } = await params
	const res = await getCloseProtectionEngagementByIdAction({ engagementId: id })

	if (!res.ok || !res.row) {
		notFound()
	}

	const row = res.row

	return (
		<div>
			<p className="text-sm text-zinc-500">
				<Link href="/ops/close-protection" className="text-emerald-400 hover:underline">
					← All engagements
				</Link>
			</p>
			<h1 className="mt-2 text-2xl font-semibold text-white">Engagement</h1>
			<p className="mt-1 font-mono text-xs text-zinc-500">{row.id as string}</p>
			<div className="mt-6 max-w-2xl">
				<CloseProtectionEngagementEditForm
					engagementId={row.id as string}
					bookingId={row.booking_id as string}
					initialTripId={(row.trip_id as string | null) ?? null}
					initialStatus={String(row.status)}
					initialNotes={(row.coordination_notes as string | null) ?? null}
				/>
			</div>
		</div>
	)
}
