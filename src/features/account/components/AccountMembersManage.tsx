'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'

import {
	initialAccountMembersActionState,
	inviteAccountMemberAction,
	removeAccountMemberAction,
	resendAccountMemberInviteAction,
	updateAccountMemberRoleAction,
} from '@/actions/accountMembers'
import { accountMembersCopy } from '@/features/account/copy/account-members-copy'
import { AccountResponsiveTableShell } from '@/features/account/components/account-responsive-table-shell'
import { memberRowLastActivityIso, type AccountMemberRow } from '@/lib/account-members-admin'
import { portalRoleLabel } from '@/lib/account-portal-auth-shared'
import {
	ACCOUNT_MEMBERS_LIST_PAGE_SIZE,
	accountMembersListHref,
	accountMembersListSearchExcludingPage,
	type AccountMembersListParsed,
} from '@/lib/account-members-list-query'
import { cn } from '@/lib/utils'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'
import type { OpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AvatarCell, EmptyState, Pagination, StatusPill } from '@/components/saas'

const ALL_ROLES = ['admin', 'booker', 'rider'] as const satisfies readonly CustomerAccountMemberRoleDb[]

const selectClass = cn(
	'flex h-12 w-full rounded-lg border border-gray-200 bg-white px-3 text-xs font-bold text-gray-900 shadow-sm',
	'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25A89B] focus-visible:ring-offset-0 focus-visible:border-[#25A89B] disabled:cursor-not-allowed disabled:opacity-50',
)

function memberRolePillTone(role: CustomerAccountMemberRoleDb): OpsStatusPillTone {
	if (role === 'admin') return 'info'
	if (role === 'rider') return 'warning'
	return 'neutral'
}

function PendingButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
	const { pending } = useFormStatus()
	return (
		<Button type="submit" size="sm" variant="secondary" disabled={pending}>
			{pending ? pendingLabel : label}
		</Button>
	)
}

function formatWhen(iso: string | null): string {
	if (!iso) return '—'
	try {
		return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
	} catch {
		return '—'
	}
}

function displayName(row: AccountMemberRow): string {
	const n = row.full_name?.trim()
	return n && n.length > 0 ? n : row.email
}

function WelcomeInviteCta({ onOpen }: { onOpen: () => void }) {
	return (
		<Button type="button" onClick={onOpen}>
			{accountMembersCopy.primaryInvite}
		</Button>
	)
}

