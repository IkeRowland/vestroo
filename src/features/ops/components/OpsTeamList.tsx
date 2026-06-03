'use client'

import Link from 'next/link'

import { opsTeamCopy } from '@/features/ops/copy/ops-team-copy'
import { getRoleDisplayLabel } from '@/features/ops/role-display'
import { OpsTableShell } from '@/features/ops/components/ops-primitives'
import type { ProfileRole } from '@/types/database.types'
import { cn } from '@/lib/utils'

const C = opsTeamCopy

export type OpsTeamMemberRow = {
	id: string
	full_name: string
	email: string
	phone: string | null
	role: ProfileRole
	status: string
}

type OpsTeamListProps = {
	members: OpsTeamMemberRow[]
}

export function OpsTeamList({ members }: OpsTeamListProps) {
	if (members.length === 0) {
		return (
			<p className="rounded-md border border-ops-border bg-ops-surface p-6 text-sm text-ops-muted">
				{C.listEmpty}
			</p>
		)
	}

	return (
		<OpsTableShell caption={C.listCaption} tableClassName="min-w-[32rem] text-sm">
			<thead>
				<tr className="border-b border-ops-border text-xs uppercase tracking-wide text-ops-muted">
					<th scope="col" className="px-4 py-3 font-medium">
						{C.tableName}
					</th>
					<th scope="col" className="px-4 py-3 font-medium">
						{C.tableEmail}
					</th>
					<th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">
						{C.tablePhone}
					</th>
					<th scope="col" className="px-4 py-3 font-medium">
						{C.tableRole}
					</th>
					<th scope="col" className="px-4 py-3 font-medium">
						{C.tableStatus}
					</th>
				</tr>
			</thead>
			<tbody>
				{members.map((m) => {
					const inactive = m.status === 'inactive'
					const name = m.full_name?.trim() || '—'
					return (
						<tr
							key={m.id}
							className="border-b border-ops-border/60 hover:bg-ops-surface-hover"
						>
							<td className="px-4 py-3">
								<Link
									href={`/ops/team/${m.id}`}
									className="font-medium text-primary underline-offset-2 hover:underline"
								>
									{name}
								</Link>
							</td>
							<td className="max-w-[12rem] truncate px-4 py-3 text-ops-muted sm:max-w-none">
								{m.email || '—'}
							</td>
							<td className="hidden max-w-[10rem] truncate px-4 py-3 text-ops-muted sm:table-cell">
								{m.phone?.trim() || '—'}
							</td>
							<td className="px-4 py-3 text-ops-foreground">{getRoleDisplayLabel(m.role)}</td>
							<td className="px-4 py-3">
								<span
									className={cn(
										'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
										inactive
											? 'bg-ops-muted/20 text-ops-muted'
											: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-200',
									)}
								>
									{inactive ? C.statusInactive : C.statusActive}
								</span>
							</td>
						</tr>
					)
				})}
			</tbody>
		</OpsTableShell>
	)
}
