import { OpsTeamInviteButton } from '@/features/ops/components/OpsTeamInviteButton'
import { OpsTeamList, type OpsTeamMemberRow } from '@/features/ops/components/OpsTeamList'
import { OpsActionGroup, OpsPageHeader } from '@/features/ops/components/ops-primitives'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { opsTeamCopy } from '@/features/ops/copy/ops-team-copy'
import { requireOpsAdminPage } from '@/lib/ops-auth'
import { createUserServerClient } from '@/lib/supabase/server'
import type { ProfileRole } from '@/types/database.types'

export const dynamic = 'force-dynamic'

const C = opsTeamCopy

export default async function OpsTeamPage() {
	await requireOpsAdminPage()
	const supabase = await createUserServerClient()

	const { data, error } = await supabase
		.from('profiles')
		.select('id, full_name, email, phone, role, status')
		.in('role', ['admin', 'dispatcher'])
		.order('full_name')

	if (error) {
		return (
			<div className="min-w-0 max-w-full space-y-6">
				<OpsPageHeader title={C.pageTitle} description={C.pageDescription} />
				<OpsFetchErrorIsland title={C.listLoadError} message={error.message} />
			</div>
		)
	}

	const members: OpsTeamMemberRow[] = (data ?? []).map((row) => ({
		id: row.id as string,
		full_name: (row.full_name as string) ?? '',
		email: (row.email as string) ?? '',
		phone: (row.phone as string | null) ?? null,
		role: row.role as ProfileRole,
		status: (row.status as string) ?? 'active',
	}))

	return (
		<div className="min-w-0 max-w-full space-y-6">
			<OpsPageHeader title={C.pageTitle} description={C.pageDescription}>
				<OpsActionGroup>
					<OpsTeamInviteButton />
				</OpsActionGroup>
			</OpsPageHeader>
			<OpsTeamList members={members} />
		</div>
	)
}
