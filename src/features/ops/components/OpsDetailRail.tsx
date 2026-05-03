'use client'

import type { DetailRailProps } from '@/components/saas/DetailRail'
import { DetailRail } from '@/components/saas/DetailRail'
import { opsSplitViewCopy } from '@/features/ops/copy/ops-split-view-copy'

export type OpsDetailRailProps = Omit<DetailRailProps, 'theme' | 'panelAriaLabel' | 'closeAriaLabel'>

/** Thin wrapper — implementation: **`DetailRail`**. */
export function OpsDetailRail(props: OpsDetailRailProps) {
	return (
		<DetailRail
			{...props}
			theme="ops"
			panelAriaLabel={opsSplitViewCopy.detailPanelAriaLabel}
			closeAriaLabel={opsSplitViewCopy.closeDetailAriaLabel}
		/>
	)
}
