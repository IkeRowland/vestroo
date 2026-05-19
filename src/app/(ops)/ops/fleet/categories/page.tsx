import { OpsDataFreshnessBar } from '@/features/ops/components/OpsDataFreshnessBar'
import { OpsFetchErrorIsland } from '@/features/ops/components/OpsFetchErrorIsland'
import { OpsEmptyState } from '@/features/ops/components/ops-primitives'
import { OpsFleetCategoriesPanel } from '@/features/ops/components/OpsFleetCategoriesPanel'
import { opsFleetCategoriesCopy } from '@/features/ops/copy/ops-fleet-categories-copy'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function OpsFleetCategoriesTabPage() {
	const fetchedAtIso = new Date().toISOString()
	const supabase = await createUserServerClient()

	const { data: rows, error } = await supabase
		.from('vehicle_categories')
		.select('id, name, description, number_of_seat, image_url, is_active')
		.order('name')

	if (error) {
		return (
			<div className="mt-4">
				<OpsFetchErrorIsland title="Categories could not be loaded" message={error.message} />
			</div>
		)
	}

	const list =
		(rows ?? []).map((r) => ({
			id: r.id as string,
			name: String(r.name ?? ''),
			description: String(r.description ?? ''),
			number_of_seat: Number(r.number_of_seat) || 0,
			image_url: (r.image_url as string | null) ?? null,
			is_active: r.is_active !== false,
		})) ?? []

	return (
		<div className="mt-4 min-w-0 max-w-full space-y-4">
			<OpsDataFreshnessBar fetchedAtIso={fetchedAtIso} />
			{list.length === 0 ? (
				<OpsEmptyState
					title={opsFleetCategoriesCopy.emptyListTitle}
					description={opsFleetCategoriesCopy.emptyListDescription}
				/>
			) : null}
			<OpsFleetCategoriesPanel rows={list} />
		</div>
	)
}
