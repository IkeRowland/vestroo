'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { createClientClient } from '@/lib/supabase/client'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { opsTopBarCopy } from '@/features/ops/copy/ops-top-bar-copy'
import { getRoleDisplayLabel } from '@/features/ops/role-display'
import { cn } from '@/lib/utils'
import type { StaffSession } from '@/lib/ops-auth'
import { ChevronDown } from 'lucide-react'

const focusRing =
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas'

function staffInitials(staff: StaffSession): string {
	const n = staff.displayName?.trim() || staff.email?.split('@')[0] || '?'
	const parts = n.split(/\s+/).filter(Boolean)
	if (parts.length >= 2) {
		return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase()
	}
	return n.slice(0, 2).toUpperCase()
}

function displayLine(staff: StaffSession): string {
	if (staff.displayName?.trim()) return staff.displayName.trim()
	if (staff.email?.trim()) return staff.email.trim()
	return opsTopBarCopy.profileRoleFallback
}

type OpsProfileMenuProps = {
	staff: StaffSession
}

export function OpsProfileMenu({ staff }: OpsProfileMenuProps) {
	const router = useRouter()
	const initials = staffInitials(staff)
	const line = displayLine(staff)
	const roleLabel = getRoleDisplayLabel(staff.role)

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<button
					type="button"
					className={cn(
						'flex min-h-11 max-w-[min(100%,14rem)] min-w-0 items-center gap-2 rounded-md border border-ops-border px-2 py-1.5 text-left hover:bg-ops-surface-hover sm:px-2.5',
						focusRing,
					)}
					aria-label={opsTopBarCopy.profileMenuAria}
				>
					{staff.avatarUrl ? (
						// eslint-disable-next-line @next/next/no-img-element -- staff avatar URLs may be arbitrary Supabase storage paths
						<img
							src={staff.avatarUrl}
							alt=""
							className="h-8 w-8 shrink-0 rounded-full object-cover"
							referrerPolicy="no-referrer"
						/>
					) : (
						<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ops-accent-soft text-xs font-semibold text-ops-accent">
							{initials}
						</span>
					)}
					<span className="hidden min-w-0 flex-1 flex-col sm:flex">
						<span className="truncate text-sm font-medium text-ops-foreground">{line}</span>
						<span className="truncate text-xs text-ops-muted">{roleLabel}</span>
					</span>
					<ChevronDown className="hidden h-4 w-4 shrink-0 text-ops-muted sm:block" aria-hidden />
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				<DropdownMenuItem asChild>
					<Link href="/ops/profile">{opsTopBarCopy.menuProfile}</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href="/ops/settings">{opsTopBarCopy.menuSettings}</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="text-ops-danger focus:bg-ops-danger/10 focus:text-ops-danger"
					onSelect={(e) => {
						e.preventDefault()
						void (async () => {
							const supabase = createClientClient()
							await supabase.auth.signOut()
							router.push('/ops/login')
							router.refresh()
						})()
					}}
				>
					{opsTopBarCopy.menuSignOut}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
