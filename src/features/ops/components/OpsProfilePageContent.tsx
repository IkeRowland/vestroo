'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef } from 'react'

import {
	changeOpsProfilePasswordAction,
	initialOpsProfileNamePhoneFormState,
	initialOpsProfilePasswordFormState,
	updateOpsProfileNamePhoneAction,
} from '@/actions/opsProfile'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { opsProfileCopy } from '@/features/ops/copy/ops-profile-copy'
import { cn } from '@/lib/utils'

const C = opsProfileCopy

const inputClass = cn(
	'flex h-11 w-full rounded-md border border-ops-border bg-ops-surface px-3 text-sm text-ops-foreground',
	'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ops focus-visible:ring-offset-2 focus-visible:ring-offset-ops-canvas',
	'disabled:cursor-not-allowed disabled:opacity-50',
)

export type OpsProfilePageContentProps = {
	workEmail: string
	initialFirstName: string
	initialLastName: string
	initialPhone: string
}

export function OpsProfilePageContent({
	workEmail,
	initialFirstName,
	initialLastName,
	initialPhone,
}: OpsProfilePageContentProps) {
	const router = useRouter()
	const passwordFormRef = useRef<HTMLFormElement>(null)

	const [personalState, personalFormAction, personalPending] = useActionState(
		updateOpsProfileNamePhoneAction,
		initialOpsProfileNamePhoneFormState,
	)
	const [passwordState, passwordFormAction, passwordPending] = useActionState(
		changeOpsProfilePasswordAction,
		initialOpsProfilePasswordFormState,
	)

	const prevPersonalPending = useRef(false)
	const prevPasswordPending = useRef(false)

	useEffect(() => {
		const ended = prevPersonalPending.current && !personalPending
		prevPersonalPending.current = personalPending
		if (ended && personalState.ok === true) {
			router.refresh()
		}
	}, [personalPending, personalState.ok, router])

	useEffect(() => {
		const ended = prevPasswordPending.current && !passwordPending
		prevPasswordPending.current = passwordPending
		if (ended && passwordState.ok === true) {
			passwordFormRef.current?.reset()
			router.refresh()
		}
	}, [passwordPending, passwordState.ok, router])

	return (
		<div className="min-w-0 max-w-2xl space-y-8">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-ops-page-title text-ops-foreground">{C.pageTitle}</h1>
					<p className="mt-1 max-w-2xl text-sm text-ops-muted">{C.pageIntro}</p>
				</div>
				<Link
					href="/ops"
					className="text-sm font-medium text-primary underline-offset-4 hover:underline"
				>
					{C.backToDashboard}
				</Link>
			</div>

			<Card className="border-ops-border bg-ops-surface shadow-sm">
				<CardHeader className="border-b border-ops-border pb-4">
					<h2 className="text-lg font-semibold text-ops-foreground">{C.sectionPersonalTitle}</h2>
					<p className="text-sm text-ops-muted">{C.sectionPersonalDescription}</p>
				</CardHeader>
				<CardContent className="space-y-4 pt-6">
					{personalState.ok === true ? (
						<Alert className="border-emerald-700/60 bg-emerald-950/40 text-emerald-100">
							<AlertDescription>{C.personalSuccess}</AlertDescription>
						</Alert>
					) : null}
					{personalState.ok === false && personalState.message ? (
						<Alert variant="destructive">
							<AlertDescription>{personalState.message}</AlertDescription>
						</Alert>
					) : null}

					<form action={personalFormAction} aria-label={C.personalFormAria} className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="ops-profile-first-name">{C.fieldFirstName}</Label>
								<Input
									id="ops-profile-first-name"
									name="first_name"
									required
									maxLength={80}
									defaultValue={initialFirstName}
									className={inputClass}
									autoComplete="given-name"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="ops-profile-last-name">{C.fieldLastName}</Label>
								<Input
									id="ops-profile-last-name"
									name="last_name"
									maxLength={80}
									defaultValue={initialLastName}
									className={inputClass}
									autoComplete="family-name"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="ops-profile-work-email">{C.fieldWorkEmail}</Label>
							<Input
								id="ops-profile-work-email"
								readOnly
								value={workEmail}
								className={cn(inputClass, 'bg-ops-canvas/60')}
								aria-readonly="true"
							/>
							<p className="text-xs text-ops-muted">{C.fieldWorkEmailHint}</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="ops-profile-phone">{C.fieldPhone}</Label>
							<Input
								id="ops-profile-phone"
								name="phone"
								type="tel"
								maxLength={40}
								defaultValue={initialPhone}
								className={inputClass}
								autoComplete="tel"
							/>
							<p className="text-xs text-ops-muted">{C.fieldPhoneHint}</p>
						</div>
						<div className="flex justify-end">
							<Button type="submit" disabled={personalPending}>
								{personalPending ? C.savePersonalPending : C.savePersonal}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card className="border-ops-border bg-ops-surface shadow-sm">
				<CardHeader className="border-b border-ops-border pb-4">
					<h2 className="text-lg font-semibold text-ops-foreground">{C.sectionSecurityTitle}</h2>
					<p className="text-sm text-ops-muted">{C.sectionSecurityDescription}</p>
				</CardHeader>
				<CardContent className="space-y-4 pt-6">
					{passwordState.ok === true ? (
						<Alert className="border-emerald-700/60 bg-emerald-950/40 text-emerald-100">
							<AlertDescription>{C.passwordSuccess}</AlertDescription>
						</Alert>
					) : null}
					{passwordState.ok === false && passwordState.message ? (
						<Alert variant="destructive">
							<AlertDescription>{passwordState.message}</AlertDescription>
						</Alert>
					) : null}

					<form
						ref={passwordFormRef}
						action={passwordFormAction}
						aria-label={C.passwordFormAria}
						className="space-y-4"
					>
						<div className="space-y-2">
							<Label htmlFor="ops-profile-current-password">{C.fieldCurrentPassword}</Label>
							<Input
								id="ops-profile-current-password"
								name="current_password"
								type="password"
								required
								autoComplete="current-password"
								className={inputClass}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="ops-profile-new-password">{C.fieldNewPassword}</Label>
							<Input
								id="ops-profile-new-password"
								name="new_password"
								type="password"
								required
								minLength={8}
								autoComplete="new-password"
								className={inputClass}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="ops-profile-confirm-password">{C.fieldConfirmPassword}</Label>
							<Input
								id="ops-profile-confirm-password"
								name="confirm_password"
								type="password"
								required
								minLength={8}
								autoComplete="new-password"
								className={inputClass}
							/>
						</div>
						<div className="flex justify-end">
							<Button type="submit" disabled={passwordPending}>
								{passwordPending ? C.savePasswordPending : C.savePassword}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	)
}
