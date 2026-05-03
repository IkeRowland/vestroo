'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
	setCommsDispatchRuleActiveAction,
	setCommsDispatchRuleRecipientFilterAction,
	setCommsDispatchRuleRecipientRoleAction,
	setCommsTemplateActiveAction,
} from '@/actions/opsCommsRegistry'
import { OpsCommsTemplatePreviewDialog } from '@/features/ops/components/OpsCommsTemplatePreviewDialog'
import { OpsStatusPill } from '@/features/ops/components/OpsStatusPill'
import { OpsTableShell } from '@/features/ops/components/ops-primitives'
import { opsCommsCopy } from '@/features/ops/copy/ops-comms-copy'
import { buildCommsRegistryActivityFeed } from '@/features/ops/lib/comms-registry-activity'
import type { OpsStatusPillTone } from '@/features/ops/ops-status-pill-tones'
import { mapOpsActionErrorToMessage } from '@/features/ops/ops-action-errors'
import { getCommsDispatchRecipientRoleLabel } from '@/features/ops/role-display'
import type { CommsDispatchRuleRowDb } from '@/types/database.types'
import { COMMS_DISPATCH_RECIPIENT_ROLES } from '@/types/comms'

type TemplateMeta = {
	id: string
	event_key: string
	channel: string
	subject: string | null
	active: boolean
	version: number
	created_at: string
	updated_at: string
}

type OpsCommsRegistryClientProps = {
	rules: CommsDispatchRuleRowDb[]
	templates: TemplateMeta[]
	bodyChangeGuideUrl: string | null
}

function recipientFilterSummary(filter: Record<string, unknown>): string {
	const keys = Object.keys(filter)
	if (keys.length === 0) {
		return '{} (defaults)'
	}
	return `${keys.length} key(s)`
}

function stableStringify(obj: Record<string, unknown>): string {
	return JSON.stringify(obj, Object.keys(obj).sort(), 2)
}

function channelPillTone(channel: string): OpsStatusPillTone {
	const c = channel.trim().toLowerCase()
	if (c === 'email') return 'info'
	if (c === 'sms') return 'warning'
	return 'neutral'
}

