import { notFound } from 'next/navigation'

import { OpsTeamMemberDetail } from '@/features/ops/components/OpsTeamMemberDetail'
import { OpsPageHeader } from '@/features/ops/components/ops-primitives'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { opsTeamCopy } from '@/features/ops/copy/ops-team-copy'
import { requireOpsAdminPage } from '@/lib/ops-auth'
import { createUserServerClient } from '@/lib/supabase/server'
import type { ProfileRole } from '@/types/database.types'

export const dynamic = 'force-dynamic'

const C = opsTeamCopy

type PageProps = {
	params: Promise<{ memberId: string }>
}

export default async function OpsTeamMemberPage({ params }: PageProps) {
	const admin = await requireOpsAdminPage()
	const { memberId } = await params
	const supabase = await createUserServerClient()

	const { data, error } = await supabase
		.from('profiles')
		.select('id, full_name, email, phone, role, status')
		.eq('id', memberId)
		.in('role', ['admin', 'dispatcher'])
		.maybeSingle()

	if (error) {
		return (
			<div className="min-w-0 max-w-full space-y-6">
				<OpsPageHeader title={C.memberDetailTitle} />
				<OpsFetchErrorIsland title={C.memberLoadError} message={error.message} />
			</div>
		)
	}

	if (!data) {
		notFound()
	}

	const member = {
		id: data.id as string,
		full_name: (data.full_name as string) ?? '',
		email: (data.email as string) ?? '',
		phone: (data.phone as string | null) ?? null,
		role: data.role as ProfileRole,
		status: (data.status as string) ?? 'active',
	}

	return (
		<div className="min-w-0 max-w-full space-y-6">
			<OpsPageHeader title={C.memberDetailTitle} />
			<OpsTeamMemberDetail member={member} currentUserId={admin.userId} />
		</div>
	)
}
