import { redirect } from 'next/navigation'

import { OPS_FLEET_DRIVERS_PATH } from '@/lib/ops-fleet-drivers-url'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

/**
 * Fleet index: default landing is the **Drivers** tab at **`/ops/fleet/drivers`**.
 * Preserves query string for bookmarks and deep links.
 */
export default async function OpsFleetIndexPage({ searchParams }: PageProps) {
	const raw = await searchParams
	const params = new URLSearchParams()
	for (const [key, val] of Object.entries(raw)) {
		if (val == null) continue
		const s = Array.isArray(val) ? val[0] : val
		if (s) params.set(key, s)
	}
	const q = params.toString()
	redirect(q ? `${OPS_FLEET_DRIVERS_PATH}?${q}` : OPS_FLEET_DRIVERS_PATH)
}