export function OpsCommsRegistryClient({
	rules,
	templates,
	bodyChangeGuideUrl,
}: OpsCommsRegistryClientProps) {
	const router = useRouter()
	const [pending, startTransition] = useTransition()
	const [error, setError] = useState<string | null>(null)
	const [previewTemplate, setPreviewTemplate] = useState<TemplateMeta | null>(null)

	const refresh = useCallback(() => {
		router.refresh()
	}, [router])

	const run = useCallback(
		(fn: () => Promise<{ ok: boolean; error?: { message: string } }>) => {
			setError(null)
			startTransition(() => {
				void (async () => {
					const r = await fn()
					if (!r.ok && r.error) {
						setError(mapOpsActionErrorToMessage(r.error.message))
						return
					}
					refresh()
				})()
			})
		},
		[refresh],
	)

	const sortedRules = useMemo(
		() =>
			[...rules].sort((a, b) => {
				const ek = a.event_key.localeCompare(b.event_key)
				if (ek !== 0) return ek
				return a.channel.localeCompare(b.channel)
			}),
		[rules],
	)

	const sortedTemplates = useMemo(
		() =>
			[...templates].sort((a, b) => {
				const ek = a.event_key.localeCompare(b.event_key)
				if (ek !== 0) return ek
				return a.channel.localeCompare(b.channel)
			}),
		[templates],
	)

	const activityFeed = useMemo(
		() => buildCommsRegistryActivityFeed(rules, sortedTemplates, 24),
		[rules, sortedTemplates],
	)

	return (
		<div className="space-y-10">
			<OpsCommsTemplatePreviewDialog
				template={previewTemplate}
				open={previewTemplate != null}
				onClose={() => setPreviewTemplate(null)}
			/>
			{error ? (
				<div
					className="rounded-md border border-ops-danger/30 bg-ops-danger/10 px-3 py-2 text-sm text-ops-foreground"
					role="alert"
				>
					{error}
				</div>
			) : null}

			<section aria-labelledby="comms-activity-heading" className="rounded-xl border border-ops-border/80 bg-ops-surface/40 p-4 shadow-ops-1">
				<h2 id="comms-activity-heading" className="text-lg font-medium text-ops-foreground">
					{opsCommsCopy.activityHeading}
				</h2>
				<p className="mt-1 text-sm text-ops-muted">{opsCommsCopy.activityBlurb}</p>
				<ul
					className="mt-4 space-y-0 border-l border-ops-border/80 pl-5"
					aria-label={opsCommsCopy.activityLandmark}
				>
					{activityFeed.length === 0 ?
						<li className="text-sm text-ops-muted">{opsCommsCopy.activityEmpty}</li>
					:	activityFeed.map((item) => (
							<li key={item.id} className="relative pb-5 last:pb-0">
								<span
									className="absolute -left-[1.15rem] top-1.5 h-2 w-2 rounded-full bg-ops-accent ring-2 ring-ops-canvas"
									aria-hidden
								/>
								<div className="flex flex-wrap items-center gap-2">
									<span className="text-sm font-medium text-ops-foreground">{item.headline}</span>
									<OpsStatusPill tone={item.kind === 'template' ? 'info' : 'neutral'} dot={false}>
										{item.kind === 'template' ? 'Template' : 'Rule'}
									</OpsStatusPill>
								</div>
								<p className="mt-1 text-xs text-ops-muted">{item.detail}</p>
								<time
									className="mt-1 block text-xs tabular-nums text-ops-muted"
									dateTime={item.occurredAt}
								>
									{new Date(item.occurredAt).toLocaleString()}
								</time>
							</li>
						))
					}
				</ul>
			</section>

			<section aria-labelledby="comms-rules-heading">
				<h2 id="comms-rules-heading" className="text-lg font-medium text-ops-foreground">
					{opsCommsCopy.dispatchRulesHeading}
				</h2>
				<p className="mt-1 text-sm text-ops-muted">{opsCommsCopy.dispatchRulesBlurb}</p>
				<div className="mt-4">
					<OpsTableShell caption={opsCommsCopy.dispatchRulesCaption}>
						<thead className="border-b border-ops-border bg-ops-surface-hover/40 text-xs uppercase tracking-wide text-ops-muted">
							<tr>
								<th scope="col" className="px-3 py-2 font-medium">
									Active
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Event
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Channel
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Recipient role
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Filter
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Id
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Updated
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-ops-border">
							{sortedRules.map((rule) => (
								<DispatchRuleRow
									key={rule.id}
									rule={rule}
									disabled={pending}
									onError={setError}
									onRun={run}
								/>
							))}
						</tbody>
					</OpsTableShell>
				</div>
			</section>

			<section aria-labelledby="comms-templates-heading">
				<h2 id="comms-templates-heading" className="text-lg font-medium text-ops-foreground">
					{opsCommsCopy.templatesHeading}
				</h2>
				<p className="mt-1 text-sm text-ops-muted">
					Template wording and subjects stay PR-governed (**Q23**). Only the{' '}
					<code className="rounded bg-ops-surface-hover px-1 text-ops-foreground">active</code> flag can be
					changed here.
				</p>

				<p className="mt-2 text-xs text-ops-muted">{opsCommsCopy.templatesPreviewHint}</p>

				<div className="mt-4">
					<OpsTableShell caption={opsCommsCopy.templatesCaption}>
						<thead className="border-b border-ops-border bg-ops-surface-hover/40 text-xs uppercase tracking-wide text-ops-muted">
							<tr>
								<th scope="col" className="px-3 py-2 font-medium">
									Active
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Event
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Channel
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Subject (read-only)
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Version
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Id
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Updated
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Preview
								</th>
								<th scope="col" className="px-3 py-2 font-medium">
									Body changes
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-ops-border">
							{sortedTemplates.map((t) => (
								<tr
									key={t.id}
									className="align-top text-sm transition-colors hover:bg-ops-accent-soft"
								>
									<td className="px-3 py-3">
										<div className="flex flex-wrap items-center gap-2">
											<input
												type="checkbox"
												className="h-4 w-4 rounded border-ops-border text-ops focus:ring-ops"
												checked={t.active}
												disabled={pending}
												onChange={(e) => {
													const active = e.target.checked
													run(() => setCommsTemplateActiveAction({ id: t.id, active }))
												}}
											/>
											<OpsStatusPill tone={t.active ? 'success' : 'neutral'}>
												{t.active ? opsCommsCopy.activePillOn : opsCommsCopy.activePillOff}
											</OpsStatusPill>
										</div>
									</td>
									<td className="px-3 py-3 font-mono text-xs">{t.event_key}</td>
									<td className="px-3 py-3">
										<OpsStatusPill tone={channelPillTone(t.channel)} dot={false}>
											{opsCommsCopy.channelPill(t.channel)}
										</OpsStatusPill>
									</td>
									<td className="max-w-[14rem] px-3 py-3 text-ops-muted">
										{t.subject ?? '—'}
									</td>
									<td className="px-3 py-3">{t.version}</td>
									<td className="px-3 py-3 font-mono text-xs text-ops-muted">{t.id}</td>
									<td className="whitespace-nowrap px-3 py-3 text-xs text-ops-muted">
										{new Date(t.updated_at).toLocaleString()}
									</td>
									<td className="px-3 py-3">
										<Button
											type="button"
											variant="outline"
											size="sm"
											disabled={pending}
											onClick={() => setPreviewTemplate(t)}
											aria-label={opsCommsCopy.previewButtonAria(t.event_key)}
										>
											{opsCommsCopy.previewButtonLabel}
										</Button>
									</td>
									<td className="px-3 py-3 text-xs">
										{bodyChangeGuideUrl ? (
											<a
												href={bodyChangeGuideUrl}
												target="_blank"
												rel="noopener noreferrer"
												className="text-ops underline-offset-2 hover:underline"
											>
												PR / docs process
											</a>
										) : (
											<span className="text-ops-muted">
												Set{' '}
												<code className="rounded bg-ops-surface-hover px-1">
													NEXT_PUBLIC_COMMS_BODY_CHANGE_PR_GUIDE_URL
												</code>{' '}
												for a link.
											</span>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</OpsTableShell>
				</div>
			</section>
		</div>
	)
}

type DispatchRuleRowProps = {
	rule: CommsDispatchRuleRowDb
	disabled: boolean
	onError: (msg: string | null) => void
	onRun: (fn: () => Promise<{ ok: boolean; error?: { message: string } }>) => void
}

function DispatchRuleRow({ rule, disabled, onError, onRun }: DispatchRuleRowProps) {
	const [filterDraft, setFilterDraft] = useState(() => stableStringify(rule.recipient_filter))
	const filterKey = stableStringify(rule.recipient_filter)

	useEffect(() => {
		setFilterDraft(filterKey)
	}, [rule.id, rule.updated_at, filterKey])

	const filterDirty = filterDraft !== filterKey

	return (
		<tr className="align-top text-sm transition-colors hover:bg-ops-accent-soft">
			<td className="px-3 py-3">
				<div className="flex flex-wrap items-center gap-2">
					<input
						type="checkbox"
						className="h-4 w-4 rounded border-ops-border text-ops focus:ring-ops"
						checked={rule.active}
						disabled={disabled}
						onChange={(e) => {
							const active = e.target.checked
							onRun(() => setCommsDispatchRuleActiveAction({ id: rule.id, active }))
						}}
					/>
					<OpsStatusPill tone={rule.active ? 'success' : 'neutral'}>
						{rule.active ? opsCommsCopy.activePillOn : opsCommsCopy.activePillOff}
					</OpsStatusPill>
				</div>
			</td>
			<td className="px-3 py-3 font-mono text-xs">{rule.event_key}</td>
			<td className="px-3 py-3">
				<OpsStatusPill tone={channelPillTone(rule.channel)} dot={false}>
					{opsCommsCopy.channelPill(rule.channel)}
				</OpsStatusPill>
			</td>
			<td className="px-3 py-3">
				<Select
					className="min-w-[9rem] border-ops-border bg-ops-surface text-ops-foreground"
					value={rule.recipient_role}
					disabled={disabled}
					onChange={(e) => {
						const recipient_role = e.target.value
						onRun(() =>
							setCommsDispatchRuleRecipientRoleAction({
								id: rule.id,
								recipient_role: recipient_role as (typeof COMMS_DISPATCH_RECIPIENT_ROLES)[number],
							}),
						)
					}}
				>
					{COMMS_DISPATCH_RECIPIENT_ROLES.map((r) => (
						<option key={r} value={r}>
							{getCommsDispatchRecipientRoleLabel(r)}
						</option>
					))}
				</Select>
			</td>
			<td className="min-w-[12rem] px-3 py-3">
				<div className="text-xs text-ops-muted">{recipientFilterSummary(rule.recipient_filter)}</div>
				<Textarea
					className="mt-2 min-h-[5rem] border-ops-border bg-ops-surface font-mono text-xs text-ops-foreground"
					value={filterDraft}
					disabled={disabled}
					spellCheck={false}
					onChange={(e) => setFilterDraft(e.target.value)}
				/>
				<Button
					type="button"
					size="sm"
					variant="secondary"
					className="mt-2"
					disabled={disabled || !filterDirty}
					onClick={() => {
						onError(null)
						onRun(() =>
							setCommsDispatchRuleRecipientFilterAction({
								id: rule.id,
								recipient_filter_json: filterDraft,
							}),
						)
					}}
				>
					Save filter JSON
				</Button>
			</td>
			<td className="px-3 py-3 font-mono text-xs text-ops-muted">{rule.id}</td>
			<td className="whitespace-nowrap px-3 py-3 text-xs text-ops-muted">
				{new Date(rule.updated_at).toLocaleString()}
			</td>
		</tr>
	)
}
