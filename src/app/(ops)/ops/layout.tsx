import { OpsShellClient } from '@/features/ops/components/OpsShellClient'
import { requireOpsStaffPage } from '@/lib/ops-auth'

export default async function OpsShellLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const staff = await requireOpsStaffPage()

	return (
		<div
			className="min-h-screen bg-ops-canvas text-ops-foreground antialiased"
			data-ops-theme="dark"
		>
			<a
				href="#ops-main"
				className="absolute left-[-10000px] top-auto z-[100] h-px w-px overflow-hidden focus:left-4 focus:top-4 focus:h-auto focus:w-auto focus:overflow-visible focus:rounded-md focus:border focus:border-ops-border focus:bg-ops-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ops-foreground focus:outline-none focus:ring-2 focus:ring-ops"
			>
				Skip to main content
			</a>
			<OpsShellClient staff={staff}>{children}</OpsShellClient>
		</div>
	)
}
