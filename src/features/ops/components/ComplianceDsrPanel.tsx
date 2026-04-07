'use client'

import { useState, useTransition } from 'react'

import {
	anonymiseDataSubjectAction,
	exportDataSubjectAction,
} from '@/actions/opsCompliance'

export function ComplianceDsrPanel() {
	const [exportJson, setExportJson] = useState<string | null>(null)
	const [exportErr, setExportErr] = useState<string | null>(null)
	const [anonMsg, setAnonMsg] = useState<string | null>(null)
	const [pending, start] = useTransition()

	return (
		<section className="mt-8 rounded-lg border border-amber-900/60 bg-amber-950/20 px-4 py-4">
			<h2 className="text-lg font-semibold text-amber-100">Data subject requests (admin only)</h2>
			<p className="mt-1 text-xs text-amber-200/80">
				Exports and anonymisation are logged to <code className="text-amber-100">ops_audit_log</code> (
				<code className="text-amber-100">dsr_export</code>, <code className="text-amber-100">dsr_anonymise</code>
				). Legal review and <code className="text-amber-100">auth.users</code> follow-up are out of band — see{' '}
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
					<label className="block text-xs text-zinc-400">
						<span className="mb-1 block">Profile UUID</span>
						<input
							name="profileId"
							type="text"
							placeholder="optional if email set"
							className="w-full min-w-[14rem] rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
						/>
					</label>
					<label className="block text-xs text-zinc-400">
						<span className="mb-1 block">Email (exact match on profiles.email)</span>
						<input
							name="email"
							type="email"
							placeholder="optional if UUID set"
							className="w-full min-w-[14rem] rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
						/>
					</label>
					<button
						type="submit"
						disabled={pending}
						className="rounded-md border border-amber-700 bg-amber-900/40 px-4 py-2 text-sm font-medium text-amber-50 hover:bg-amber-900/60 disabled:opacity-50 min-h-11"
					>
						{pending ? 'Exporting…' : 'Run export'}
					</button>
				</form>
				{exportErr ? <p className="text-sm text-red-300">{exportErr}</p> : null}
				{exportJson ? (
					<pre className="max-h-64 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
						{exportJson}
					</pre>
				) : null}
			</div>

			<div className="mt-6 space-y-3 border-t border-amber-900/40 pt-4">
				<p className="text-sm font-medium text-zinc-200">Anonymise customer profile</p>
				<p className="text-xs text-zinc-500">
					Sets profile PII to placeholders, redacts linked booking guest fields, clears CP coordination notes for
					those bookings, nulls <code className="text-zinc-400">trips.customer_id</code> for the subject. Type{' '}
					<strong className="text-zinc-300">ANONYMISE</strong> to confirm.
				</p>
				<form
					className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
					action={(fd) => {
						setAnonMsg(null)
						const profileId = fd.get('anonProfileId')?.toString().trim()
						const confirmPhrase = fd.get('confirmPhrase')?.toString() as 'ANONYMISE'
						if (!profileId) {
							setAnonMsg('Profile UUID required')
							return
						}
						start(async () => {
							const res = await anonymiseDataSubjectAction({ profileId, confirmPhrase })
							setAnonMsg(res.ok ? res.message : res.message)
						})
					}}
				>
					<label className="block text-xs text-zinc-400">
						<span className="mb-1 block">Customer profile UUID</span>
						<input
							name="anonProfileId"
							type="text"
							required
							className="w-full min-w-[14rem] rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
						/>
					</label>
					<label className="block text-xs text-zinc-400">
						<span className="mb-1 block">Confirmation</span>
						<input
							name="confirmPhrase"
							type="text"
							required
							placeholder="ANONYMISE"
							className="w-full min-w-[8rem] rounded border border-zinc-700 bg-zinc-900 px-2 py-2 text-sm text-zinc-100"
						/>
					</label>
					<button
						type="submit"
						disabled={pending}
						className="rounded-md border border-red-900/60 bg-red-950/40 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-950/60 disabled:opacity-50 min-h-11"
					>
						{pending ? 'Applying…' : 'Anonymise'}
					</button>
				</form>
				{anonMsg ? <p className="text-sm text-zinc-300">{anonMsg}</p> : null}
			</div>
		</section>
	)
}
