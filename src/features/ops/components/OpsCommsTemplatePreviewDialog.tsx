'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
	loadCommsTemplatePreviewAction,
	type CommsTemplatePreviewEmail,
	type CommsTemplatePreviewSms,
} from '@/actions/opsCommsPreview'
import { mapOpsActionErrorToMessage } from '@/features/ops/ops-action-errors'

type TemplateMeta = {
	id: string
	event_key: string
	channel: string
}

type OpsCommsTemplatePreviewDialogProps = {
	template: TemplateMeta | null
	open: boolean
	onClose: () => void
}

export function OpsCommsTemplatePreviewDialog({
	template,
	open,
	onClose,
}: OpsCommsTemplatePreviewDialogProps) {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [emailTab, setEmailTab] = useState<'html' | 'text'>('html')
	const [preview, setPreview] = useState<
		CommsTemplatePreviewEmail | CommsTemplatePreviewSms | null
	>(null)

	const load = useCallback(async (t: TemplateMeta) => {
		if (t.channel !== 'email' && t.channel !== 'sms') {
			setError('Unsupported channel for preview.')
			return
		}
		setLoading(true)
		setError(null)
		setPreview(null)
		const r = await loadCommsTemplatePreviewAction({
			id: t.id,
			event_key: t.event_key,
			channel: t.channel,
		})
		setLoading(false)
		if (!r.ok) {
			setPreview(null)
			setError(mapOpsActionErrorToMessage(r.error.message))
			return
		}
		setPreview(r.preview)
	}, [])

	useEffect(() => {
		if (!open || !template) {
			setPreview(null)
			setError(null)
			setEmailTab('html')
			return
		}
		void load(template)
	}, [open, template, load])

	useEffect(() => {
		if (!open) return
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		window.addEventListener('keydown', onKey)
		return () => window.removeEventListener('keydown', onKey)
	}, [open, onClose])

	if (!open || !template) {
		return null
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
			role="presentation"
		>
			<div
				className="flex max-h-[min(90vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-ops-border bg-ops-surface shadow-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="comms-preview-title"
			>
				<div className="flex items-start justify-between gap-3 border-b border-ops-border px-4 py-3">
					<div className="min-w-0">
						<h2 id="comms-preview-title" className="text-lg font-semibold text-ops-foreground">
							Template preview
						</h2>
						<p className="mt-1 truncate font-mono text-xs text-ops-muted">
							{template.event_key} · {template.channel} · {template.id}
						</p>
						<p className="mt-2 text-xs text-ops-muted">
							Read-only preview with deterministic seeds (**15C.4**). Placeholders not in the seed map stay
							as literal <code className="text-ops-foreground/90">{'{{ tokens }}'}</code>. No messages are
							sent.
						</p>
					</div>
					<Button type="button" variant="outline" size="sm" onClick={onClose} className="shrink-0">
						Close
					</Button>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
					{loading ? (
						<p className="text-sm text-ops-muted">Loading preview…</p>
					) : error ? (
						<div
							className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
							role="alert"
						>
							{error}
						</div>
					) : preview && preview.channel === 'email' ? (
						<div className="space-y-4">
							<div>
								<div className="text-xs font-medium uppercase tracking-wide text-ops-muted">Subject</div>
								<p className="mt-1 text-sm text-ops-foreground">
									{preview.subjectRendered ?? '—'}
								</p>
							</div>
							<div className="flex gap-2 border-b border-ops-border pb-2">
								<button
									type="button"
									className={`rounded-md px-3 py-1.5 text-sm font-medium ${
										emailTab === 'html'
											? 'bg-ops-surface-active text-ops-foreground'
											: 'text-ops-muted hover:bg-ops-surface-hover/80'
									}`}
									onClick={() => setEmailTab('html')}
								>
									HTML
								</button>
								<button
									type="button"
									className={`rounded-md px-3 py-1.5 text-sm font-medium ${
										emailTab === 'text'
											? 'bg-ops-surface-active text-ops-foreground'
											: 'text-ops-muted hover:bg-ops-surface-hover/80'
									}`}
									onClick={() => setEmailTab('text')}
								>
									Plain text
								</button>
							</div>
							{emailTab === 'html' ? (
								preview.htmlWasEmpty ? (
									<p className="text-sm text-ops-muted">No HTML body is stored for this template.</p>
								) : (
									<div className="space-y-2">
										<p className="text-xs text-ops-muted">
											HTML is sanitised server-side and shown in a sandboxed iframe (no scripts,
											no outbound loads beyond what the browser allows for srcDoc).
										</p>
										<iframe
											title="Email HTML preview"
											className="h-[min(420px,50vh)] w-full rounded border border-ops-border bg-white"
											sandbox=""
											srcDoc={preview.htmlSanitized}
										/>
									</div>
								)
							) : preview.bodyTextWasEmptyInDb ? (
								<p className="text-sm text-ops-muted">
									No plain-text body is stored for this template. Plain text is not auto-derived from
									HTML in this release.
								</p>
							) : (
								<pre className="whitespace-pre-wrap break-words rounded border border-ops-border bg-ops-canvas p-3 font-sans text-sm text-ops-foreground">
									{preview.bodyTextRendered ?? ''}
								</pre>
							)}
						</div>
					) : preview && preview.channel === 'sms' ? (
						<div className="space-y-3">
							{preview.smsWasEmptyInDb ? (
								<p className="text-sm text-ops-muted">No SMS body is stored for this template.</p>
							) : (
								<pre className="whitespace-pre-wrap break-words rounded border border-ops-border bg-ops-canvas p-3 font-sans text-sm text-ops-foreground">
									{preview.smsRendered}
								</pre>
							)}
							<div className="rounded-md border border-ops-border bg-ops-surface-hover/30 px-3 py-2 text-xs text-ops-muted">
								<strong className="font-medium text-ops-foreground">Length (approx.)</strong> —{' '}
								{preview.segmentInfo.encoding}: {preview.segmentInfo.characters} character(s),{' '}
								{preview.segmentInfo.segments} segment(s). GSM-7 extended characters are not modelled; UCS-2
								uses 70 / 67 chars per segment.
							</div>
						</div>
					) : (
						<p className="text-sm text-ops-muted">No preview data.</p>
					)}
				</div>
			</div>
		</div>
	)
}
