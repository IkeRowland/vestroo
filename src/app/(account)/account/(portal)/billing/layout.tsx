import { AccountBillingSubNav } from '@/features/account/components/AccountBillingSubNav'

export default function AccountBillingLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="space-y-8">
			<AccountBillingSubNav />
			{children}
		</div>
	)
}
