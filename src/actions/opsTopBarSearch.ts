'use server'

import { cookies } from 'next/headers'
import { z } from 'zod'

import { getOpsStaffForAction } from '@/lib/ops-auth'
import { buildOpsBookingsAdvancedSearchHref } from '@/lib/ops-booking-grid-query'
import { createUserServerClient } from '@/lib/supabase/server'

const RECENT_COOKIE = 'ops_top_bar_search_recent'
const MAX_RECENT = 5
const MAX_QUERY_LEN = 200

export type OpsTopBarQuickJump = {
	label: string
	href: string
}

const recordSchema = z.object({
	query: z.string().trim().min(1).max(MAX_QUERY_LEN),
})

export async function getOpsTopBarSearchSuggestionsAction(): Promise<
	| { ok: true; recentQueries: string[]; quickJump: OpsTopBarQuickJump[] }
	| { ok: false; message: string }
> {
	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false, message: gate.message }
	}

	const jar = await cookies()
	let recentQueries: string[] = []
	try {
		const raw = jar.get(RECENT_COOKIE)?.value
		if (raw) {
			const parsed = JSON.parse(raw) as unknown
			if (Array.isArray(parsed)) {
				recentQueries = parsed
					.filter((x): x is string => typeof x === 'string')
					.map((q) => q.trim())
					.filter(Boolean)
					.slice(0, MAX_RECENT)
			}
		}
	} catch {
		recentQueries = []
	}

	const supabase = await createUserServerClient()
	const quickJump: OpsTopBarQuickJump[] = []

	const { data: bookings } = await supabase
		.from('bookings')
		.select('id, payment_reference, customer_name')
		.order('updated_at', { ascending: false })
		.limit(3)

	for (const row of bookings ?? []) {
		const id = row.id as string
		const refRaw = (row.payment_reference as string | null | undefined)?.trim()
		const customer = (row.customer_name as string | null | undefined)?.trim()
		const ref = refRaw || id.slice(0, 8)
		const label = customer ? `${ref} — ${customer}` : `Booking ${ref}`
		const q = refRaw || id
		quickJump.push({
			label,
			href: buildOpsBookingsAdvancedSearchHref({ q }),
		})
	}

	const { data: vehicles } = await supabase
		.from('vehicles')
		.select('id, license_plate, name')
		.order('updated_at', { ascending: false })
		.limit(3)

	for (const row of vehicles ?? []) {
		const plate = (row.license_plate as string | null | undefined)?.trim() || 'Vehicle'
		const name = (row.name as string | null | undefined)?.trim() || 'Vehicle'
		quickJump.push({
			label: `${plate} (${name})`,
			href: buildOpsBookingsAdvancedSearchHref({ q: plate }),
		})
	}

	return { ok: true, recentQueries, quickJump }
}

export async function recordOpsTopBarSearchQueryAction(
	raw: z.infer<typeof recordSchema>,
): Promise<{ ok: boolean }> {
	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return { ok: false }
	}
	const parsed = recordSchema.safeParse(raw)
	if (!parsed.success) {
		return { ok: false }
	}

	const jar = await cookies()
	let existing: string[] = []
	try {
		const r = jar.get(RECENT_COOKIE)?.value
		if (r) {
			const j = JSON.parse(r) as unknown
			if (Array.isArray(j)) {
				existing = j.filter((x): x is string => typeof x === 'string')
			}
		}
	} catch {
		existing = []
	}

	const q = parsed.data.query
	const next = [q, ...existing.filter((x) => x !== q)].slice(0, MAX_RECENT)

	jar.set(RECENT_COOKIE, JSON.stringify(next), {
		path: '/ops',
		httpOnly: true,
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 30,
		secure: process.env.NODE_ENV === 'production',
	})

	return { ok: true }
}
