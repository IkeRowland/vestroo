import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createBookingQuote, sendBookingQuote } from '@/actions/bookingQuoteOps'
import { getOpsStaffForAction } from '@/lib/ops-auth'
import { bookingQuoteLineItemsSchema } from '@/types/booking-quote'

function e2eBookingQuoteApiEnabled(): boolean {
	return process.env.NODE_ENV !== 'production' && process.env.E2E_ENABLE_BOOKING_QUOTE_API === '1'
}

const createBodySchema = z.object({
	action: z.literal('create'),
	bookingId: z.string().uuid(),
	lineItems: bookingQuoteLineItemsSchema,
	totalZar: z.number().finite().nonnegative(),
	expiresAt: z.string().datetime().optional().nullable(),
})

const sendBodySchema = z.object({
	action: z.literal('send'),
	quoteId: z.string().uuid(),
})

const bodySchema = z.discriminatedUnion('action', [createBodySchema, sendBodySchema])

/**
 * E2E-only bridge to server actions (Story 13.12): there is no ops UI for first send of a draft quote yet.
 * Requires an authenticated ops session (same cookies as `/ops/**`) plus `E2E_ENABLE_BOOKING_QUOTE_API=1`
 * on the Next dev server (Playwright `webServer` sets this automatically).
 */
export async function POST(req: Request) {
	if (!e2eBookingQuoteApiEnabled()) {
		return NextResponse.json({ ok: false, error: 'disabled' }, { status: 404 })
	}

	const gate = await getOpsStaffForAction()
	if (!gate.ok) {
		return NextResponse.json({ ok: false, error: gate.message }, { status: 401 })
	}

	let json: unknown
	try {
		json = await req.json()
	} catch {
		return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
	}

	const parsed = bodySchema.safeParse(json)
	if (!parsed.success) {
		return NextResponse.json({ ok: false, error: 'validation', issues: parsed.error.flatten() }, { status: 400 })
	}

	if (parsed.data.action === 'create') {
		const { bookingId, lineItems, totalZar, expiresAt } = parsed.data
		const res = await createBookingQuote(bookingId, lineItems, totalZar, expiresAt ?? undefined)
		if (!res.ok) {
			return NextResponse.json(
				{ ok: false, error: res.error },
				{ status: res.error.code === 'FORBIDDEN' ? 403 : 400 },
			)
		}
		return NextResponse.json({ ok: true, quoteId: res.quoteId, version: res.version })
	}

	const res = await sendBookingQuote(parsed.data.quoteId)
	if (!res.ok) {
		return NextResponse.json(
			{ ok: false, error: res.error },
			{ status: res.error.code === 'FORBIDDEN' ? 403 : 400 },
		)
	}
	return NextResponse.json({ ok: true, correlationId: res.correlationId, idempotent: res.idempotent })
}
