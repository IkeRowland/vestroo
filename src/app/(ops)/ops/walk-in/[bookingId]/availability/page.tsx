import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type PageProps = {
	params: Promise<{ bookingId: string }>
}

/** Legacy URL — canonical route is `/ops/bookings/[id]/availability`. */
export default async function WalkInAvailabilityLegacyRedirect({ params }: PageProps) {
	const { bookingId } = await params
	redirect(`/ops/bookings/${encodeURIComponent(bookingId)}/availability`)
}
