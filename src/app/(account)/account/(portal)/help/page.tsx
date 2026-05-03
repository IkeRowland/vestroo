import { EmptyState } from '@/components/saas/EmptyState'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
	accountHelpCopy,
	getDisplayedAccountHelpFaqEntries,
} from '@/features/account/copy/account-help-copy'
import { requireAccountMemberPage } from '@/lib/account-portal-auth'
import { resolveSupportContactLine, resolveSupportEmailAddress } from '@/lib/email/email-copy'

export const dynamic = 'force-dynamic'

function resolveOptionalStatusPageUrl(): string | null {
	const raw = process.env.NEXT_PUBLIC_STATUS_PAGE_URL?.trim()
	if (!raw) return null
	try {
		const u = new URL(raw)
		return u.protocol === 'http:' || u.protocol === 'https:' ? raw : null
	} catch {
		return null
	}
}

export default async function AccountHelpPage() {
	await requireAccountMemberPage()

	const supportEmail = resolveSupportEmailAddress()
	const supportContactLine = resolveSupportContactLine()
	const statusUrl = resolveOptionalStatusPageUrl()
	const faqRows = getDisplayedAccountHelpFaqEntries()

	return (
		<div className="min-w-0 space-y-8">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight text-account-foreground">
					{accountHelpCopy.pageTitle}
				</h1>
				<p className="mt-1 max-w-2xl text-sm text-account-muted">{accountHelpCopy.pageDescription}</p>
			</div>

			<Card className="border-account-border bg-card shadow-sm">
				<CardHeader className="border-b border-account-border pb-4">
					<h2 className="text-lg font-semibold text-account-foreground">{accountHelpCopy.faqSectionTitle}</h2>
					<p className="text-sm text-account-muted">{accountHelpCopy.faqSectionDescription}</p>
				</CardHeader>
				<CardContent className="pt-6">
					{faqRows.length === 0 ? (
						<EmptyState
							theme="account"
							title={accountHelpCopy.emptyFaqTitle}
							description={accountHelpCopy.emptyFaqBody}
						/>
					) : (
						<dl className="space-y-8">
							{faqRows.map((row) => (
								<div key={row.id}>
									<dt>
										<h3 className="text-base font-semibold text-account-foreground">{row.question}</h3>
									</dt>
									<dd className="mt-2 text-sm text-account-muted">{row.answer}</dd>
								</div>
							))}
						</dl>
					)}
				</CardContent>
			</Card>

			<Card className="border-account-border bg-card shadow-sm">
				<CardHeader className="border-b border-account-border pb-4">
					<h2 className="text-lg font-semibold text-account-foreground">{accountHelpCopy.contactSectionTitle}</h2>
					<p className="text-sm text-account-muted">{accountHelpCopy.contactSectionDescription}</p>
				</CardHeader>
				<CardContent className="space-y-4 pt-6">
					<p>
						<a
							href={`mailto:${supportEmail}`}
							className="inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground ring-offset-background transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
						>
							{accountHelpCopy.contactEmailCtaPrefix} {supportEmail}
						</a>
					</p>
					<p className="text-sm text-account-muted">{supportContactLine}</p>
					<p className="text-sm text-account-muted">{accountHelpCopy.supportGuidanceBody}</p>
				</CardContent>
			</Card>

			{statusUrl ? (
				<Card className="border-account-border bg-card shadow-sm">
					<CardHeader className="border-b border-account-border pb-4">
						<h2 className="text-lg font-semibold text-account-foreground">{accountHelpCopy.statusSectionTitle}</h2>
					</CardHeader>
					<CardContent className="pt-6">
						<p className="text-sm text-account-muted">
							<a
								href={statusUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="font-medium text-primary underline-offset-4 hover:underline"
							>
								{accountHelpCopy.statusLinkLabel}
							</a>{' '}
							<span className="text-account-muted">{accountHelpCopy.statusExternalHint}</span>
						</p>
					</CardContent>
				</Card>
			) : null}
		</div>
	)
}
