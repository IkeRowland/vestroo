'use client'

import type { ComponentProps } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown } from 'lucide-react'

import type { OpsBookingIntentFilterValue } from '@/lib/ops-booking-grid-query'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { accountBookingsCopy } from '@/features/account/copy/account-bookings-copy'
import {
	ACCT_PARAM,
	accountBookingsListHref,
	formatAccountBookingsIntentChipLabel,
	formatQueueStatusLabel,
	toggleAccountBookingsIntent,
	toggleAccountBookingsStatus,
	toggleAccountBookingsTripType,
	type AccountBookingsListParsed,
	type AccountBookingsTimeWindow,
	type AccountBookingsTripTypeKey,
} from '@/lib/account-bookings-list-query'
import {
	OPS_BOOKINGS_QUEUE_INTENT_CHIP_VALUES,
	type OpsBookingsQueueStatusValue,
} from '@/lib/ops-bookings-queue-query'

const TRIP_TYPE_CHIPS: { key: AccountBookingsTripTypeKey; label: string }[] = [
	{ key: 'p2p', label: accountBookingsCopy.filtersTripP2p },
	{ key: 'hourly', label: accountBookingsCopy.filtersTripHourly },
	{ key: 'tour', label: accountBookingsCopy.filtersTripTour },
	{ key: 'cp', label: accountBookingsCopy.filtersTripCp },
]

const TIME_WINDOWS: { value: AccountBookingsTimeWindow; label: string }[] = [
	{ value: 'all', label: accountBookingsCopy.filtersWindowAll },
	{ value: 'next_7d', label: accountBookingsCopy.filtersWindowNext7 },
	{ value: 'next_30d', label: accountBookingsCopy.filtersWindowNext30 },
	{ value: 'past_90d', label: accountBookingsCopy.filtersWindowPast90 },
]

const STATUS_SAMPLES: OpsBookingsQueueStatusValue[] = [
	'submitted',
	'quote_sent',
	'assigned',
	'completed',
	'cancelled',
]

const INTENT_CHIPS: OpsBookingIntentFilterValue[] = [...OPS_BOOKINGS_QUEUE_INTENT_CHIP_VALUES]

const MENU_CONTENT = cn(
	'z-50 min-w-[12rem] max-w-[min(100vw-2rem,22rem)] border border-account-border bg-account-surface p-1 text-account-foreground shadow-account-1',
)

const MENU_ITEM = cn('focus:bg-account-surface-hover data-[highlighted]:bg-account-surface-hover')

const MENU_HEAD = 'px-2 py-1.5 text-left text-xs font-medium leading-tight text-account-muted'

function dateInputValue(isoDate: string | null): string {
	if (!isoDate) return ''
	return /^\d{4}-\d{2}-\d{2}$/.test(isoDate) ? isoDate : ''
}

function windowLabel(w: AccountBookingsTimeWindow): string {
	return TIME_WINDOWS.find((t) => t.value === w)?.label ?? accountBookingsCopy.filtersWindowAll
}

function statusTriggerLabel(parsed: AccountBookingsListParsed): string {
	if (parsed.epicStatusUpcoming) return accountBookingsCopy.filtersUpcomingTrips
	const n = parsed.statuses.length
	if (n === 0) return accountBookingsCopy.filtersAllStages
	if (n === 1) return formatQueueStatusLabel(parsed.statuses[0] as OpsBookingsQueueStatusValue)
	return accountBookingsCopy.filtersSelectedCount(n)
}

function tripTypeTriggerLabel(parsed: AccountBookingsListParsed): string {
	const n = parsed.tripTypes.length
	if (n === 0) return accountBookingsCopy.filtersAllTripTypes
	if (n === 1) {
		const row = TRIP_TYPE_CHIPS.find((c) => c.key === parsed.tripTypes[0])
		return row?.label ?? accountBookingsCopy.filtersAllTripTypes
	}
	return accountBookingsCopy.filtersSelectedCount(n)
}

function intentTriggerLabel(parsed: AccountBookingsListParsed): string {
	const n = parsed.intents.length
	if (n === 0) return accountBookingsCopy.filtersAllProductTags
	if (n === 1) return formatAccountBookingsIntentChipLabel(parsed.intents[0])
	return accountBookingsCopy.filtersSelectedCount(n)
}

function FilterMenuTriggerButton({ children, className, ...rest }: ComponentProps<typeof Button>) {
	return (
		<Button
			type="button"
			variant="outline"
			className={cn(
				'bg-card h-9 w-full min-w-0 max-w-full justify-between gap-2 sm:w-[11.5rem] sm:min-w-[11.5rem] sm:max-w-[11.5rem]',
				className,
			)}
			{...rest}
		>
			{children}
		</Button>
	)
}

