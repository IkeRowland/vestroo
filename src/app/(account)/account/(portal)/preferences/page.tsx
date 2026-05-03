import { loadAccountCommsPreferencesAction } from '@/actions/accountCommsPreferences'
import { AccountPreferencesPageContent } from '@/features/account/components/AccountPreferencesPageContent'
import { accountPreferencesCopy } from '@/features/account/copy/account-preferences-copy'
import {
	getActiveMembershipRole,
	loadActiveCustomerAccountForPortal,
	requireAccountMemberPage,
} from '@/lib/account-portal-auth'
import { loadBillingEntitySelectOptions } from '@/lib/account-preferences-load.server'
import { createUserServerClient } from '@/lib/supabase/server'
import { parseAccountPrefsCategoryQuery } from '@/types/comms-preferences'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const dynamic = 'force-dynamic'

export default async function AccountPreferencesPage({
	searchParams,
}: {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
	const sp = await searchParams
	const highlight = parseAccountPrefsCategoryQuery(sp.category)

	const session = await requireAccountMemberPage()
	const loaded = await loadAccountCommsPreferencesAction()
	if (!loaded.ok) {
		return (
			<Alert
				variant="destructive"
				role="alert"
				className="border-destructive/50 bg-destructive/5 text-destructive"
			>
				<AlertDescription>
					<span className="block font-medium">{accountPreferencesCopy.loadErrorTitle}</span>
					<span className="mt-1 block text-foreground/90">{accountPreferencesCopy.loadErrorBody}</span>
					<span className="mt-2 block text-sm text-foreground/80">{loaded.message}</span>
				</AlertDescription>
			</Alert>
		)
	}

	const accountRow = await loadActiveCustomerAccountForPortal(session.activeAccountId)
	const accountName = accountRow?.name ?? session.activeAccount.name
	const role = getActiveMembershipRole(session)
	const isOrgAdmin = role === 'admin'
	const defaultRef = accountRow?.default_billing_entity_ref ?? null

	const supabase = await createUserServerClient()
	const billingEntityOptions = isOrgAdmin
		? await loadBillingEntitySelectOptions(supabase, session.activeAccountId, defaultRef)
		: []

	return (
		<AccountPreferencesPageContent
			initial={loaded.preferences}
			memberEmail={loaded.memberEmail}
			accountName={accountName}
			highlight={highlight}
			isOrgAdmin={isOrgAdmin}
			initialDefaultBillingEntityRef={defaultRef}
			billingEntityOptions={billingEntityOptions}
		/>
	)
}
