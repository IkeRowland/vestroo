import { OpsShellClient } from '@/features/ops/components/OpsShellClient'
import { requireOpsStaffPage } from '@/lib/ops-auth'

export default async function OpsShellLayout({
	children,
}: {
	children: React.ReactNode
}) {
	const staff = await requireOpsStaffPage()

	return (
		<div className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
			<a
				href="#ops-main"
				className="absolute left-[-10000px] top-auto z-[100] h-px w-px overflow-hidden focus:left-4 focus:top-4 focus:h-auto focus:w-auto focus:overflow-visible focus:rounded-md focus:border focus:border-zinc-600 focus:bg-zinc-900 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500"
			>
				Skip to main content
			</a>
			<OpsShellClient staff={staff}>{children}</OpsShellClient>
		</div>
	)
}
