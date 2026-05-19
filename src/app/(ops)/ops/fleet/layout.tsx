import { OpsFleetTabNav } from '@/features/ops/components/OpsFleetTabNav'
import { OpsPageHeader } from '@/features/ops/components/ops-primitives'
import { opsFleetShellCopy } from '@/features/ops/copy/ops-fleet-shell-copy'

export default function OpsFleetLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-w-0 max-w-full">
			<OpsPageHeader
				title={opsFleetShellCopy.pageTitle}
				description={opsFleetShellCopy.pageDescription}
			/>
			<OpsFleetTabNav className="mt-4" />
			{children}
		</div>
	)
}
