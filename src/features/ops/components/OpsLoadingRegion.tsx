import type { LoadingRegionProps } from '@/components/saas/LoadingRegion'
import { LoadingRegion } from '@/components/saas/LoadingRegion'

export type OpsLoadingRegionProps = Omit<LoadingRegionProps, 'theme'>

/** Thin wrapper — implementation: **`LoadingRegion`**. */
export function OpsLoadingRegion(props: OpsLoadingRegionProps) {
	return <LoadingRegion {...props} theme="ops" />
}
