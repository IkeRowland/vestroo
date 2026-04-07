import { BookingSearchForm } from '@/features/booking/components/BookingSearchForm'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<{ tab?: string }>
}

/**
 * Staff booking search — same flow as `/book/search` (create / modify tabs).
 * Lives under ops for dispatcher use inside the console shell.
 */
export default async function OpsBookingSearchPage({ searchParams }: PageProps) {
	const { tab } = await searchParams
	const initialTab = tab === 'login' ? 'modify-booking' : 'create-booking'

	return (
		<div className="rounded-lg border border-zinc-800 bg-zinc-900/40 py-4 px-4">
			<div className="mx-auto max-w-7xl">
				<div className="flex justify-center">
					<BookingSearchForm initialTab={initialTab} />
				</div>
			</div>
		</div>
	)
}
