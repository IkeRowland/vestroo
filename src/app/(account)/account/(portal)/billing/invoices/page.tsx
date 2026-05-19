import { AccountBillingArchiveListPage } from '@/features/account/components/AccountBillingArchiveListPage'

export const dynamic = 'force-dynamic'

type PageProps = {
	searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AccountBillingInvoicesPage({ searchParams }: PageProps) {
	return <AccountBillingArchiveListPage section="invoices" searchParams={searchParams} />
}