export function AccountBookingsFilters({ parsed }: { parsed: AccountBookingsListParsed }) {
	const router = useRouter()
	const [from, setFrom] = useState(dateInputValue(parsed.dateFrom))
	const [to, setTo] = useState(dateInputValue(parsed.dateTo))
	const [q, setQ] = useState(parsed.search)

	return (
		<div className="space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
			<div>
				<h2 className="text-sm font-semibold text-foreground">{accountBookingsCopy.filtersDateRange}</h2>
				<div className="mt-2 flex max-w-3xl flex-wrap items-end gap-2">
					<div className="space-y-1.5">
						<label className="text-xs text-muted-foreground" htmlFor="acct-from">
							{accountBookingsCopy.filtersFrom}
						</label>
						<Input
							id="acct-from"
							type="date"
							className="h-9 w-40"
							value={from}
							onChange={(e) => setFrom(e.target.value)}
						/>
					</div>
					<div className="space-y-1.5">
						<label className="text-xs text-muted-foreground" htmlFor="acct-to">
							{accountBookingsCopy.filtersTo}
						</label>
						<Input
							id="acct-to"
							type="date"
							className="h-9 w-40"
							value={to}
							onChange={(e) => setTo(e.target.value)}
						/>
					</div>
					<Button
						type="button"
						size="sm"
						variant="secondary"
						className="h-9"
						onClick={() => {
							router.push(
								accountBookingsListHref(parsed, {
									dateFrom: from || null,
									dateTo: to || null,
									page: 1,
									epicPeriodThisMonth: false,
									epicStatusUpcoming: false,
									selectedBookingId: null,
									window: 'all',
								}),
							)
						}}
					>
						{accountBookingsCopy.filtersApplyDates}
					</Button>
					<Button asChild type="button" size="sm" variant="ghost" className="h-9">
						<Link
							href={accountBookingsListHref(parsed, {
								dateFrom: null,
								dateTo: null,
								page: 1,
								selectedBookingId: null,
							})}
						>
							{accountBookingsCopy.filtersClearDates}
						</Link>
					</Button>
				</div>
			</div>

			<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<FilterMenuTriggerButton
							aria-label={`${accountBookingsCopy.filtersTimeWindow}: ${windowLabel(parsed.window)}`}
						>
							<span className="truncate text-left text-sm">{windowLabel(parsed.window)}</span>
							<ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
						</FilterMenuTriggerButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className={MENU_CONTENT}>
						<DropdownMenuLabel className={MENU_HEAD}>{accountBookingsCopy.filtersTimeWindow}</DropdownMenuLabel>
						<DropdownMenuRadioGroup
							value={parsed.window}
							onValueChange={(v) => {
								router.push(
									accountBookingsListHref(parsed, {
										window: v as AccountBookingsTimeWindow,
										page: 1,
										epicPeriodThisMonth: false,
										epicStatusUpcoming: false,
										selectedBookingId: null,
										dateFrom: null,
										dateTo: null,
									}),
								)
							}}
						>
							{TIME_WINDOWS.map(({ value, label }) => (
								<DropdownMenuRadioItem key={value} value={value} className={cn(MENU_ITEM, 'text-sm')}>
									{label}
								</DropdownMenuRadioItem>
							))}
						</DropdownMenuRadioGroup>
					</DropdownMenuContent>
				</DropdownMenu>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<FilterMenuTriggerButton aria-label={`${accountBookingsCopy.filtersStatus}: ${statusTriggerLabel(parsed)}`}>
							<span className="min-w-0 flex-1 truncate text-left text-sm">
								<span className="text-muted-foreground">{accountBookingsCopy.filtersStatus}: </span>
								{statusTriggerLabel(parsed)}
							</span>
							<ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
						</FilterMenuTriggerButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className={cn(MENU_CONTENT, 'max-h-[min(70vh,24rem)] overflow-y-auto')}>
						<DropdownMenuLabel className={MENU_HEAD}>
							<span className="line-clamp-2">{accountBookingsCopy.filtersStatusHint}</span>
						</DropdownMenuLabel>
						<DropdownMenuCheckboxItem
							checked={parsed.epicStatusUpcoming}
							onCheckedChange={(on) => {
								router.push(
									accountBookingsListHref(parsed, {
										epicStatusUpcoming: on,
										statuses: on ? [] : parsed.statuses,
										page: 1,
										selectedBookingId: null,
										epicPeriodThisMonth: false,
									}),
								)
							}}
							onSelect={(e) => e.preventDefault()}
							className={cn(MENU_ITEM, 'text-sm')}
						>
							{accountBookingsCopy.filtersUpcomingTrips}
						</DropdownMenuCheckboxItem>
						<DropdownMenuSeparator className="bg-account-border" />
						{STATUS_SAMPLES.map((status) => {
							const active = parsed.statuses.includes(status)
							return (
								<DropdownMenuCheckboxItem
									key={status}
									checked={active}
									onCheckedChange={() => {
										router.push(
											accountBookingsListHref(parsed, toggleAccountBookingsStatus(parsed, status)),
										)
									}}
									onSelect={(e) => e.preventDefault()}
									className={cn(MENU_ITEM, 'text-sm')}
								>
									{formatQueueStatusLabel(status)}
								</DropdownMenuCheckboxItem>
							)
						})}
						<DropdownMenuSeparator className="bg-account-border" />
						<DropdownMenuItem
							className={cn(MENU_ITEM, 'text-sm')}
							onSelect={() => {
								router.push(
									accountBookingsListHref(parsed, {
										statuses: [],
										page: 1,
										epicPeriodThisMonth: false,
										epicStatusUpcoming: false,
										selectedBookingId: null,
									}),
								)
							}}
						>
							{accountBookingsCopy.filtersStatusClear}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<FilterMenuTriggerButton
							aria-label={`${accountBookingsCopy.filtersTripType}: ${tripTypeTriggerLabel(parsed)}`}
						>
							<span className="min-w-0 flex-1 truncate text-left text-sm">
								<span className="text-muted-foreground">{accountBookingsCopy.filtersTripType}: </span>
								{tripTypeTriggerLabel(parsed)}
							</span>
							<ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
						</FilterMenuTriggerButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className={cn(MENU_CONTENT, 'max-h-[min(70vh,20rem)] overflow-y-auto')}>
						<DropdownMenuLabel className={MENU_HEAD}>
							<span className="line-clamp-2">{accountBookingsCopy.filtersTripTypeHint}</span>
						</DropdownMenuLabel>
						{TRIP_TYPE_CHIPS.map(({ key, label }) => {
							const active = parsed.tripTypes.includes(key)
							return (
								<DropdownMenuCheckboxItem
									key={key}
									checked={active}
									onCheckedChange={() => {
										router.push(
											accountBookingsListHref(parsed, toggleAccountBookingsTripType(parsed, key)),
										)
									}}
									onSelect={(e) => e.preventDefault()}
									className={cn(MENU_ITEM, 'text-sm')}
								>
									{label}
								</DropdownMenuCheckboxItem>
							)
						})}
					</DropdownMenuContent>
				</DropdownMenu>

				<div className="flex w-full min-w-0 flex-1 flex-col gap-1.5 sm:min-w-[14rem] sm:max-w-lg">
					<div className="text-xs text-muted-foreground sm:sr-only">{accountBookingsCopy.filtersSearch}</div>
					<div className="flex w-full min-w-0 flex-wrap items-end gap-2">
						<Input
							placeholder={accountBookingsCopy.filtersSearchPlaceholder}
							className="h-9 min-w-0 flex-1 sm:min-w-[8rem]"
							name={ACCT_PARAM.q}
							value={q}
							onChange={(e) => setQ(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault()
									router.push(
										accountBookingsListHref(parsed, { search: q, page: 1, selectedBookingId: null }),
									)
								}
							}}
						/>
						<Button
							type="button"
							size="sm"
							variant="secondary"
							className="h-9 shrink-0"
							onClick={() =>
								router.push(
									accountBookingsListHref(parsed, { search: q, page: 1, selectedBookingId: null }),
								)
							}
						>
							{accountBookingsCopy.filtersSearchButton}
						</Button>
						<Button
							type="button"
							variant="link"
							size="sm"
							className="h-9 shrink-0 px-2 text-muted-foreground"
							onClick={() => {
								setQ('')
								router.push(
									accountBookingsListHref(parsed, { search: '', page: 1, selectedBookingId: null }),
								)
							}}
						>
							{accountBookingsCopy.filtersSearchClear}
						</Button>
					</div>
				</div>

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<FilterMenuTriggerButton
							aria-label={`${accountBookingsCopy.filtersIntentShort}: ${intentTriggerLabel(parsed)} (${accountBookingsCopy.filtersIntentLegacy})`}
						>
							<span className="min-w-0 flex-1 truncate text-left text-sm">
								<span className="text-muted-foreground">
									{accountBookingsCopy.filtersIntentShort}
									{': '}
								</span>
								{intentTriggerLabel(parsed)}
							</span>
							<ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
						</FilterMenuTriggerButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className={cn(MENU_CONTENT, 'max-h-[min(70vh,24rem)] overflow-y-auto')}>
						<DropdownMenuLabel className={MENU_HEAD}>
							{accountBookingsCopy.filtersIntentLegacy}
						</DropdownMenuLabel>
						{INTENT_CHIPS.map((intent) => {
							const active = parsed.intents.includes(intent)
							return (
								<DropdownMenuCheckboxItem
									key={intent}
									checked={active}
									onCheckedChange={() => {
										router.push(
											accountBookingsListHref(parsed, toggleAccountBookingsIntent(parsed, intent)),
										)
									}}
									onSelect={(e) => e.preventDefault()}
									className={cn(MENU_ITEM, 'text-sm')}
								>
									{formatAccountBookingsIntentChipLabel(intent)}
								</DropdownMenuCheckboxItem>
							)
						})}
						<DropdownMenuSeparator className="bg-account-border" />
						<DropdownMenuItem
							className={cn(MENU_ITEM, 'text-sm')}
							onSelect={() => {
								router.push(
									accountBookingsListHref(parsed, {
										intents: [],
										page: 1,
										epicPeriodThisMonth: false,
										epicStatusUpcoming: false,
									}),
								)
							}}
						>
							{accountBookingsCopy.filtersIntentClear}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	)
}
