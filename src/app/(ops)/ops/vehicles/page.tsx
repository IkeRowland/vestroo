import { redirectLegacyOpsRoute } from '@/lib/ops-legacy-route-redirect'
import { OPS_FLEET_PATH } from '@/lib/ops-vehicles-url'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

/** Legacy URL: **`/ops/vehicles`** → **`/ops/fleet/vehicles`**. */
export default async function RedirectLegacyOpsVehicles({ searchParams }: PageProps) {
	const raw = await searchParams
	redirectLegacyOpsRoute(OPS_FLEET_PATH, raw)
}