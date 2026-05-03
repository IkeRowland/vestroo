import { AccountDashboard } from '@/features/account/components/AccountDashboard'
import {
	getActiveMembershipRole,
	loadActiveCustomerAccountForPortal,
	requireAccountMemberPage,
} from '@/lib/account-portal-auth'
import { formatAccountDashboardLastSignIn, loadAccountDashboardSnapshot } from '@/lib/account-dashboard-query'
import { loadVerifiedPortalBootstrapForAccount } from '@/lib/book-again-portal-handoff.server'
import { parseBookingSearchUrlParams } from '@/lib/booking-search-url-params'
import { createUserServerClient } from '@/lib/supabase/server'
import { getTripRequestPhoneCountryIso2FromHeaders } from '@/lib/trip-request-phone-country-hint.server'
import { pickFirstSearchParam } from '@/lib/url-search-params'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccountHomePage({ searchParams }: PageProps) {
	const session = await requireAccountMemberPage()
	const role = getActiveMembershipRole(session)
	if (!role) {
		throw new Error('Active account is not in membership list')
	}

	const accountRow = await loadActiveCustomerAccountForPortal(session.activeAccountId)
	const accountName = accountRow?.name ?? session.activeAccount.name
	const billingEntityRef = accountRow?.default_billing_entity_ref ?? null

	const supabase = await createUserServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()
	const lastSignInLabel = formatAccountDashboardLastSignIn(user?.last_sign_in_at ?? null)

	const snapshot = await loadAccountDashboardSnapshot(supabase, session.activeAccountId, role)

	const raw = await searchParams
	const { bookSearchPrefill } = parseBookingSearchUrlParams({
		tab: pickFirstSearchParam(raw, 'tab'),
		modify: pickFirstSearchParam(raw, 'modify'),
		originHint: pickFirstSearchParam(raw, 'originHint'),
		destinationHint: pickFirstSearchParam(raw, 'destinationHint'),
		passengers: pickFirstSearchParam(raw, 'passengers'),
		intent: pickFirstSearchParam(raw, 'intent'),
		serviceTypeHint: pickFirstSearchParam(raw, 'serviceTypeHint'),
		omitTripDate: pickFirstSearchParam(raw, 'omitTripDate'),
	})
	const portalRebookBootstrap = await loadVerifiedPortalBootstrapForAccount(session.activeAccountId)
	const tripRequestPhoneCountryIso2Hint = await getTripRequestPhoneCountryIso2FromHeaders()

	return (
		<AccountDashboard
			accountName={accountName}
			billingEntityRef={billingEntityRef}
			email={session.email}
			role={role}
			lastSignInLabel={lastSignInLabel}
			snapshot={snapshot}
			newBookingFormLoad={{
				bookSearchPrefill,
				portalRebookBootstrap,
				tripRequestPhoneCountryIso2Hint,
			}}
		/>
	)
}
