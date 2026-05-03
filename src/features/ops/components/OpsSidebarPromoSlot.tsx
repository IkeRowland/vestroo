'use client'

import Image from 'next/image'
import Link from 'next/link'

import { opsSidebarCopy } from '@/features/ops/copy/ops-sidebar-copy'
import { isOpsSidebarPromoEnabled } from '@/lib/ops-sidebar-promo-env'
import { cn } from '@/lib/utils'

type PromoPayload = {
	title: string
	body?: string
	href?: string
	imageUrl?: string
}

function parsePromoJson(raw: string | undefined): PromoPayload | null {
	if (!raw?.trim()) return null
	try {
		const j = JSON.parse(raw) as unknown
		if (!j || typeof j !== 'object') return null
		const o = j as Record<string, unknown>
		const title = typeof o.title === 'string' ? o.title.trim() : ''
		if (!title) return null
		return {
			title,
			body: typeof o.body === 'string' ? o.body : undefined,
			href: typeof o.href === 'string' ? o.href : undefined,
			imageUrl: typeof o.imageUrl === 'string' ? o.imageUrl : undefined,
		}
	} catch {
		return null
	}
}

function isSafeRelativeOpsHref(href: string): boolean {
	const t = href.trim()
	return t.startsWith('/') && !t.startsWith('//')
}

function isAllowedImageUrl(url: string): boolean {
	const t = url.trim()
	if (t.startsWith('/')) return true
	if (typeof window === 'undefined') return false
	try {
		return new URL(t).origin === window.location.origin
	} catch {
		return false
	}
}

export function OpsSidebarPromoSlot() {
	const enabled = isOpsSidebarPromoEnabled()
	const payload = parsePromoJson(process.env.NEXT_PUBLIC_OPS_SIDEBAR_PROMO_JSON)

	if (!enabled) {
		return null
	}

	const data =
		payload ??
		({
			title: opsSidebarCopy.promoFallbackTitle,
			body: opsSidebarCopy.promoFallbackBody,
		} satisfies PromoPayload)

	const href = data.href?.trim()
	const safeHref = href && isSafeRelativeOpsHref(href) ? href : undefined
	const img = data.imageUrl?.trim()
	const showImg = Boolean(img && isAllowedImageUrl(img!))
	const imgIsRelative = img?.startsWith('/') ?? false

	const inner = (
		<div
			className={cn(
				'rounded-ops-card border border-ops-border bg-ops-surface-hover/50 p-3 text-sm shadow-ops-1',
				safeHref && 'transition hover:border-ops-accent/40 hover:shadow-ops-2',
			)}
		>
			<div className="flex gap-3">
				{showImg && imgIsRelative ? (
					<span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-ops-border bg-ops-canvas">
						<Image
							src={img!}
							alt={opsSidebarCopy.promoImageAlt}
							fill
							className="object-cover"
							sizes="56px"
						/>
					</span>
				) : showImg ? (
					// eslint-disable-next-line @next/next/no-img-element -- same-origin URLs from env; avoids remotePatterns churn
					<img
						src={img!}
						alt={opsSidebarCopy.promoImageAlt}
						className="h-14 w-14 shrink-0 rounded-md border border-ops-border object-cover"
					/>
				) : null}
				<div className="min-w-0 flex-1">
					<p className="font-semibold text-ops-foreground">{data.title}</p>
					{data.body ? (
						<p className="mt-1 text-xs leading-snug text-ops-muted">{data.body}</p>
					) : null}
				</div>
			</div>
		</div>
	)

	if (safeHref) {
		return (
			<div className="mt-2 shrink-0 border-t border-ops-border pt-3">
				<Link href={safeHref} className="block outline-none ring-offset-ops-canvas focus-visible:ring-2 focus-visible:ring-ops">
					{inner}
				</Link>
			</div>
		)
	}

	return <div className="mt-2 shrink-0 border-t border-ops-border pt-3">{inner}</div>
}
