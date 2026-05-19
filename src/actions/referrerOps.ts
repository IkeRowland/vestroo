'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'

import { getOpsStaffForAction } from '@/lib/ops-auth'
import type { ReferrerRow } from '@/lib/referrer-types'
import { createServerClient } from '@/lib/supabase/server'

const referrerUpsertSchema = z.object({
	id: z.string().uuid().optional(),
	name: z.string().trim().min(1, 'Name is required').max(120),
	code: z
		.string()
		.trim()
		.max(32)
		.optional()
		.transform((s) => (s && s.length > 0 ? s : null)),
	email: z
		.union([z.string().trim().email('Enter a valid email'), z.literal('')])
		.optional()
		.transform((s) => (s && s.length > 0 ? s : null)),
	status: z.enum(['active', 'inactive']),
	commissionRate: z
		.union([z.number(), z.string()])
		.optional()
		.transform((v) => {
			if (v === undefined || v === '') return null
			const n = typeof v === 'number' ? v : Number(v)
			return Number.isFinite(n) ? n : null
		}),
})

export type ReferrerUpsertInput = z.infer<typeof referrerUpsertSchema>

export type ReferrerOpsResult =
	| { ok: true; referrer?: ReferrerRow }
	| { ok: false; message: string }

export async function listActiveReferrersForOps(): Promise<ReferrerRow[]> {
	const gate = await getOpsStaffForAction()
	if (!gate.ok) return []

	const supabase = await createServerClient()
	const { data } = await supabase
		.from('referrers')
		.select('id, name, code, email, status, commission_rate, created_at')
		.eq('status', 'active')
		.order('name', { ascending: true })

	return (data ?? []) as ReferrerRow[]
}

export async function upsertReferrerAction(raw: unknown): Promise<ReferrerOpsResult> {
	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false, message: gate.message }
	}

	const parsed = referrerUpsertSchema.safeParse(raw)
	if (!parsed.success) {
		const first = parsed.error.flatten().fieldErrors
		const msg =
			first.name?.[0] ??
			first.email?.[0] ??
			first.code?.[0] ??
			'Check the form and try again.'
		return { ok: false, message: msg }
	}

	const { id, name, code, email, status, commissionRate } = parsed.data
	const supabase = await createServerClient()

	const row = {
		name,
		code,
		email,
		status,
		commission_rate: commissionRate,
	}

	if (id) {
		const { data, error } = await supabase
			.from('referrers')
			.update(row)
			.eq('id', id)
			.select('id, name, code, email, status, commission_rate, created_at')
			.single()
		if (error) {
			return { ok: false, message: error.message }
		}
		revalidatePath('/ops/finance/referrals')
		return { ok: true, referrer: data as ReferrerRow }
	}

	const { data, error } = await supabase
		.from('referrers')
		.insert(row)
		.select('id, name, code, email, status, commission_rate, created_at')
		.single()
	if (error) {
		return { ok: false, message: error.message }
	}
	revalidatePath('/ops/finance/referrals')
	return { ok: true, referrer: data as ReferrerRow }
}
