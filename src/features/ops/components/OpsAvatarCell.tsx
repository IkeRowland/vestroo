import type { AvatarCellProps } from '@/components/saas/AvatarCell'
import { AvatarCell } from '@/components/saas/AvatarCell'

export type OpsAvatarCellProps = Omit<AvatarCellProps, 'theme'>

/** Thin wrapper — implementation: **`AvatarCell`**. */
export function OpsAvatarCell(props: OpsAvatarCellProps) {
	return <AvatarCell {...props} theme="ops" />
}
