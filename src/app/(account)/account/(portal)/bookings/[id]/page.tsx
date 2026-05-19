import Link from 'next/link'
import { notFound } from 'next/navigation'

import { AccountBookingDetailView } from '@/features/account/components/AccountBookingDetailView'
import { AccountBookingsRealtimeBridge } from '@/features/account/components/AccountBookingsRealtimeBridge'
import { accountBookingsPageCopy } from '@/features/account/copy/account-bookings-copy'
import { loadAccountBookingDetailForRail } from '@/lib/account-booking-rail.server'
import { getActiveMembershipRole, requireAccountMemberPage } from '@/lib/account-portal-auth'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type PageProps = {
	params: Promise<{ id: string }>
}

export default async function AccountBookingDetailPage({ params }: PageProps) {
	const session = await requireAccountMemberPage()
	const portalRole = getActiveMembershipRole(session)
	if (!portalRole) {
		throw new Error('Active account is not in membership list')
	}

	const { id } = await params
	const supabase = await createUserServerClient()
	const detail = await loadAccountBookingDetailForRail(supabase, id, session.activeAccountId)
	if (!detail) {
		notFound()
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="sr-only">{accountBookingsPageCopy.pageTitle}</h1>
					<p className="text-sm text-account-muted">
						{session.activeAccount.name} — {accountBookingsPageCopy.pageSubtitle}
					</p>
				</div>
				<Link
					href="/account"
					className="text-sm font-medium text-primary underline-offset-4 hover:underline"
				>
					{accountBookingsPageCopy.backToAccount}
				</Link>
			</div>
			<AccountBookingsRealtimeBridge />
			<AccountBookingDetailView portalRole={portalRole} detail={detail} />
		</div>
	)
}
