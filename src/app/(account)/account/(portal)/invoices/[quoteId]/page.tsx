import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'

import { QuoteRenderedHTMLViewer } from '@/features/account/components/QuoteRenderedHTMLViewer'
import {
	formatInvoiceArchiveQuoteStatus,
	loadAccountInvoiceQuoteForViewer,
} from '@/lib/account-invoices-archive-query'
import { requireAccountPortalRoles } from '@/lib/account-portal-auth'
import { createUserServerClient } from '@/lib/supabase/server'
import type { CustomerAccountMemberRoleDb } from '@/types/database.types'

const ADMIN_ONLY: ReadonlySet<CustomerAccountMemberRoleDb> = new Set(['admin'])

export const dynamic = 'force-dynamic'

const uuidSchema = z.string().uuid()

type PageProps = {
	params: Promise<{ quoteId: string }>
}

export default async function AccountInvoiceQuoteViewerPage({ params }: PageProps) {
	const { quoteId: rawId } = await params
	const parsed = uuidSchema.safeParse(rawId)
	if (!parsed.success) {
		notFound()
	}

	const session = await requireAccountPortalRoles(ADMIN_ONLY)
	const supabase = await createUserServerClient()
	const loaded = await loadAccountInvoiceQuoteForViewer(supabase, parsed.data, session.activeAccountId)
	if (!loaded) {
		notFound()
	}

	const html = loaded.rendered_html?.trim() ?? ''

	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<Link
						href="/account/invoices"
						className="text-sm font-medium text-primary underline-offset-4 hover:underline"
					>
						← Invoices &amp; quotes
					</Link>
					<h1 className="mt-3 text-2xl font-semibold tracking-tight">Quote snapshot</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						{session.activeAccount.name} · booking{' '}
						<span className="font-mono text-foreground">{loaded.booking_reference}</span> · version{' '}
						<span className="font-mono text-foreground">{loaded.version}</span> ·{' '}
						<span className="text-foreground">{formatInvoiceArchiveQuoteStatus(loaded.status)}</span>
					</p>
				</div>
				<Link
					href={`/account/bookings?id=${encodeURIComponent(loaded.booking_id)}`}
					className="text-sm font-medium text-primary underline-offset-4 hover:underline"
				>
					Open booking →
				</Link>
			</div>

			<section className="rounded-xl border border-border bg-card p-6 shadow-sm" aria-labelledby="snap-h">
				<h2 id="snap-h" className="text-lg font-semibold text-foreground">
					Immutable HTML (as sent)
				</h2>
				{html.length > 0 ? (
					<div className="mt-4">
						<QuoteRenderedHTMLViewer
							html={loaded.rendered_html ?? ''}
							title={`Quote version ${loaded.version} for booking ${loaded.booking_reference}`}
							caption="This content is the stored snapshot from booking_quotes.rendered_html — not regenerated from live templates."
						/>
					</div>
				) : (
					<p className="mt-4 text-sm text-muted-foreground">
						No stored HTML snapshot exists for this quote version. If you need a PDF or a re-sent copy,
						contact your Vestroo account team.
					</p>
				)}
			</section>
		</div>
	)
}
