'use client'

import type { SplitViewProps } from '@/components/saas/SplitView'
import { SplitView } from '@/components/saas/SplitView'
import { opsSplitViewCopy } from '@/features/ops/copy/ops-split-view-copy'

export type OpsSplitViewProps = Omit<SplitViewProps, 'theme' | 'detailSheetDialogTitle'>

/** Thin wrapper — implementation: **`SplitView`** (**FE.17.5** / **FE.18.13**). */
export function OpsSplitView(props: OpsSplitViewProps) {
	return (
		<SplitView
			{...props}
			theme="ops"
			detailSheetDialogTitle={opsSplitViewCopy.detailSheetDialogTitle}
		/>
	)
}
