import { z } from 'zod'

/**
 * JSON shape stored in `booking_quotes.line_items` (VST-14 migration comment).
 * Reused by quote UI (13.5) and server actions.
 */
export type BookingQuoteLineItem = {
	label: string
	qty: number
	unit_zar: number
	total_zar: number
	note?: string
}

export const bookingQuoteLineItemSchema = z.object({
	label: z.string().min(1).max(500),
	qty: z.number().finite().positive(),
	unit_zar: z.number().finite().nonnegative(),
	total_zar: z.number().finite().nonnegative(),
	note: z.string().max(2000).optional(),
})

export const bookingQuoteLineItemsSchema = z.array(bookingQuoteLineItemSchema).max(200)

export function serializeBookingQuoteLineItems(
	lineItems: BookingQuoteLineItem[],
): unknown {
	return bookingQuoteLineItemsSchema.parse(lineItems) as unknown
}

/** Parse `booking_quotes.line_items` jsonb for display (returns null if invalid). */
export function parseBookingQuoteLineItems(raw: unknown): BookingQuoteLineItem[] | null {
	const r = bookingQuoteLineItemsSchema.safeParse(raw)
	return r.success ? r.data : null
}
