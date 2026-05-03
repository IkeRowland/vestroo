import { LoadingRegion } from '@/components/saas'
import { accountPreferencesCopy } from '@/features/account/copy/account-preferences-copy'

export default function AccountPreferencesLoading() {
	return <LoadingRegion theme="account" label={accountPreferencesCopy.loadingLabel} className="w-full" />
}
