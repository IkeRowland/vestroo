import type { StatusPillProps } from '@/components/saas/StatusPill'
import { StatusPill } from '@/components/saas/StatusPill'

export type OpsStatusPillProps = Omit<StatusPillProps, 'theme'>

/** Thin wrapper — implementation: **`StatusPill`**. */
export function OpsStatusPill(props: OpsStatusPillProps) {
	return <StatusPill {...props} theme="ops" />
}
