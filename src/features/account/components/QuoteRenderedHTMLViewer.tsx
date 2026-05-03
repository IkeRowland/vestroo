type QuoteRenderedHTMLViewerProps = {
	/** Stored HTML snapshot (e.g. `booking_quotes.rendered_html`). */
	html: string
	/** Accessible name for the iframe. */
	title: string
	/** Optional short note above the viewer. */
	caption?: string
}

/**
 * Read-only display of stored quote / confirmation HTML (Epic 15 **15A.4**).
 * Same pattern as ops **`quote-detail-panel`**: `iframe` + `sandbox=""` + `srcDoc` (no scripts).
 * **15A.7** archive viewer should reuse this component when that story ships.
 */
export function QuoteRenderedHTMLViewer({ html, title, caption }: QuoteRenderedHTMLViewerProps) {
	const trimmed = html.trim()
	if (!trimmed) return null

	return (
		<details className="rounded-lg border border-border bg-muted/20">
			<summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-foreground">
				View rendered quote / email
			</summary>
			<div className="border-t border-border p-4">
				{caption ? <p className="mb-3 text-xs text-muted-foreground">{caption}</p> : null}
				<p className="mb-3 text-xs text-muted-foreground">
					Stored HTML as sent — not re-rendered from templates (audit trail).
				</p>
				<iframe
					title={title}
					sandbox=""
					srcDoc={trimmed}
					className="h-[min(28rem,70vh)] w-full rounded-md border border-border bg-white"
				/>
			</div>
		</details>
	)
}
