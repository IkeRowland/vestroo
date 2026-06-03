import { OpsProfilePageContent } from '@/features/ops/components/OpsProfilePageContent'
import { splitProfileFullName } from '@/features/account/lib/account-profile-name'
import { requireOpsStaffPage } from '@/lib/ops-auth'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function OpsProfilePage() {
	const session = await requireOpsStaffPage()
	const supabase = await createUserServerClient()
	const { data: profile } = await supabase
		.from('profiles')
		.select('full_name, phone')
		.eq('id', session.userId)
		.maybeSingle()

	const fullName = typeof profile?.full_name === 'string' ? profile.full_name : ''
	const { firstName, lastName } = splitProfileFullName(fullName)
	const phone = typeof profile?.phone === 'string' ? profile.phone : ''
	const workEmail = session.email ?? ''

	return (
		<OpsProfilePageContent
			workEmail={workEmail}
			initialFirstName={firstName}
			initialLastName={lastName}
			initialPhone={phone}
		/>
	)
}