function InviteMemberSheetForm({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
	const [state, formAction] = useActionState(inviteAccountMemberAction, initialAccountMembersActionState)
	return (
		<form action={formAction} className="space-y-4 px-4 py-2">
			<div className="grid gap-4 sm:grid-cols-2">
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="invite-email-sheet">{accountMembersCopy.inviteEmailLabel}</Label>
					<Input
						id="invite-email-sheet"
						name="email"
						type="email"
						required
						autoComplete="off"
						placeholder={accountMembersCopy.inviteEmailPlaceholder}
					/>
				</div>
				<div className="space-y-2 sm:col-span-2">
					<Label htmlFor="invite-role-sheet">{accountMembersCopy.inviteRoleLabel}</Label>
					<select id="invite-role-sheet" name="role" className={selectClass} defaultValue="booker" required>
						{ALL_ROLES.map((r) => (
							<option key={r} value={r}>
								{portalRoleLabel(r)}
							</option>
						))}
					</select>
				</div>
			</div>
			{state.message ? (
				<p
					className={state.ok ? 'text-sm text-emerald-700 dark:text-emerald-400' : 'text-sm text-destructive'}
					role="alert"
				>
					{state.message}
				</p>
			) : null}
			<div className="flex flex-wrap gap-2 pb-2">
				<PendingButton label={accountMembersCopy.inviteSubmit} pendingLabel={accountMembersCopy.inviteSubmitPending} />
				<Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
					{accountMembersCopy.deactivateCancel}
				</Button>
			</div>
		</form>
	)
}

type AccountMembersManageProps = {
	rows: AccountMemberRow[]
	total: number
	currentPage: number
	parsed: AccountMembersListParsed
}

export function AccountMembersManage({ rows, total, currentPage, parsed }: AccountMembersManageProps) {
	const [inviteOpen, setInviteOpen] = useState(false)
	const [roleTarget, setRoleTarget] = useState<AccountMemberRow | null>(null)
	const [deactivateTarget, setDeactivateTarget] = useState<AccountMemberRow | null>(null)

	const [removeState, removeFormAction] = useActionState(removeAccountMemberAction, initialAccountMembersActionState)

	const hasSearch = parsed.search.trim().length > 0
	const perPage = parsed.perPage
	const totalPages = Math.max(1, Math.ceil(total / perPage))
	const listQuery = accountMembersListSearchExcludingPage(parsed)

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<form
					method="get"
					action="/account/members"
					role="search"
					className="flex w-full min-w-0 max-w-md flex-col gap-2 sm:flex-1 sm:flex-row sm:items-end"
				>
					<div className="min-w-0 flex-1 space-y-1">
						<Label htmlFor="members-search">{accountMembersCopy.searchLabel}</Label>
						<Input
							id="members-search"
							name="acct_q"
							type="search"
							placeholder={accountMembersCopy.searchPlaceholder}
							defaultValue={parsed.search}
							autoComplete="off"
						/>
					</div>
					<input type="hidden" name="acct_per" value={perPage} />
					<Button type="submit" className="shrink-0" variant="secondary">
						{accountMembersCopy.searchSubmit}
					</Button>
					{hasSearch ? (
						<Button type="button" variant="ghost" className="shrink-0" asChild>
							<Link href={accountMembersListHref(parsed, { search: '', page: 1 })}>{accountMembersCopy.searchClear}</Link>
						</Button>
					) : null}
				</form>
				<Button type="button" onClick={() => setInviteOpen(true)} className="shrink-0">
					{accountMembersCopy.primaryInvite}
				</Button>
			</div>

			<Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
				<SheetContent className="border-account-border bg-account-canvas !max-w-lg" showCloseButton>
					<SheetHeader className="border-account-border pr-8">
						<SheetTitle className="text-account-foreground">{accountMembersCopy.inviteDialogTitle}</SheetTitle>
					</SheetHeader>
					<p className="px-4 text-sm text-account-muted">{accountMembersCopy.inviteDialogDescription}</p>
					<InviteMemberSheetForm onOpenChange={setInviteOpen} />
				</SheetContent>
			</Sheet>

			<Sheet open={roleTarget !== null} onOpenChange={(o) => !o && setRoleTarget(null)}>
				<SheetContent className="border-account-border bg-account-canvas !max-w-lg" showCloseButton>
					<SheetHeader className="border-account-border pr-8">
						<SheetTitle className="text-account-foreground">{accountMembersCopy.roleDialogTitle}</SheetTitle>
					</SheetHeader>
					{roleTarget ? (
						<ChangeRoleForm row={roleTarget} onClose={() => setRoleTarget(null)} />
					) : null}
				</SheetContent>
			</Sheet>

			<AlertDialog open={deactivateTarget !== null} onOpenChange={(o) => !o && setDeactivateTarget(null)}>
				<AlertDialogContent>
					{deactivateTarget ? (
						<form action={removeFormAction}>
							<AlertDialogHeader>
								<AlertDialogTitle>{accountMembersCopy.deactivateDialogTitle}</AlertDialogTitle>
								<AlertDialogDescription>
									{accountMembersCopy.deactivateDialogDescription(deactivateTarget.email)}
								</AlertDialogDescription>
							</AlertDialogHeader>
							<input type="hidden" name="email" value={deactivateTarget.email} />
							{removeState.message ? (
								<p className="mb-2 text-sm text-destructive" role="alert">
									{removeState.message}
								</p>
							) : null}
							<AlertDialogFooter>
								<AlertDialogCancel type="button">{accountMembersCopy.deactivateCancel}</AlertDialogCancel>
								<RemoveSubmitButton
									label={accountMembersCopy.deactivateConfirm}
									pendingLabel={accountMembersCopy.deactivatePending}
								/>
							</AlertDialogFooter>
						</form>
					) : null}
				</AlertDialogContent>
			</AlertDialog>

			{total === 0 ? (
				<EmptyState
					theme="account"
					title={hasSearch ? accountMembersCopy.emptySearchTitle : accountMembersCopy.emptyTeamTitle}
					description={hasSearch ? accountMembersCopy.emptySearchDescription : accountMembersCopy.emptyTeamDescription}
					action={<WelcomeInviteCta onOpen={() => setInviteOpen(true)} />}
				/>
			) : null}

			{total > 0 ? (
				<div className="space-y-3">
					<div className="overflow-y-auto rounded-xl border border-account-border bg-card shadow-sm md:overflow-x-auto">
						<AccountResponsiveTableShell
							stackAriaLabel={accountMembersCopy.tableCaption}
							desktop={
								<Table>
									<caption className="sr-only">{accountMembersCopy.tableCaption}</caption>
									<TableHeader>
										<TableRow className="border-account-border bg-muted/40">
											<TableHead className="min-w-[200px] pl-3 text-left text-xs font-semibold text-account-muted">
												{accountMembersCopy.tableColMember}
											</TableHead>
											<TableHead className="min-w-[180px] text-left text-xs font-semibold text-account-muted">
												{accountMembersCopy.tableColEmail}
											</TableHead>
											<TableHead className="w-[100px] text-left text-xs font-semibold text-account-muted">
												{accountMembersCopy.tableColRole}
											</TableHead>
											<TableHead className="min-w-[140px] text-left text-xs font-semibold text-account-muted">
												{accountMembersCopy.tableColLastActive}
											</TableHead>
											<TableHead className="w-10 pr-2 text-left text-xs font-semibold text-account-muted">
												{accountMembersCopy.tableColActions}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{rows.map((row) => {
											const name = displayName(row)
											const lastIso = memberRowLastActivityIso(row)
											const pending = row.accepted_at === null
											return (
												<TableRow
													key={`${row.account_id}:${row.email}`}
													className="border-b border-account-border last:border-0"
												>
													<TableCell className="min-w-0 pl-3 align-top">
														<AvatarCell theme="account" name={name} src={null} />
														<p
															className={cn(
																'mt-1 pl-11 text-xs',
																pending ? 'text-account-warning' : 'text-account-muted',
															)}
														>
															{pending ? accountMembersCopy.rowPending : accountMembersCopy.rowActive}
														</p>
													</TableCell>
													<TableCell className="min-w-0 max-w-xs align-top">
														<span className="break-words text-sm text-account-foreground">{row.email}</span>
													</TableCell>
													<TableCell className="align-top">
														<StatusPill theme="account" tone={memberRolePillTone(row.role)} dot>
															{portalRoleLabel(row.role)}
														</StatusPill>
													</TableCell>
													<TableCell className="whitespace-nowrap align-top text-sm text-account-muted">
														{formatWhen(lastIso)}
													</TableCell>
													<TableCell className="p-0 pr-2 text-right align-top" onClick={(e) => e.stopPropagation()}>
														<MemberRowActions
															row={row}
															onOpenRole={() => setRoleTarget(row)}
															onDeactivate={() => setDeactivateTarget(row)}
														/>
													</TableCell>
												</TableRow>
											)
										})}
									</TableBody>
								</Table>
							}
							mobileStack={
								<ul className="divide-y divide-account-border p-3">
									{rows.map((row) => {
										const name = displayName(row)
										const lastIso = memberRowLastActivityIso(row)
										const pending = row.accepted_at === null
										return (
											<li key={`${row.account_id}:${row.email}`}>
												<article className="rounded-lg py-3">
													<div className="flex items-start justify-between gap-2">
														<div className="min-w-0 flex-1 space-y-2">
															<div className="flex flex-wrap items-start gap-2">
																<AvatarCell theme="account" name={name} src={null} />
																<div className="min-w-0 flex-1">
																	<p className="break-words text-sm font-medium text-account-foreground">
																		{name}
																	</p>
																	<p
																		className={cn(
																			'text-xs',
																			pending ? 'text-account-warning' : 'text-account-muted',
																		)}
																	>
																		{pending ? accountMembersCopy.rowPending : accountMembersCopy.rowActive}
																	</p>
																	<p className="mt-1 break-words text-xs text-account-foreground">{row.email}</p>
																</div>
															</div>
															<div className="flex flex-wrap items-center gap-2">
																<StatusPill theme="account" tone={memberRolePillTone(row.role)} dot>
																	{portalRoleLabel(row.role)}
																</StatusPill>
																<span className="text-xs text-account-muted">{formatWhen(lastIso)}</span>
															</div>
														</div>
														<div className="shrink-0">
															<MemberRowActions
																row={row}
																onOpenRole={() => setRoleTarget(row)}
																onDeactivate={() => setDeactivateTarget(row)}
															/>
														</div>
													</div>
												</article>
											</li>
										)
									})}
								</ul>
							}
						/>
					</div>
					<div className="pt-1">
						<Pagination
							theme="account"
							pathname="/account/members"
							query={listQuery}
							currentPage={currentPage}
							totalPages={totalPages}
							totalCount={total}
							perPage={perPage}
							perOmitDefault={ACCOUNT_MEMBERS_LIST_PAGE_SIZE}
							pageParam="acct_page"
							perParam="acct_per"
						/>
					</div>
				</div>
			) : null}
		</div>
	)
}

function RemoveSubmitButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
	const { pending } = useFormStatus()
	return (
		<AlertDialogAction type="submit" disabled={pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
			{pending ? pendingLabel : label}
		</AlertDialogAction>
	)
}

function ChangeRoleForm({ row, onClose }: { row: AccountMemberRow; onClose: () => void }) {
	const [state, formAction] = useActionState(updateAccountMemberRoleAction, initialAccountMembersActionState)
	return (
		<div className="px-4 pb-4">
			<p className="text-sm text-account-muted">{accountMembersCopy.roleDialogDescription(row.email)}</p>
			<form action={formAction} className="mt-4 space-y-3">
				<input type="hidden" name="email" value={row.email} />
				<div className="space-y-2">
					<Label htmlFor={`role-select-${row.email}`}>{accountMembersCopy.inviteRoleLabel}</Label>
					<select
						id={`role-select-${row.email}`}
						name="role"
						className={cn(selectClass, 'w-full')}
						defaultValue={row.role}
						required
						aria-label={accountMembersCopy.roleChangeAria(row.email)}
					>
						{ALL_ROLES.map((r) => (
							<option key={r} value={r}>
								{portalRoleLabel(r)}
							</option>
						))}
					</select>
				</div>
				{state.message ? (
					<p className="text-sm text-destructive" role="alert">
						{state.message}
					</p>
				) : null}
				<div className="flex flex-wrap gap-2">
					<PendingButton label={accountMembersCopy.roleSubmit} pendingLabel={accountMembersCopy.roleSubmitPending} />
					<Button type="button" variant="ghost" onClick={onClose}>
						{accountMembersCopy.deactivateCancel}
					</Button>
				</div>
			</form>
		</div>
	)
}

