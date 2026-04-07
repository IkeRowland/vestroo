'use client'

import { useState, useTransition } from 'react'

import {
	anonymiseDataSubjectAction,
	exportDataSubjectAction,
} from '@/actions/opsCompliance'
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const inputOps =
	'min-h-11 rounded-md border border-ops-border bg-ops-canvas px-3 py-2 text-sm text-ops-foreground placeholder:text-ops-muted/70 focus-visible:ring-ops'

export function ComplianceDsrPanel() {
	const [exportJson, setExportJson] = useState<string | null>(null)
	const [exportErr, setExportErr] = useState<string | null>(null)
	const [anonFeedback, setAnonFeedback] = useState<{
		text: string
		ok: boolean
	} | null>(null)
	const [anonProfileId, setAnonProfileId] = useState('')
	const [anonPhrase, setAnonPhrase] = useState('')
	const [anonDialogOpen, setAnonDialogOpen] = useState(false)
	const [pending, start] = useTransition()

	function openAnonDialog() {
		setAnonFeedback(null)
		if (!anonProfileId.trim()) {
			setAnonFeedback({ ok: false, text: 'Customer profile UUID is required.' })
			return
		}
		if (anonPhrase !== 'ANONYMISE') {
			setAnonFeedback({
				ok: false,
				text: 'Type ANONYMISE exactly to enable the confirmation step.',
			})
			return
		}
		setAnonDialogOpen(true)
	}

	function runAnonymise() {
		start(async () => {
			const res = await anonymiseDataSubjectAction({
				profileId: anonProfileId.trim(),
				confirmPhrase: anonPhrase as 'ANONYMISE',
			})
			setAnonFeedback({ text: res.message, ok: res.ok })
			setAnonDialogOpen(false)
			if (res.ok) {
				setAnonProfileId('')
				setAnonPhrase('')
			}
		})
	}

	return (
		<section className="mt-8 rounded-lg border border-amber-900/60 bg-amber-950/20 px-4 py-4">
			<h2 className="text-lg font-semibold text-amber-100">Data subject requests (admin only)</h2>
			<p className="mt-1 text-xs text-amber-200/80">
				Exports and anonymisation are logged to <code className="text-amber-100">ops_audit_log</code> (
				<code className="text-amber-100">dsr_export</code>,{' '}
				<code className="text-amber-100">dsr_anonymise</code>). Legal review and{' '}
				<code className="text-amber-100">auth.users</code> follow-up are out of band — see{' '}
				<code className="text-amber-100">docs/compliance-and-safety.md</code>.
			</p>

			<div className="mt-4 space-y-3">
				<p className="text-sm font-medium text-zinc-200">Minimal export (customer profiles)</p>
				<form
					className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
					action={(fd) => {
						setExportErr(null)
						setExportJson(null)
						const profileId = fd.get('profileId')?.toString().trim()
						const email = fd.get('email')?.toString().trim()
						start(async () => {
							const res = await exportDataSubjectAction({
								...(profileId ? { profileId } : {}),
								...(email ? { email } : {}),
							})
							if (!res.ok || !res.export) {
								setExportErr(res.message)
								return
							}
							setExportJson(JSON.stringify(res.export, null, 2))
						})
					}}
				>
					<div className="block text-xs text-zinc-400">
						<Label htmlFor="dsr-profile-id" className="mb-1 block">
							Profile UUID
						</Label>
						<Input
							id="dsr-profile-id"
							name="profileId"
							type="text"
							placeholder="optional if email set"
							className={cn('w-full min-w-[14rem]', inputOps)}
						/>
					</div>
					<div className="block text-xs text-zinc-400">
						<Label htmlFor="dsr-email" className="mb-1 block">
							Email (exact match on profiles.email)
						</Label>
						<Input
							id="dsr-email"
							name="email"
							type="email"
							placeholder="optional if UUID set"
							className={cn('w-full min-w-[14rem]', inputOps)}
						/>
					</div>
					<Button
						type="submit"
						disabled={pending}
						className="min-h-11 rounded-md border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-medium text-amber-50 hover:bg-amber-900/60 disabled:opacity-50"
					>
						{pending ? 'Exporting…' : 'Run export'}
					</Button>
				</form>
				{exportErr ? (
					<Alert
						variant="destructive"
						className="border-red-900/60 bg-red-950/50 text-red-100"
						role="alert"
					>
						<AlertDescription>{exportErr}</AlertDescription>
					</Alert>
				) : null}
				{exportJson ? (
					<pre className="max-h-64 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
						{exportJson}
					</pre>
				) : null}
			</div>

			<AlertDialog open={anonDialogOpen} onOpenChange={setAnonDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm irreversible anonymisation</AlertDialogTitle>
						<AlertDialogDescription>
							This replaces personal data on the profile, redacts linked booking guest fields, clears
							close protection coordination notes for affected bookings, and clears customer linkage on
							trips. It cannot be undone from the console — confirm only after legal/process sign-off.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel type="button">Cancel</AlertDialogCancel>
						<Button
							type="button"
							disabled={pending}
							className="min-h-11 bg-red-700 text-white hover:bg-red-600"
							onClick={() => runAnonymise()}
						>
							{pending ? 'Applying…' : 'Confirm anonymisation'}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<div className="mt-6 space-y-3 border-t border-amber-900/40 pt-4">
				<p className="text-sm font-medium text-zinc-200">Anonymise customer profile</p>
				<p className="text-xs text-zinc-500">
					Sets profile fields to placeholders, redacts linked booking guest fields, clears close protection
					coordination notes for those bookings, and nulls <code className="text-zinc-400">trips.customer_id</code>{' '}
					for the subject. Type <strong className="text-zinc-300">ANONYMISE</strong> to unlock confirmation.
				</p>
				<div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
					<div className="block text-xs text-zinc-400">
						<Label htmlFor="anon-profile" className="mb-1 block">
							Customer profile UUID
						</Label>
						<Input
							id="anon-profile"
							value={anonProfileId}
							onChange={(e) => setAnonProfileId(e.target.value)}
							type="text"
							required
							className={cn('w-full min-w-[14rem]', inputOps)}
						/>
					</div>
					<div className="block text-xs text-zinc-400">
						<Label htmlFor="anon-phrase" className="mb-1 block">
							Confirmation phrase
						</Label>
						<Input
							id="anon-phrase"
							value={anonPhrase}
							onChange={(e) => setAnonPhrase(e.target.value)}
							type="text"
							placeholder="ANONYMISE"
							className={cn('w-full min-w-[8rem]', inputOps)}
						/>
					</div>
					<Button
						type="button"
						disabled={pending}
						onClick={openAnonDialog}
						className="min-h-11 rounded-md border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-950/60 disabled:opacity-50"
					>
						Review anonymisation…
					</Button>
				</div>
				{anonFeedback ? (
					<Alert
						variant={anonFeedback.ok ? 'default' : 'destructive'}
						className={
							anonFeedback.ok
								? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-100'
								: 'border-red-900/60 bg-red-950/50 text-red-100'
						}
						role="status"
					>
						<AlertDescription>{anonFeedback.text}</AlertDescription>
					</Alert>
				) : null}
			</div>
		</section>
	)
}
