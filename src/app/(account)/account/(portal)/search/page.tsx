import { accountStubPagesCopy } from '@/features/account/copy/account-stub-pages-copy'
import { requireAccountMemberPage } from '@/lib/account-portal-auth'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccountSearchPage({ searchParams }: PageProps) {
	await requireAccountMemberPage()
	const raw = await searchParams
	const q = raw.q
	const query = typeof q === 'string' ? q.trim() : ''

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold tracking-tight">{accountStubPagesCopy.searchTitle}</h1>
			{query ? (
				<p className="text-sm text-muted-foreground">
					{accountStubPagesCopy.searchWithQueryIntro}{' '}
					<span className="font-medium text-foreground">&ldquo;{query}&rdquo;</span>{' '}
					{accountStubPagesCopy.searchComing}
				</p>
			) : (
				<p className="text-sm text-muted-foreground">{accountStubPagesCopy.searchEmptyHint}</p>
			)}
		</div>
	)
}
