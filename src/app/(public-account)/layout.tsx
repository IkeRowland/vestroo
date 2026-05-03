/**
 * Public account auth subtree (**Story 18.11** / **FE.18.10**).
 * **`data-account-theme`** is confined here — **NFR.18.4** (no marketing / **`/ops/*`** leakage).
 */
export default function PublicAccountLayout({ children }: { children: React.ReactNode }) {
	return (
		<div
			data-account-theme="light"
			className="flex min-h-screen flex-col bg-account-canvas text-account-foreground antialiased"
		>
			<div className="flex w-full min-w-0 flex-1 flex-col items-center justify-center px-3 py-10 sm:px-4">
				{children}
			</div>
		</div>
	)
}
