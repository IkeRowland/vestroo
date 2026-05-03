import { LoadingRegion } from '@/components/saas'
import { accountMembersCopy } from '@/features/account/copy/account-members-copy'

export default function AccountMembersLoading() {
	return <LoadingRegion theme="account" label={accountMembersCopy.loadingLabel} className="w-full" />
}
