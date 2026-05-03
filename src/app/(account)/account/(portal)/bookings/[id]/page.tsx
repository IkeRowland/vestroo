import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

type PageProps = {
	params: Promise<{ id: string }>
}

/**
 * Story **18.5** / **FE.18.4:** `/account/bookings` list + rail is canonical with **`?id=`**;
 * old deep links to this path redirect.
 */
export default async function AccountBookingDetailPage({ params }: PageProps) {
	const { id } = await params
	redirect(`/account/bookings?id=${encodeURIComponent(id)}`)
}
