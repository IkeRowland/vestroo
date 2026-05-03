import Link from 'next/link'

import { OpsBankAccountSettingsForm } from '@/features/ops/components/ops-bank-account-settings-form'
import { OpsPageHeader } from '@/features/ops/components/ops-primitives'
import { opsSettingsCopy } from '@/features/ops/copy/ops-settings-copy'
import { getBankAccountForReader } from '@/lib/bank-account-display'
import { requireOpsAdminPage } from '@/lib/ops-auth'
import { createUserServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const C = opsSettingsCopy.bankAccount

function formatUpdatedAt(iso: string | null): string {
	if (!iso) return '—'
	const d = new Date(iso)
	if (Number.isNaN(d.getTime())) return '—'
	return new Intl.DateTimeFormat('en-ZA', { dateStyle: 'medium', timeStyle: 'short' }).format(d)
}

export default async function OpsBankAccountSettingsPage() {
	await requireOpsAdminPage()
	const supabase = await createUserServerClient()

	const { data: row, error } = await supabase
		.from('ops_settings')
		.select('value, updated_at')
		.eq('key', 'bank_account')
		.maybeSingle()

	const parsed = getBankAccountForReader('admin', row?.value)
	const invRaw =
		parsed && typeof parsed === 'object' && 'invoice_reference_format' in parsed ?
			(parsed as { invoice_reference_format?: unknown }).invoice_reference_format
		:	undefined
	const invoiceRef =
		typeof invRaw === 'string' ? invRaw.trim() : typeof invRaw === 'number' ? String(invRaw).trim() : ''

	const initial = {
		bank_name: parsed?.bank_name ?? '',
		account_holder: parsed?.account_holder ?? '',
		account_number: parsed?.account_number ?? '',
		branch_code: parsed?.branch_code ?? '',
		reference_format:
			typeof parsed?.reference_format === 'string' && parsed.reference_format.trim() !== ''
				? parsed.reference_format.trim()
				: 'VST-{booking_ref}',
		invoice_reference_format: invoiceRef,
	}

	return (
		<div className="min-w-0 max-w-full space-y-6">
			<OpsPageHeader
				title={C.pageTitle}
				description={
					<>
						{C.pageDescriptionLead}{' '}
						{C.descriptionStoredIn}{' '}
						<code className="text-xs text-ops-foreground">{C.settingsKeyNoteCode}</code>.
					</>
				}
			/>

			<p className="text-sm text-ops-muted">
				<Link href={C.backHref} className="font-medium text-primary underline-offset-2 hover:underline">
					{C.backLinkLabel}
				</Link>
			</p>

			{error ? (
				<p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
					{C.loadErrorPrefix} {error.message}
				</p>
			) : !row ? (
				<p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
					{C.noRowWarning}
				</p>
			) : (
				<div className="space-y-4">
					<p className="text-xs text-ops-muted">
						{C.lastUpdatedPrefix} {formatUpdatedAt(row.updated_at ?? null)}.
					</p>
					<OpsBankAccountSettingsForm initial={initial} />
				</div>
			)}
		</div>
	)
}
