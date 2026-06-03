'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
	deleteTeamMemberAction,
	updateTeamMemberStatusAction,
} from '@/actions/opsTeam'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { OpsActionGroup } from '@/features/ops/components/ops-primitives'
import { opsTeamCopy } from '@/features/ops/copy/ops-team-copy'
import { getRoleDisplayLabel } from '@/features/ops/role-display'
import { isOpsActionFailure, opsActionErrorMessage } from '@/lib/ops-action-result'
import type { ProfileRole } from '@/types/database.types'
import { cn } from '@/lib/utils'

const C = opsTeamCopy

export type OpsTeamMemberDetailProps = {
	member: {
		id: string
		full_name: string
		email: string
		phone: string | null
		role: ProfileRole
		status: string
	}
	currentUserId: string
}

export function OpsTeamMemberDetail({ member, currentUserId }: OpsTeamMemberDetailProps) {
	const router = useRouter()
	const [pending, startTransition] = useTransition()
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)
	const [deleteOpen, setDeleteOpen] = useState(false)

	const inactive = member.status === 'inactive'
	const isSelf = member.id === currentUserId
	const name = member.full_name?.trim() || member.email || '—'

	function runStatus(next: 'active' | 'inactive') {
		setError(null)
		setSuccess(null)
		startTransition(async () => {
			const res = await updateTeamMemberStatusAction({ memberId: member.id, status: next })
			if (!res.ok && isOpsActionFailure(res)) {
				setError(opsActionErrorMessage(res) ?? 'Could not update status.')
				return
			}
			setSuccess(C.statusUpdateSuccess)
			router.refresh()
		})
	}

	function confirmDelete() {
		setError(null)
		setSuccess(null)
		startTransition(async () => {
			const res = await deleteTeamMemberAction({ memberId: member.id })
			if (!res.ok && isOpsActionFailure(res)) {
				setError(opsActionErrorMessage(res) ?? 'Could not remove member.')
				setDeleteOpen(false)
				return
			}
			setDeleteOpen(false)
			router.push('/ops/team')
			router.refresh()
		})
	}

	return (
		<div className="space-y-6">
			<p>
				<Link
					href="/ops/team"
					className="text-sm font-medium text-primary underline-offset-2 hover:underline"
				>
					{C.memberDetailBack}
				</Link>
			</p>

			{error ? (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			) : null}
			{success ? (
				<Alert className="border-emerald-700/60 bg-emerald-950/40 text-emerald-100">
					<AlertDescription>{success}</AlertDescription>
				</Alert>
			) : null}

			<div className="rounded-lg border border-ops-border bg-ops-surface p-6">
				<h2 className="text-xl font-semibold text-ops-foreground">{name}</h2>
				<dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
					<div>
						<dt className="text-ops-muted">{C.tableEmail}</dt>
						<dd className="mt-0.5 text-ops-foreground">{member.email || '—'}</dd>
					</div>
					<div>
						<dt className="text-ops-muted">{C.tablePhone}</dt>
						<dd className="mt-0.5 text-ops-foreground">{member.phone?.trim() || '—'}</dd>
					</div>
					<div>
						<dt className="text-ops-muted">{C.tableRole}</dt>
						<dd className="mt-0.5 text-ops-foreground">{getRoleDisplayLabel(member.role)}</dd>
					</div>
					<div>
						<dt className="text-ops-muted">{C.tableStatus}</dt>
						<dd className="mt-0.5">
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
						</dd>
					</div>
				</dl>

				<OpsActionGroup className="mt-6" aria-label="Member actions">
					{inactive ? (
						<Button
							type="button"
							variant="default"
							size="sm"
							disabled={pending}
							onClick={() => runStatus('active')}
						>
							{C.activateMember}
						</Button>
					) : (
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={pending || isSelf}
							onClick={() => runStatus('inactive')}
						>
							{C.deactivateMember}
						</Button>
					)}
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="border-ops-danger/50 text-ops-danger hover:bg-ops-danger/10"
						disabled={pending || isSelf}
						onClick={() => setDeleteOpen(true)}
					>
						{C.deleteMember}
					</Button>
				</OpsActionGroup>
				{isSelf ? (
					<p className="mt-2 text-xs text-ops-muted">{C.deleteSelfError}</p>
				) : null}
			</div>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent className="border-ops-border bg-ops-surface text-ops-foreground">
					<AlertDialogHeader>
						<AlertDialogTitle>{C.deleteDialogTitle}</AlertDialogTitle>
						<AlertDialogDescription className="text-ops-muted">
							{C.deleteDialogDescription}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel className="border-ops-border" disabled={pending}>
							{C.deleteCancel}
						</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							disabled={pending}
							onClick={(ev) => {
								ev.preventDefault()
								confirmDelete()
							}}
						>
							{C.deleteConfirm}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
