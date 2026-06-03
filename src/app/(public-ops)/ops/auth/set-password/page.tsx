import { redirect } from 'next/navigation'

import { OpsPublicAuthPage } from '@/features/ops/components/OpsPublicAuthPage'
import { OpsSetPasswordForm } from '@/features/ops/components/OpsSetPasswordForm'
import { opsSetPasswordCopy } from '@/features/ops/copy/ops-set-password-copy'
import { createUserServerClient } from '@/lib/supabase/server'

const C = opsSetPasswordCopy

export default async function OpsSetPasswordPage() {
	const supabase = await createUserServerClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		redirect('/ops/login')
	}

	return (
		<OpsPublicAuthPage title={C.pageTitle} subtitle={C.subtitle} hint={C.hint}>
			<OpsSetPasswordForm />
		</OpsPublicAuthPage>
	)
}
