'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
	type UpdateOpsBankAccountSettingsInput,
	updateOpsBankAccountSettingsAction,
} from '@/actions/updateOpsBankAccountSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { opsSettingsCopy } from '@/features/ops/copy/ops-settings-copy'
import { isOpsActionFailure, opsActionErrorMessage } from '@/lib/ops-action-result'

const C = opsSettingsCopy.bankAccount

export type OpsBankAccountSettingsFormInitial = {
	bank_name: string
	account_holder: string
	account_number: string
	branch_code: string
	reference_format: string
	invoice_reference_format: string
}

type OpsBankAccountSettingsFormProps = {
	initial: OpsBankAccountSettingsFormInitial
}

export function OpsBankAccountSettingsForm({ initial }: OpsBankAccountSettingsFormProps) {
	const router = useRouter()
	const [pending, startTransition] = useTransition()
	const [bankName, setBankName] = useState(initial.bank_name)
	const [accountHolder, setAccountHolder] = useState(initial.account_holder)
	const [accountNumber, setAccountNumber] = useState(initial.account_number)
	const [branchCode, setBranchCode] = useState(initial.branch_code)
	const [referenceFormat, setReferenceFormat] = useState(initial.reference_format)
	const [invoiceRefFormat, setInvoiceRefFormat] = useState(initial.invoice_reference_format)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [success, setSuccess] = useState(false)

	const submit = () => {
		setErrorMessage(null)
		setSuccess(false)
		const payload: UpdateOpsBankAccountSettingsInput = {
			bank_name: bankName,
			account_holder: accountHolder,
			account_number: accountNumber,
			branch_code: branchCode,
			reference_format: referenceFormat,
			invoice_reference_format: invoiceRefFormat,
		}
		startTransition(async () => {
			const res = await updateOpsBankAccountSettingsAction(payload)
			if (res.ok) {
				setSuccess(true)
				router.refresh()
				return
			}
			if (isOpsActionFailure(res)) {
				setErrorMessage(opsActionErrorMessage(res))
			}
		})
	}

	return (
		<div className="max-w-3xl space-y-6">
			<section
				className="rounded-lg border border-ops-border bg-ops-surface/10 p-4"
				aria-labelledby="bank-details-heading"
			>
				<h3 id="bank-details-heading" className="text-sm font-semibold text-ops-foreground">
					{C.sectionBankDetails}
				</h3>
				<p className="mt-1 text-xs text-ops-muted">{C.sectionBankDetailsHint}</p>
				<div className="mt-4 max-w-xl space-y-4">
					<div className="space-y-2">
						<label className="text-xs font-medium uppercase tracking-wide text-ops-muted" htmlFor="bank_name">
							{C.fieldBankName}
						</label>
						<Input
							id="bank_name"
							className="border-ops-border bg-ops-canvas text-ops-foreground"
							value={bankName}
							onChange={(e) => setBankName(e.target.value)}
							disabled={pending}
							autoComplete="organization"
						/>
					</div>
					<div className="space-y-2">
						<label
							className="text-xs font-medium uppercase tracking-wide text-ops-muted"
							htmlFor="account_holder"
						>
							{C.fieldAccountHolder}
						</label>
						<Input
							id="account_holder"
							className="border-ops-border bg-ops-canvas text-ops-foreground"
							value={accountHolder}
							onChange={(e) => setAccountHolder(e.target.value)}
							disabled={pending}
							autoComplete="name"
						/>
					</div>
					<div className="space-y-2">
						<label
							className="text-xs font-medium uppercase tracking-wide text-ops-muted"
							htmlFor="account_number"
						>
							{C.fieldAccountNumber}
						</label>
						<Input
							id="account_number"
							className="border-ops-border bg-ops-canvas font-mono text-sm text-ops-foreground"
							value={accountNumber}
							onChange={(e) => setAccountNumber(e.target.value)}
							disabled={pending}
							autoComplete="off"
						/>
					</div>
					<div className="space-y-2">
						<label className="text-xs font-medium uppercase tracking-wide text-ops-muted" htmlFor="branch_code">
							{C.fieldBranchCode}
						</label>
						<Input
							id="branch_code"
							className="border-ops-border bg-ops-canvas font-mono text-sm text-ops-foreground"
							value={branchCode}
							onChange={(e) => setBranchCode(e.target.value)}
							disabled={pending}
							autoComplete="off"
						/>
					</div>
				</div>
			</section>

			<section
				className="rounded-lg border border-ops-border bg-ops-surface/10 p-4"
				aria-labelledby="bank-refs-heading"
			>
				<h3 id="bank-refs-heading" className="text-sm font-semibold text-ops-foreground">
					{C.sectionReferences}
				</h3>
				<p className="mt-1 text-xs text-ops-muted">{C.sectionReferencesHint}</p>
				<div className="mt-4 max-w-xl space-y-4">
					<div className="space-y-2">
						<label
							className="text-xs font-medium uppercase tracking-wide text-ops-muted"
							htmlFor="reference_format"
						>
							{C.fieldReferenceFormat}
						</label>
						<Input
							id="reference_format"
							className="border-ops-border bg-ops-canvas font-mono text-sm text-ops-foreground"
							value={referenceFormat}
							onChange={(e) => setReferenceFormat(e.target.value)}
							disabled={pending}
							placeholder="VST-{booking_ref}"
						/>
						<p className="text-xs text-ops-muted">
							{C.fieldReferenceFormatHintBefore}
							<code className="text-ops-foreground">{'{booking_ref}'}</code>
							{C.fieldReferenceFormatHintAfter}
						</p>
					</div>
					<div className="space-y-2">
						<label
							className="text-xs font-medium uppercase tracking-wide text-ops-muted"
							htmlFor="invoice_reference_format"
						>
							{C.fieldInvoiceReferenceFormat}
						</label>
						<Input
							id="invoice_reference_format"
							className="border-ops-border bg-ops-canvas font-mono text-sm text-ops-foreground"
							value={invoiceRefFormat}
							onChange={(e) => setInvoiceRefFormat(e.target.value)}
							disabled={pending}
							placeholder="{invoice_number} or {booking_ref}"
						/>
					</div>
				</div>
			</section>

			<Button type="button" disabled={pending} onClick={submit}>
				{pending ? C.savePending : C.saveButton}
			</Button>
			{errorMessage ? (
				<p className="text-sm text-destructive" role="alert">
					{errorMessage}
				</p>
			) : null}
			{success && !errorMessage ? (
				<p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
					{C.successMessage}
				</p>
			) : null}
		</div>
	)
}
