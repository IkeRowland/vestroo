'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { finalizeAccountInviteAction } from '@/actions/accountInviteAccept'
import {
	initialFinalizeInviteState,
	type FinalizeInviteState,
} from '@/actions/accountInviteAcceptShared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	accountPublicAuthSecondaryLinkClassName,
} from '@/features/account/components/AccountPublicAuthCard'
import { accountAuthSurfacesCopy } from '@/features/account/copy/account-auth-surfaces-copy'
import { createClientClient } from '@/lib/supabase/client'

export type AccountInviteSignupPanelProps = {
	token: string
	organisationName: string
	invitedEmail: string
	roleLabel: string
}

const accountAuthInputClassName =
	'mt-1 min-h-11 border-account-border bg-account-surface text-account-foreground placeholder:text-account-muted focus-visible:border-account-border focus-visible:ring-account'

const accountAccentPrimaryClassName =
	'bg-account-accent text-account-accent-foreground hover:bg-account-accent/90 focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas'

export function AccountInviteSignupPanel({
	token,
	organisationName,
	invitedEmail,
	roleLabel,
}: AccountInviteSignupPanelProps) {
	const router = useRouter()
	const [sessionEmail, setSessionEmail] = useState<string | null | undefined>(undefined)
	const [password, setPassword] = useState('')
	const [password2, setPassword2] = useState('')
	const [busy, setBusy] = useState(false)
	const [err, setErr] = useState('')
	const [finalizeState, setFinalizeState] = useState<FinalizeInviteState>(initialFinalizeInviteState)
	const [isPending, startTransition] = useTransition()

	const copy = accountAuthSurfacesCopy.invite

	useEffect(() => {
		const supabase = createClientClient()
		void supabase.auth.getUser().then(({ data }) => {
			setSessionEmail(data.user?.email ?? null)
		})
	}, [])

	const loginHref = `/account/login?next=${encodeURIComponent(`/account/signup?token=${encodeURIComponent(token)}`)}`

	const emailMatches =
		sessionEmail &&
		sessionEmail.toLowerCase().trim() === invitedEmail.toLowerCase().trim()

	function runFinalizeDirect(): void {
		startTransition(async () => {
			const fd = new FormData()
			fd.set('token', token)
			const next = await finalizeAccountInviteAction(initialFinalizeInviteState, fd)
			setFinalizeState(next)
			if (next.ok) {
				router.push('/account')
				router.refresh()
			}
		})
	}

	async function onSignUp(e: React.FormEvent) {
		e.preventDefault()
		setErr('')
		if (password.length < 8) {
			setErr(copy.passwordMinError)
			return
		}
		if (password !== password2) {
			setErr(copy.passwordMismatchError)
			return
		}
		setBusy(true)
		const supabase = createClientClient()
		const origin = typeof window !== 'undefined' ? window.location.origin : ''
		const { data, error } = await supabase.auth.signUp({
			email: invitedEmail,
			password,
			options: {
				emailRedirectTo: `${origin}/account/login?next=${encodeURIComponent('/account')}`,
			},
		})
		setBusy(false)
		if (error) {
			setErr(error.message)
			return
		}
		if (data.session) {
			runFinalizeDirect()
			return
		}
		setErr(copy.emailConfirmHint)
	}

	if (sessionEmail === undefined) {
		return (
			<p className="text-sm text-account-muted" role="status">
				{copy.loading}
			</p>
		)
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl font-semibold text-account-foreground">{copy.title}</h1>
				<dl className="mt-4 space-y-4">
					<div>
						<dt className="text-xs font-semibold uppercase tracking-wide text-account-muted">{copy.orgLabel}</dt>
						<dd className="mt-1 text-lg font-semibold leading-snug text-account-foreground">{organisationName}</dd>
					</div>
					<div>
						<dt className="text-xs font-semibold uppercase tracking-wide text-account-muted">{copy.roleLabel}</dt>
						<dd className="mt-1 text-base font-medium text-account-foreground">{roleLabel}</dd>
					</div>
					<div>
						<dt className="text-xs font-semibold uppercase tracking-wide text-account-muted">{copy.emailLabel}</dt>
						<dd className="mt-1 break-all text-sm font-medium text-account-foreground">{invitedEmail}</dd>
					</div>
				</dl>
			</div>

			{sessionEmail && !emailMatches ? (
				<div
					className="rounded-lg border border-account-warning/50 bg-account-warning/10 p-4 text-sm text-account-warning-foreground"
					role="alert"
				>
					{copy.wrongSessionIntro}{' '}
					<strong>{sessionEmail}</strong>, {copy.wrongSessionMid} <strong>{invitedEmail}</strong>.{' '}
					{copy.wrongSessionOutro}
				</div>
			) : null}

			{emailMatches ? (
				<div className="space-y-3">
					<p className="text-sm text-account-muted">
						{copy.signedInLead}{' '}
						<span className="font-medium text-account-foreground">{sessionEmail}</span>. {copy.signedInTrail}
					</p>
					<Button
						type="button"
						disabled={isPending}
						onClick={runFinalizeDirect}
						className={`min-h-11 ${accountAccentPrimaryClassName}`}
					>
						{isPending ? copy.completingInvitation : copy.completeInvitation}
					</Button>
					{finalizeState.message ? (
						<p
							className={finalizeState.ok ? 'text-sm font-medium text-account-success' : 'text-sm text-destructive'}
							role="status"
						>
							{finalizeState.message}
						</p>
					) : null}
				</div>
			) : null}

			{!sessionEmail ? (
				<div className="space-y-6">
					<div className="rounded-lg border border-account-border bg-account-surface/60 p-4 text-sm">
						<p className="font-medium text-account-foreground">{copy.alreadyHaveAccountTitle}</p>
						<p className="mt-1 text-account-muted">{copy.alreadyHaveAccountBody}</p>
						<Button
							asChild
							variant="outline"
							className="mt-3 min-h-11 border-account-border bg-account-surface text-account-foreground hover:bg-account-surface-hover focus-visible:ring-2 focus-visible:ring-account focus-visible:ring-offset-2 focus-visible:ring-offset-account-canvas"
						>
							<Link href={loginHref}>{copy.signInSecondary}</Link>
						</Button>
					</div>

					<div>
						<h2 className="text-sm font-semibold text-account-foreground">{copy.createPasswordHeading}</h2>
						<p className="mt-1 text-xs text-account-muted">{copy.createPasswordHint}</p>
						<form onSubmit={onSignUp} className="mt-4 space-y-4">
							<div>
								<label htmlFor="inv-email" className="block text-sm font-medium text-account-foreground">
									{copy.emailFieldLabel}
								</label>
								<Input id="inv-email" value={invitedEmail} readOnly className={`${accountAuthInputClassName} bg-account-surface-hover`} />
							</div>
							<div>
								<label htmlFor="inv-pass" className="block text-sm font-medium text-account-foreground">
									{copy.passwordFieldLabel}
								</label>
								<Input
									id="inv-pass"
									type="password"
									autoComplete="new-password"
									required
									minLength={8}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									className={accountAuthInputClassName}
								/>
							</div>
							<div>
								<label htmlFor="inv-pass2" className="block text-sm font-medium text-account-foreground">
									{copy.confirmPasswordFieldLabel}
								</label>
								<Input
									id="inv-pass2"
									type="password"
									autoComplete="new-password"
									required
									minLength={8}
									value={password2}
									onChange={(e) => setPassword2(e.target.value)}
									className={accountAuthInputClassName}
								/>
							</div>
							{err ? (
								<p className="text-sm text-destructive" role="alert">
									{err}
								</p>
							) : null}
							<Button type="submit" disabled={busy} className={`min-h-11 w-full ${accountAccentPrimaryClassName}`}>
								{busy ? copy.creatingAccount : copy.createAccount}
							</Button>
						</form>
					</div>
				</div>
			) : null}

			<p className="text-center text-sm">
				<Link href="/" className={accountPublicAuthSecondaryLinkClassName}>
					{copy.backToSite}
				</Link>
			</p>
		</div>
	)
}
