/**
 * Public ops routes (`/ops/login`, `/ops/unauthorized`) — light ops theme scope only.
 * Authenticated `/ops/*` sets `data-ops-theme="dark"` on the dashboard shell (Story 17.19 / FE.17.11).
 */
export default function PublicOpsLayout({ children }: { children: React.ReactNode }) {
	return (
		<div
			data-ops-theme="light"
			className="min-h-screen bg-ops-canvas text-ops-foreground antialiased"
		>
			{children}
		</div>
	)
}
