'use client'

import { User } from 'lucide-react'
import Image from 'next/image'

import {
	normalizeOpsDriverAvatarObjectPosition,
	type OpsDriverAvatarObjectPosition,
} from '@/features/ops/lib/ops-driver-avatar-display'
import { cn } from '@/lib/utils'

export type OpsDriverAvatarThumbProps = {
	/** `profiles.avatar_url` */
	imageUrl: string | null | undefined
	/** `profiles.avatar_object_position` */
	objectPosition?: string | null
	/** Visible name for assistive text when a photo is present. */
	displayName: string
	/** Tailwind size classes (square). */
	sizeClassName?: string
	/** Passed to **`next/image`** `sizes`. */
	imageSizes?: string
	className?: string
}

export function OpsDriverAvatarThumb({
	imageUrl,
	objectPosition,
	displayName,
	sizeClassName = 'h-10 w-10',
	imageSizes = '40px',
	className,
}: OpsDriverAvatarThumbProps) {
	const url = imageUrl?.trim() ? imageUrl.trim() : null
	const pos: OpsDriverAvatarObjectPosition = normalizeOpsDriverAvatarObjectPosition(objectPosition)

	return (
		<div
			className={cn(
				'relative shrink-0 overflow-hidden rounded-full border border-ops-border bg-ops-surface-active',
				sizeClassName,
				className,
			)}
		>
			{url ? (
				<Image
					src={url}
					alt=""
					fill
					className="object-cover"
					style={{ objectPosition: pos }}
					sizes={imageSizes}
				/>
			) : (
				<div className="flex h-full w-full items-center justify-center text-ops-muted" aria-hidden>
					<User className="h-[45%] w-[45%] opacity-50" strokeWidth={1.5} />
				</div>
			)}
			<span className="sr-only">{displayName}</span>
		</div>
	)
}