function ResendInviteMenuItem({ email }: { email: string }) {
	const [state, formAction] = useActionState(resendAccountMemberInviteAction, initialAccountMembersActionState)
	return (
		<div>
			<DropdownMenuItem className="cursor-pointer p-0 focus:bg-transparent" onSelect={(e) => e.preventDefault()} asChild>
				<form action={formAction} className="w-full">
					<input type="hidden" name="email" value={email} />
					<button
						type="submit"
						className="flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-left text-sm text-foreground outline-none hover:bg-accent"
					>
						{accountMembersCopy.menuResend}
					</button>
				</form>
			</DropdownMenuItem>
			{state.message ? (
				<p
					className={state.ok ? 'px-2 py-1 text-xs text-emerald-700' : 'px-2 py-1 text-xs text-destructive'}
					role="status"
				>
					{state.message}
				</p>
			) : null}
		</div>
	)
}

type MemberRowActionsProps = {
	row: AccountMemberRow
	onOpenRole: () => void
	onDeactivate: () => void
}

function MemberRowActions({ row, onOpenRole, onDeactivate }: MemberRowActionsProps) {
	const pending = row.accepted_at === null
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					className="min-h-11 min-w-11"
					aria-label={accountMembersCopy.tableActionsMenu(row.email)}
				>
					<MoreHorizontal className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				{pending ? <ResendInviteMenuItem email={row.email} /> : null}
				<DropdownMenuItem
					className="cursor-pointer"
					onSelect={(e) => {
						e.preventDefault()
						onOpenRole()
					}}
				>
					{accountMembersCopy.menuChangeRole}
				</DropdownMenuItem>
				<DropdownMenuItem
					className="cursor-pointer text-destructive"
					onSelect={(e) => {
						e.preventDefault()
						onDeactivate()
					}}
				>
					{accountMembersCopy.menuDeactivate}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
