import Image from 'next/image'

import { saasCls } from '@/components/saas/saas-class-names'
import type { SaasTheme } from '@/components/saas/saas-theme'
import { opsAvatarInitialsFromName } from '@/features/ops/lib/ops-avatar-initials'
import { cn } from '@/lib/utils'

export type AvatarCellProps = {
	theme?: SaasTheme
	src?: string | null
	name: string
	secondary?: string | null
	className?: string
}

export function AvatarCell({ theme = 'ops', src, name, secondary, className }: AvatarCellProps) {
	const trimmedSrc = typeof src === 'string' ? src.trim() : ''
	const showImage = trimmedSrc.length > 0
	const initials = opsAvatarInitialsFromName(name)

	const ring = saasCls(
		theme,
		'relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-ops-surface-active ring-1 ring-ops-border',
		'relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-account-surface-hover ring-1 ring-account-border',
	)
	const fg = saasCls(theme, 'text-ops-foreground', 'text-account-foreground')
	const muted = saasCls(theme, 'text-ops-muted', 'text-account-muted')

	return (
		<div className={cn('flex min-w-0 items-center gap-3', className)}>
			<div className={ring} aria-hidden>
				{showImage ? (
					<Image
						src={trimmedSrc}
						alt=""
						width={32}
						height={32}
						className="h-full w-full object-cover"
						sizes="32px"
					/>
				) : (
					<span
						className={cn(
							'flex h-full w-full items-center justify-center text-[11px] font-semibold tabular-nums',
							fg,
						)}
					>
						{initials}
					</span>
				)}
			</div>
			<div className="min-w-0 flex-1">
				<p className={cn('truncate text-sm font-semibold', fg)}>{name}</p>
				{secondary ? <p className={cn('truncate text-xs', muted)}>{secondary}</p> : null}
			</div>
		</div>
	)
}
