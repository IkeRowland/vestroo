import type { KpiCardProps } from '@/components/saas/KpiCard'
import { KpiCard } from '@/components/saas/KpiCard'

export type OpsKpiCardProps = Omit<KpiCardProps, 'theme'>

/** Thin wrapper — implementation: **`KpiCard`** (**`src/components/saas/KpiCard.tsx`**). */
export function OpsKpiCard(props: OpsKpiCardProps) {
	return <KpiCard {...props} theme="ops" />
}
