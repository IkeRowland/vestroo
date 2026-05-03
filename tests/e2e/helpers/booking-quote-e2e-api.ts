import type { APIRequestContext } from '@playwright/test'

import type { BookingQuoteLineItem } from '@/types/booking-quote'

export async function e2eCreateBookingQuote(
	request: APIRequestContext,
	input: {
		bookingId: string
		totalZar: number
		lineItems: BookingQuoteLineItem[]
		expiresAt?: string | null
	},
): Promise<Awaited<ReturnType<APIRequestContext['post']>>> {
	return request.post('/api/e2e/booking-quote', {
		data: {
			action: 'create' as const,
			bookingId: input.bookingId,
			totalZar: input.totalZar,
			lineItems: input.lineItems,
			expiresAt: input.expiresAt ?? null,
		},
	})
}

export async function e2eSendBookingQuote(
	request: APIRequestContext,
	quoteId: string,
): Promise<Awaited<ReturnType<APIRequestContext['post']>>> {
	return request.post('/api/e2e/booking-quote', {
		data: { action: 'send' as const, quoteId },
	})
}
