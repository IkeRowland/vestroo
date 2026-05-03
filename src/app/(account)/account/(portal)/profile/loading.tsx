import { LoadingRegion } from '@/components/saas'
import { accountProfileCopy } from '@/features/account/copy/account-profile-copy'

export default function AccountProfileLoading() {
	return <LoadingRegion theme="account" label={accountProfileCopy.loadingLabel} className="w-full" />
}
