'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import { Select } from '@/components/ui/select'
import { OPS_BOOKINGS_PATH } from '@/features/ops/ops-bookings-url'
import type { OpsBookingIntentFilterValue } from '@/lib/ops-booking-grid-query'
import {
	formatQueueIntentFilterLabel,
	formatQueueStatusLabel,
	OPS_BOOKINGS_QUEUE_INTENT_CHIP_VALUES,
	OPS_BOOKINGS_QUEUE_PAYMENT_ORDER,
	OPS_BOOKINGS_QUEUE_STATUS_ORDER,
	opsBookingsQueueHref,
	type OpsBookingsQueueParsed,
	type OpsBookingsQueuePaymentValue,
	type OpsBookingsQueueStatusValue,
} from '@/lib/ops-bookings-queue-query'
import { cn } from '@/lib/utils'

const SELECT_OPS =
	'min-h-10 w-full min-w-0 rounded-md border border-ops-border bg-ops-canvas px-3 py-2 text-sm text-ops-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas disabled:cursor-not-allowed disabled:opacity-50'

function singleOrMultiValue(values: readonly string[]): '' | '__multi__' | string {
	if (values.length === 0) {
		return ''
	}
	if (values.length === 1) {
		return values[0]
	}
	return '__multi__'
}

export type OpsBookingsQueueFiltersProps = {
	parsed: OpsBookingsQueueParsed
	className?: string
	/** Defaults to `/ops/bookings` — account client detail passes its own path. */
	pathname?: string
	clearHref?: string
	hideClientFilter?: boolean
}

export function OpsBookingsQueueFilters({
	parsed,
	className,
	pathname = OPS_BOOKINGS_PATH,
	clearHref = OPS_BOOKINGS_PATH,
	hideClientFilter = false,
}: OpsBookingsQueueFiltersProps) {
	const router = useRouter()

	const patch = (overrides: Partial<OpsBookingsQueueParsed>) => {
		router.push(opsBookingsQueueHref(parsed, overrides, pathname))
	}

	const statusValue = singleOrMultiValue(parsed.statuses)
	const paymentValue = singleOrMultiValue(parsed.payments)
	const intentValue = singleOrMultiValue(parsed.intents)
	const clientValue = singleOrMultiValue(parsed.clients)

	return (
		<div
			data-testid="ops-bookings-queue-filters"
			className={cn(
				'border-b border-ops-border bg-ops-surface/40 p-3 sm:p-4',
				className,
			)}
		>
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
				<div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					<div className="min-w-0 space-y-1.5">
						<label
							htmlFor="ops-bookings-filter-status"
							className="block text-xs font-medium text-ops-muted"
						>
							Status
						</label>
						<Select
							id="ops-bookings-filter-status"
							className={SELECT_OPS}
							value={statusValue}
							onChange={(e) => {
								const v = e.target.value
								if (v === '') {
									patch({ statuses: [] })
								} else {
									patch({ statuses: [v as OpsBookingsQueueStatusValue] })
								}
							}}
							aria-label="Filter by booking status"
						>
							<option value="">All statuses</option>
							{statusValue === '__multi__' ? (
								<option value="__multi__" disabled>
									Multiple selected (choose one or clear)
								</option>
							) : null}
							{OPS_BOOKINGS_QUEUE_STATUS_ORDER.map((value) => (
								<option key={value} value={value}>
									{formatQueueStatusLabel(value)}
								</option>
							))}
						</Select>
					</div>

					<div className="min-w-0 space-y-1.5">
						<label
							htmlFor="ops-bookings-filter-payment"
							className="block text-xs font-medium text-ops-muted"
						>
							Payment
						</label>
						<Select
							id="ops-bookings-filter-payment"
							className={SELECT_OPS}
							value={paymentValue}
							onChange={(e) => {
								const v = e.target.value
								if (v === '') {
									patch({ payments: [] })
								} else {
									patch({ payments: [v as OpsBookingsQueuePaymentValue] })
								}
							}}
							aria-label="Filter by payment status"
						>
							<option value="">All payments</option>
							{paymentValue === '__multi__' ? (
								<option value="__multi__" disabled>
									Multiple selected (choose one or clear)
								</option>
							) : null}
							{OPS_BOOKINGS_QUEUE_PAYMENT_ORDER.map((value) => (
								<option key={value} value={value}>
									{formatQueueStatusLabel(value)}
								</option>
							))}
						</Select>
					</div>

					<div className="min-w-0 space-y-1.5">
						<label
							htmlFor="ops-bookings-filter-intent"
							className="block text-xs font-medium text-ops-muted"
						>
							Intent
						</label>
						<Select
							id="ops-bookings-filter-intent"
							className={SELECT_OPS}
							value={intentValue}
							onChange={(e) => {
								const v = e.target.value
								if (v === '') {
									patch({ intents: [] })
								} else {
									patch({ intents: [v as OpsBookingIntentFilterValue] })
								}
							}}
							aria-label="Filter by booking intent"
						>
							<option value="">All intents</option>
							{intentValue === '__multi__' ? (
								<option value="__multi__" disabled>
									Multiple selected (choose one or clear)
								</option>
							) : null}
							{OPS_BOOKINGS_QUEUE_INTENT_CHIP_VALUES.map((value) => (
								<option key={value} value={value}>
									{formatQueueIntentFilterLabel(value)}
								</option>
							))}
						</Select>
					</div>

					{hideClientFilter ? null : (
						<div className="min-w-0 space-y-1.5">
							<label
								htmlFor="ops-bookings-filter-client"
								className="block text-xs font-medium text-ops-muted"
							>
								Client
							</label>
							<Select
								id="ops-bookings-filter-client"
								className={SELECT_OPS}
								value={clientValue}
								onChange={(e) => {
									const v = e.target.value
									if (v === '') {
										patch({ clients: [] })
									} else if (v === 'walk_in') {
										patch({ clients: ['walk_in'] })
									} else {
										patch({ clients: ['account_client'] })
									}
								}}
								aria-label="Filter by client type"
							>
								<option value="">All clients</option>
								{clientValue === '__multi__' ? (
									<option value="__multi__" disabled>
										Walk-in + Account (pick one or clear)
									</option>
								) : null}
								<option value="walk_in">Walk-in</option>
								<option value="account_client">Account</option>
							</Select>
						</div>
					)}
				</div>

				<div className="flex shrink-0 items-end">
					<Link
						href={clearHref}
						className="inline-flex min-h-10 w-full items-center justify-center whitespace-nowrap rounded-md border border-ops-border bg-ops-surface px-4 text-sm font-medium text-ops-foreground transition-colors hover:border-primary/40 hover:bg-ops-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas sm:w-auto"
					>
						Clear all filters
					</Link>
				</div>
			</div>
		</div>
	)
}
