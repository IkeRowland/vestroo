'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from 'react'

import { updateAccountCommsPreferencesAction } from '@/actions/accountCommsPreferences'
import {
	initialBillingEntityFormState,
	updateAccountDefaultBillingEntityAction,
} from '@/actions/accountPreferencesOrg'
import {
	ACCOUNT_PORTAL_PREFERENCES_TIME_ZONE_LABEL,
	accountPreferencesCopy,
} from '@/features/account/copy/account-preferences-copy'
import { cn } from '@/lib/utils'
import type { CommsPreferenceCategoryKey, CommsPreferencesState } from '@/types/comms-preferences'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

const selectClass = cn(
	'flex h-12 w-full rounded-lg border border-account-border bg-card px-3 text-sm text-account-foreground shadow-sm',
	'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas',
	'disabled:cursor-not-allowed disabled:opacity-50',
)

type AccountPreferencesPageContentProps = {
	initial: CommsPreferencesState
	memberEmail: string
	accountName: string
	highlight: CommsPreferenceCategoryKey | null
	isOrgAdmin: boolean
	initialDefaultBillingEntityRef: string | null
	billingEntityOptions: readonly string[]
}

export function AccountPreferencesPageContent({
	initial,
	memberEmail,
	accountName,
	highlight,
	isOrgAdmin,
	initialDefaultBillingEntityRef,
	billingEntityOptions,
}: AccountPreferencesPageContentProps) {
	const router = useRouter()
	const [informational, setInformational] = useState(initial.informational)
	const [marketing, setMarketing] = useState(initial.marketing)
	const [notifAlert, setNotifAlert] = useState<{ variant: 'success' | 'destructive'; text: string } | null>(null)
	const [notifPending, startNotifTransition] = useTransition()
	const highlightRef = useRef(false)

	const [billingState, billingFormAction, billingPending] = useActionState(
		updateAccountDefaultBillingEntityAction,
		initialBillingEntityFormState,
	)
	const prevBillingPending = useRef(false)

	useEffect(() => {
		setInformational(initial.informational)
		setMarketing(initial.marketing)
	}, [initial])

	useEffect(() => {
		if (!highlight || highlightRef.current) return
		const el = document.getElementById(`prefs-${highlight}`)
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' })
			highlightRef.current = true
		}
	}, [highlight])

	useEffect(() => {
		const ended = prevBillingPending.current && !billingPending
		prevBillingPending.current = billingPending
		if (ended && billingState.ok === true) {
			router.refresh()
		}
	}, [billingPending, billingState.ok, router])

	const saveNotifications = useCallback(() => {
		setNotifAlert(null)
		startNotifTransition(() => {
			void (async () => {
				const r = await updateAccountCommsPreferencesAction({
					informational,
					marketing,
					transactional: true,
				})
				if (!r.ok) {
					setNotifAlert({ variant: 'destructive', text: r.message })
					return
				}
				setNotifAlert({ variant: 'success', text: accountPreferencesCopy.notificationsSuccess })
				router.refresh()
			})()
		})
	}, [informational, marketing, router])

	const ringHighlight = (key: CommsPreferenceCategoryKey) =>
		highlight === key ? 'ring-2 ring-account ring-offset-2 ring-offset-account-canvas rounded-lg' : ''

	return (
		<div className="min-w-0 space-y-8">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-account-foreground">
						{accountPreferencesCopy.pageTitle}
					</h1>
					<p className="mt-1 text-sm text-account-muted">{accountPreferencesCopy.pageDescription(accountName)}</p>
					<p className="mt-1 text-xs text-account-muted">{accountPreferencesCopy.signedInAs(memberEmail)}</p>
					<p className="mt-2 text-xs text-account-muted">{accountPreferencesCopy.deepLinkHint}</p>
				</div>
				<Link
					href="/account"
					className="text-sm font-medium text-primary underline-offset-4 hover:underline"
				>
					{accountPreferencesCopy.backToAccount}
				</Link>
			</div>

			<Card className="border-account-border bg-card shadow-sm" aria-label={accountPreferencesCopy.ariaNotificationsSection}>
				<CardHeader className="border-b border-account-border pb-4">
					<h2 className="text-lg font-semibold text-account-foreground">{accountPreferencesCopy.sectionNotificationsTitle}</h2>
					<p className="text-sm text-account-muted">{accountPreferencesCopy.sectionNotificationsDescription}</p>
				</CardHeader>
				<CardContent className="space-y-6 pt-6">
					{notifAlert ? (
						<Alert
							variant={notifAlert.variant === 'destructive' ? 'destructive' : 'default'}
							role="status"
							className={
								notifAlert.variant === 'success'
									? 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50'
									: undefined
							}
						>
							<AlertDescription>{notifAlert.text}</AlertDescription>
						</Alert>
					) : null}

					<div id="prefs-informational" className={cn('scroll-mt-24 space-y-3 p-1', ringHighlight('informational'))}>
						<h3 className="text-base font-semibold text-account-foreground">{accountPreferencesCopy.informationalTitle}</h3>
						<p className="text-sm text-account-muted">{accountPreferencesCopy.informationalBody}</p>
						<div className="flex items-center gap-3">
							<Switch
								id="pref-informational"
								checked={informational}
								disabled={notifPending}
								onCheckedChange={(v) => setInformational(Boolean(v))}
							/>
							<Label htmlFor="pref-informational" className="text-sm text-account-foreground">
								{accountPreferencesCopy.switchInformational}
							</Label>
						</div>
					</div>

					<div id="prefs-marketing" className={cn('space-y-3 border-t border-account-border pt-6 p-1', ringHighlight('marketing'))}>
						<h3 className="text-base font-semibold text-account-foreground">{accountPreferencesCopy.marketingTitle}</h3>
						<p className="text-sm text-account-muted">{accountPreferencesCopy.marketingBody}</p>
						<div className="flex items-center gap-3">
							<Switch
								id="pref-marketing"
								checked={marketing}
								disabled={notifPending}
								onCheckedChange={(v) => setMarketing(Boolean(v))}
							/>
							<Label htmlFor="pref-marketing" className="text-sm text-account-foreground">
								{accountPreferencesCopy.switchMarketing}
							</Label>
						</div>
					</div>

					<div id="prefs-transactional" className={cn('space-y-3 border-t border-account-border pt-6 p-1', ringHighlight('transactional'))}>
						<h3 className="text-base font-semibold text-account-foreground">{accountPreferencesCopy.transactionalTitle}</h3>
						<p className="text-sm text-account-muted">{accountPreferencesCopy.transactionalBody}</p>
						<div className="flex items-center gap-3 opacity-90">
							<input
								type="checkbox"
								className="h-4 w-4 rounded border-account-border"
								checked
								disabled
								readOnly
								aria-label={accountPreferencesCopy.switchTransactionalLocked}
							/>
							<span className="text-sm text-account-foreground">{accountPreferencesCopy.switchTransactionalLocked}</span>
						</div>
					</div>
				</CardContent>
				<div className="flex flex-wrap items-center justify-end gap-2 border-t border-account-border px-6 py-4">
					<Button type="button" onClick={saveNotifications} disabled={notifPending}>
						{notifPending ? accountPreferencesCopy.notificationsSavePending : accountPreferencesCopy.notificationsSave}
					</Button>
				</div>
			</Card>

			{isOrgAdmin ? (
				<Card className="border-account-border bg-card shadow-sm" aria-label={accountPreferencesCopy.ariaBillingSection}>
					<CardHeader className="border-b border-account-border pb-4">
						<h2 className="text-lg font-semibold text-account-foreground">{accountPreferencesCopy.sectionBillingTitle}</h2>
						<p className="text-sm text-account-muted">{accountPreferencesCopy.sectionBillingDescription}</p>
					</CardHeader>
					<CardContent className="space-y-4 pt-6">
						{billingState.ok === false && billingState.message ? (
							<Alert variant="destructive" role="alert">
								<AlertDescription>{billingState.message}</AlertDescription>
							</Alert>
						) : null}
						{billingState.ok === true ? (
							<Alert
								role="status"
								className="border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50"
							>
								<AlertDescription>{accountPreferencesCopy.billingSuccess}</AlertDescription>
							</Alert>
						) : null}
						<form action={billingFormAction} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="default-billing-entity">{accountPreferencesCopy.billingLabel}</Label>
								<select
									id="default-billing-entity"
									name="default_billing_entity_ref"
									className={selectClass}
									defaultValue={initialDefaultBillingEntityRef ?? ''}
									key={`${initialDefaultBillingEntityRef}:${billingEntityOptions.join('|')}`}
									disabled={billingPending}
								>
									<option value="">{accountPreferencesCopy.billingPlaceholderOption}</option>
									{billingEntityOptions.map((ref) => (
										<option key={ref} value={ref}>
											{ref}
										</option>
									))}
								</select>
							</div>
							<div className="flex justify-end">
								<Button type="submit" disabled={billingPending}>
									{billingPending ? accountPreferencesCopy.billingSavePending : accountPreferencesCopy.billingSave}
								</Button>
							</div>
						</form>
					</CardContent>
				</Card>
			) : null}

			<Card className="border-account-border bg-card shadow-sm" aria-label={accountPreferencesCopy.ariaCommsSection}>
				<CardHeader className="border-b border-account-border pb-4">
					<h2 className="text-lg font-semibold text-account-foreground">{accountPreferencesCopy.sectionCommsTitle}</h2>
					<p className="text-sm text-account-muted">{accountPreferencesCopy.sectionCommsDescription}</p>
				</CardHeader>
				<CardContent className="space-y-6 pt-6">
					<div className="space-y-2">
						<Label htmlFor="pref-locale">{accountPreferencesCopy.localeLabel}</Label>
						<input
							id="pref-locale"
							type="text"
							className={cn(selectClass, 'cursor-not-allowed opacity-80')}
							value={accountPreferencesCopy.localePlaceholder}
							readOnly
							disabled
							aria-readonly
						/>
						<p className="text-xs text-account-muted">{accountPreferencesCopy.localeHelp}</p>
					</div>
					<div className="space-y-2 border-t border-account-border pt-6">
						<p className="text-sm font-medium text-account-foreground">{accountPreferencesCopy.timezoneLabel}</p>
						<p className="rounded-lg border border-account-border bg-account-canvas px-3 py-2 text-sm text-account-foreground">
							{ACCOUNT_PORTAL_PREFERENCES_TIME_ZONE_LABEL}
						</p>
						<p className="text-xs text-account-muted">
							{accountPreferencesCopy.timezoneHelp(ACCOUNT_PORTAL_PREFERENCES_TIME_ZONE_LABEL)}
						</p>
					</div>
				</CardContent>
			</Card>

			<p className="rounded-lg border border-dashed border-account-border bg-muted/10 p-4 text-xs text-account-muted">
				{accountPreferencesCopy.smsFootnote}
			</p>
		</div>
	)
}
