import { AccountProfilePageContent } from '@/features/account/components/AccountProfilePageContent'
import { splitProfileFullName } from '@/features/account/lib/account-profile-name'
import { isAccountProfileAvatarUploadEnabled } from '@/lib/account-profile-env'
import { requireAccountMemberPage } from '@/lib/account-portal-auth'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AccountProfilePage() {
	const session = await requireAccountMemberPage()
	const supabase = await createUserServerClient()
	const { data: profile } = await supabase
		.from('profiles')
		.select('full_name, phone, avatar_url')
		.eq('id', session.userId)
		.maybeSingle()

	const fullName = typeof profile?.full_name === 'string' ? profile.full_name : ''
	const { firstName, lastName } = splitProfileFullName(fullName)
	const phone = typeof profile?.phone === 'string' ? profile.phone : ''
	const avatarUrl = typeof profile?.avatar_url === 'string' && profile.avatar_url.length > 0 ? profile.avatar_url : null
	const workEmail = session.email ?? ''
	const avatarUploadEnabled = isAccountProfileAvatarUploadEnabled()

	return (
		<AccountProfilePageContent
			workEmail={workEmail}
			initialFirstName={firstName}
			initialLastName={lastName}
			initialPhone={phone}
			initialAvatarUrl={avatarUrl}
			avatarUploadEnabled={avatarUploadEnabled}
		/>
	)
}
