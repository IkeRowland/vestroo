import type { EmptyStateProps } from '@/components/saas/EmptyState'
import { EmptyState } from '@/components/saas/EmptyState'

export type OpsEmptyStateProps = Omit<EmptyStateProps, 'theme'>

/** Thin wrapper — implementation: **`EmptyState`**. */
export function OpsEmptyState(props: OpsEmptyStateProps) {
	return <EmptyState {...props} theme="ops" />
}
