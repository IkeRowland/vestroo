import { redirect } from 'next/navigation'

import { ACCOUNT_BILLING_INVOICES_LIST_PATH } from '@/lib/account-invoices-list-query'

export default function AccountBillingIndexRedirect() {
	redirect(ACCOUNT_BILLING_INVOICES_LIST_PATH)
}
