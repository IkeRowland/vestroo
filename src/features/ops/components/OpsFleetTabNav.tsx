'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const VEHICLES_HREF = '/ops/fleet/vehicles'
const FLEET_DRIVERS_HREF = '/ops/fleet/drivers'
const CATEGORIES_HREF = '/ops/fleet/categories'

export type OpsFleetTabNavProps = {
	className?: string
}

export function OpsFleetTabNav({ className }: OpsFleetTabNavProps) {
	const pathname = usePathname()
	const onVehicles = pathname === '/ops/fleet/vehicles'
	const onFleetDrivers = pathname.startsWith('/ops/fleet/drivers')
	const onCategories = pathname.startsWith('/ops/fleet/categories')

	return (
		<div
			className={cn('inline-flex rounded-md border border-ops-border p-0.5', className)}
			role="tablist"
			aria-label="Fleet sections"
		>
			<Button
				type="button"
				size="sm"
				variant={onFleetDrivers ? 'default' : 'ghost'}
				className={cn(onFleetDrivers ? 'shadow-sm' : 'text-ops-muted')}
				asChild
			>
				<Link href={FLEET_DRIVERS_HREF} scroll={false} role="tab" aria-selected={onFleetDrivers}>
					Drivers
				</Link>
			</Button>
			<Button
				type="button"
				size="sm"
				variant={onVehicles ? 'default' : 'ghost'}
				className={cn(onVehicles ? 'shadow-sm' : 'text-ops-muted')}
				asChild
			>
				<Link href={VEHICLES_HREF} scroll={false} role="tab" aria-selected={onVehicles}>
					Vehicles
				</Link>
			</Button>
			<Button
				type="button"
				size="sm"
				variant={onCategories ? 'default' : 'ghost'}
				className={cn(onCategories ? 'shadow-sm' : 'text-ops-muted')}
				asChild
			>
				<Link href={CATEGORIES_HREF} scroll={false} role="tab" aria-selected={onCategories}>
					Categories
				</Link>
			</Button>
		</div>
	)
}
