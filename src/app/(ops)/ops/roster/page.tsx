import { redirectLegacyOpsRoute } from '@/lib/ops-legacy-route-redirect'
import { OPS_FLEET_DRIVERS_PATH } from '@/lib/ops-fleet-drivers-url'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Legacy URL: **`/ops/roster`** → **`/ops/fleet/drivers`**. */
export default async function RedirectLegacyOpsRoster({ searchParams }: PageProps) {
	const raw = await searchParams
	redirectLegacyOpsRoute(OPS_FLEET_DRIVERS_PATH, raw)
}
