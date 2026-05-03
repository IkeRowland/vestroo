'use client'

import type { KpiCardOverflowMenuProps } from '@/components/saas/KpiCardOverflowMenu'
import { KpiCardOverflowMenu } from '@/components/saas/KpiCardOverflowMenu'

export type OpsKpiCardOverflowMenuProps = Omit<KpiCardOverflowMenuProps, 'theme'>

/** Thin wrapper — implementation: **`KpiCardOverflowMenu`**. */
export function OpsKpiCardOverflowMenu(props: OpsKpiCardOverflowMenuProps) {
	return <KpiCardOverflowMenu {...props} theme="ops" />
}
