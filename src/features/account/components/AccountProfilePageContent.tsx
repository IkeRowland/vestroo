'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef } from 'react'

import {
	changeAccountPasswordAction,
	initialAccountProfileAvatarFormState,
	initialAccountProfileNamePhoneFormState,
	initialAccountProfilePasswordFormState,
	updateAccountProfileNamePhoneAction,
	uploadAccountAvatarAction,
} from '@/actions/accountProfile'
import { accountProfileCopy } from '@/features/account/copy/account-profile-copy'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const inputClass = cn(
	'flex h-12 w-full rounded-lg border border-account-border bg-card px-3 text-sm text-account-foreground shadow-sm',
	'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas',
	'disabled:cursor-not-allowed disabled:opacity-50',
)

export type AccountProfilePageContentProps = {
	workEmail: string
	initialFirstName: string
	initialLastName: string
	initialPhone: string
	initialAvatarUrl: string | null
	avatarUploadEnabled: boolean
}

export function AccountProfilePageContent({
	workEmail,
	initialFirstName,
	initialLastName,
	initialPhone,
	initialAvatarUrl,
	avatarUploadEnabled,
}: AccountProfilePageContentProps) {
	const router = useRouter()
	const passwordFormRef = useRef<HTMLFormElement>(null)

	const [personalState, personalFormAction, personalPending] = useActionState(
		updateAccountProfileNamePhoneAction,
		initialAccountProfileNamePhoneFormState,
	)
	const [passwordState, passwordFormAction, passwordPending] = useActionState(
		changeAccountPasswordAction,
		initialAccountProfilePasswordFormState,
	)
	const [avatarState, avatarFormAction, avatarPending] = useActionState(
		uploadAccountAvatarAction,
		initialAccountProfileAvatarFormState,
	)

	const prevPersonalPending = useRef(false)
	const prevPasswordPending = useRef(false)
	const prevAvatarPending = useRef(false)

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

	useEffect(() => {
		const ended = prevAvatarPending.current && !avatarPending
		prevAvatarPending.current = avatarPending
		if (ended && avatarState.ok === true) {
			router.refresh()
		}
	}, [avatarPending, avatarState.ok, router])

	return (
		<div className="min-w-0 space-y-8">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-account-foreground">
						{accountProfileCopy.pageTitle}
					</h1>
					<p className="mt-1 max-w-2xl text-sm text-account-muted">{accountProfileCopy.pageIntro}</p>
				</div>
				<Link
					href="/account"
					className="text-sm font-medium text-primary underline-offset-4 hover:underline"
				>
					{accountProfileCopy.backToAccount}
				</Link>
			</div>

			<Card className="border-account-border bg-card shadow-sm" aria-label={accountProfileCopy.ariaPersonalSection}>
				<CardHeader className="border-b border-account-border pb-4">
					<h2 className="text-lg font-semibold text-account-foreground">{accountProfileCopy.sectionPersonalTitle}</h2>
					<p className="text-sm text-account-muted">{accountProfileCopy.sectionPersonalDescription}</p>
				</CardHeader>
				<CardContent className="space-y-4 pt-6">
					{personalState.ok === true ? (
						<Alert
							role="status"
							className="border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50"
						>
							<AlertDescription>{accountProfileCopy.personalSuccess}</AlertDescription>
						</Alert>
					) : null}
					{personalState.ok === false && personalState.message ? (
						<Alert variant="destructive" role="alert">
							<AlertDescription>{personalState.message}</AlertDescription>
						</Alert>
					) : null}

					<form action={personalFormAction} aria-label={accountProfileCopy.personalFormAria} className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="profile-first-name" className="text-account-foreground">
									{accountProfileCopy.fieldFirstName}
								</Label>
								<Input
									id="profile-first-name"
									name="first_name"
									required
									maxLength={80}
									defaultValue={initialFirstName}
									placeholder={accountProfileCopy.fieldFirstNamePlaceholder}
									className={inputClass}
									autoComplete="given-name"
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="profile-last-name" className="text-account-foreground">
									{accountProfileCopy.fieldLastName}
								</Label>
								<Input
									id="profile-last-name"
									name="last_name"
									maxLength={80}
									defaultValue={initialLastName}
									placeholder={accountProfileCopy.fieldLastNamePlaceholder}
									className={inputClass}
									autoComplete="family-name"
								/>
							</div>
						</div>
						<div className="space-y-2">
							<Label htmlFor="profile-work-email" className="text-account-foreground">
								{accountProfileCopy.fieldWorkEmail}
							</Label>
							<Input
								id="profile-work-email"
								readOnly
								value={workEmail}
								className={cn(inputClass, 'bg-account-canvas/60')}
								aria-readonly="true"
							/>
							<p className="text-xs text-account-muted">{accountProfileCopy.fieldWorkEmailHint}</p>
						</div>
						<div className="space-y-2">
							<Label htmlFor="profile-phone" className="text-account-foreground">
								{accountProfileCopy.fieldPhone}
							</Label>
							<Input
								id="profile-phone"
								name="phone"
								type="tel"
								maxLength={40}
								defaultValue={initialPhone}
								placeholder={accountProfileCopy.fieldPhonePlaceholder}
								className={inputClass}
								autoComplete="tel"
							/>
							<p className="text-xs text-account-muted">{accountProfileCopy.fieldPhoneHint}</p>
						</div>
						<div className="flex justify-end">
							<Button type="submit" disabled={personalPending}>
								{personalPending ? accountProfileCopy.savePersonalPending : accountProfileCopy.savePersonal}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card className="border-account-border bg-card shadow-sm" aria-label={accountProfileCopy.ariaAvatarSection}>
				<CardHeader className="border-b border-account-border pb-4">
					<h2 className="text-lg font-semibold text-account-foreground">{accountProfileCopy.sectionAvatarTitle}</h2>
					<p className="text-sm text-account-muted">
						{avatarUploadEnabled
							? accountProfileCopy.sectionAvatarDescriptionOn
							: accountProfileCopy.sectionAvatarHiddenNote}
					</p>
				</CardHeader>
				<CardContent className="space-y-4 pt-6">
					{avatarUploadEnabled && initialAvatarUrl ? (
						<div className="flex items-center gap-4">
							<Image
								src={initialAvatarUrl}
								alt=""
								width={72}
								height={72}
								className="h-[72px] w-[72px] rounded-full border border-account-border object-cover"
							/>
						</div>
					) : null}
					{avatarUploadEnabled ? (
						<>
							{avatarState.ok === true ? (
								<Alert
									role="status"
									className="border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50"
								>
									<AlertDescription>{accountProfileCopy.avatarSuccess}</AlertDescription>
								</Alert>
							) : null}
							{avatarState.ok === false && avatarState.message ? (
								<Alert variant="destructive" role="alert">
									<AlertDescription>{avatarState.message}</AlertDescription>
								</Alert>
							) : null}
							<form action={avatarFormAction} className="flex flex-wrap items-end gap-3">
								<div className="min-w-0 flex-1 space-y-2">
									<Label htmlFor="profile-avatar-file" className="sr-only">
										{accountProfileCopy.avatarInputAria}
									</Label>
									<Input
										id="profile-avatar-file"
										name="avatar"
										type="file"
										accept="image/jpeg,image/png,image/webp"
										className={cn(inputClass, 'h-auto min-h-12 py-2')}
										aria-label={accountProfileCopy.avatarInputAria}
									/>
								</div>
								<Button type="submit" disabled={avatarPending}>
									{avatarPending ? accountProfileCopy.uploadAvatarPending : accountProfileCopy.uploadAvatarButton}
								</Button>
							</form>
						</>
					) : null}
				</CardContent>
			</Card>

			<Card className="border-account-border bg-card shadow-sm" aria-label={accountProfileCopy.ariaSecuritySection}>
				<CardHeader className="border-b border-account-border pb-4">
					<h2 className="text-lg font-semibold text-account-foreground">{accountProfileCopy.sectionSecurityTitle}</h2>
					<p className="text-sm text-account-muted">{accountProfileCopy.sectionSecurityDescription}</p>
				</CardHeader>
				<CardContent className="space-y-4 pt-6">
					{passwordState.ok === true ? (
						<Alert
							role="status"
							className="border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50"
						>
							<AlertDescription>{accountProfileCopy.passwordSuccess}</AlertDescription>
						</Alert>
					) : null}
					{passwordState.ok === false && passwordState.message ? (
						<Alert variant="destructive" role="alert">
							<AlertDescription>{passwordState.message}</AlertDescription>
						</Alert>
					) : null}

					<form
						ref={passwordFormRef}
						action={passwordFormAction}
						aria-label={accountProfileCopy.passwordFormAria}
						className="space-y-4"
					>
						<div className="space-y-2">
							<Label htmlFor="profile-current-password" className="text-account-foreground">
								{accountProfileCopy.fieldCurrentPassword}
							</Label>
							<Input
								id="profile-current-password"
								name="current_password"
								type="password"
								required
								autoComplete="current-password"
								placeholder={accountProfileCopy.passwordPlaceholder}
								className={inputClass}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="profile-new-password" className="text-account-foreground">
								{accountProfileCopy.fieldNewPassword}
							</Label>
							<Input
								id="profile-new-password"
								name="new_password"
								type="password"
								required
								minLength={8}
								autoComplete="new-password"
								placeholder={accountProfileCopy.passwordPlaceholder}
								className={inputClass}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="profile-confirm-password" className="text-account-foreground">
								{accountProfileCopy.fieldConfirmPassword}
							</Label>
							<Input
								id="profile-confirm-password"
								name="confirm_password"
								type="password"
								required
								minLength={8}
								autoComplete="new-password"
								placeholder={accountProfileCopy.passwordPlaceholder}
								className={inputClass}
							/>
						</div>
						<div className="flex justify-end">
							<Button type="submit" disabled={passwordPending}>
								{passwordPending ? accountProfileCopy.savePasswordPending : accountProfileCopy.savePassword}
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>

			<Card className="border-account-border bg-card shadow-sm" aria-label={accountProfileCopy.ariaMfaSection}>
				<CardHeader className="border-b border-account-border pb-4">
					<h2 className="text-lg font-semibold text-account-foreground">{accountProfileCopy.sectionMfaTitle}</h2>
				</CardHeader>
				<CardContent className="pt-6">
					<p className="text-sm text-account-muted" role="status">
						{accountProfileCopy.sectionMfaDescription}
					</p>
				</CardContent>
			</Card>

			<Card className="border-account-border bg-card shadow-sm" aria-label={accountProfileCopy.ariaSessionsSection}>
				<CardHeader className="border-b border-account-border pb-4">
					<h2 className="text-lg font-semibold text-account-foreground">{accountProfileCopy.sectionSessionsTitle}</h2>
				</CardHeader>
				<CardContent className="pt-6">
					<p className="text-sm text-account-muted">{accountProfileCopy.sectionSessionsSupportBody}</p>
				</CardContent>
			</Card>

			<Card className="border-account-border bg-card shadow-sm" aria-label={accountProfileCopy.ariaMembershipSection}>
				<CardHeader className="border-b border-account-border pb-4">
					<h2 className="text-lg font-semibold text-account-foreground">{accountProfileCopy.sectionMembershipTitle}</h2>
				</CardHeader>
				<CardContent className="space-y-4 pt-6">
					<p className="text-sm text-account-muted">{accountProfileCopy.sectionMembershipBody}</p>
					<Link
						href="/contact"
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
						aria-describedby="membership-contact-hint"
					>
						{accountProfileCopy.membershipContactCta}
					</Link>
					<p id="membership-contact-hint" className="text-xs text-account-muted">
						{accountProfileCopy.membershipContactHint}
					</p>
				</CardContent>
			</Card>
		</div>
	)
}
