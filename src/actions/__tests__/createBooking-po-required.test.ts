import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createBooking } from '../createBooking';

vi.mock('@/lib/booking-quote-reconcile', () => ({
	reconcileBookingQuote: vi.fn().mockResolvedValue({
		serverTotalZar: 199.5,
		distanceKm: 12,
		estimatedDurationMinutes: 18,
	}),
}));

vi.mock('@/actions/booking-client-type-enrich', () => ({
	enrichWebBookingWithClientType: vi.fn().mockResolvedValue({
		client_type: 'account_client',
		customer_account_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
		account_snapshot: { name: 'PO Corp' },
		booking_metadata: { client_type_source: 'domain_match' },
	}),
}));

vi.mock('@/services/sms', () => ({
	notifyBookingCreatedSms: vi.fn().mockResolvedValue(undefined),
}));

const insertMock = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
	createServerClient: vi.fn().mockResolvedValue({
		from: vi.fn((table: string) => {
			if (table === 'customer_accounts') {
				return {
					select: vi.fn().mockReturnThis(),
					eq: vi.fn().mockReturnThis(),
					maybeSingle: vi.fn().mockResolvedValue({
						data: { name: 'PO Corp', default_po_required: true },
						error: null,
					}),
				};
			}
			return {
				insert: insertMock,
			};
		}),
	}),
}));

/**
 * Epic 12 Story 12.9 / §6 — server-side PO gate when bypassing client form (same entry as production).
 */
describe('createBooking — Q4 PO required (account_client)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('rejects insert when default_po_required and purchase order is blank', async () => {
		const payload = {
			bookingIntent: 'point_to_point' as const,
			origin: {
				placeId: 'a',
				formattedAddress: 'A St',
				name: 'A',
				latitude: -26,
				longitude: 28,
			},
			destination: {
				placeId: 'b',
				formattedAddress: 'B St',
				name: 'B',
				latitude: -26.1,
				longitude: 28.1,
			},
			date: new Date('2026-06-01T09:00:00Z'),
			passengers: 2,
			flightNumber: null,
			selectedVehicleId: '1',
			quoteAmount: 199.5,
			estimatedDuration: 18,
			distance: 12,
			customer: {
				name: 'Test User',
				email: 'user@pocorp.example',
				phone: '+27123456789',
			},
			purchaseOrderRef: null,
		};

		const result = await createBooking(payload);
		expect(result.success).toBe(false);
		if (result.success) {
			return;
		}
		expect(result.error).toMatch(/purchase order/i);
		expect(insertMock).not.toHaveBeenCalled();
	});
});
