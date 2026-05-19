import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { WebBookingPayload } from '@/actions/booking-schemas'
import { enrichWebBookingWithClientType } from '@/actions/booking-client-type-enrich'

const tryUpgrade = vi.fn()

vi.mock('@/actions/loadDomainCandidatesForCustomerEmail', () => ({
	loadDomainCandidatesForCustomerEmail: vi.fn().mockResolvedValue([
		{
			id: '11111111-1111-1111-1111-111111111111',
			name: 'HyIMPACT',
			credit_terms_days: 30,
			default_billing_entity_ref: null,
			default_po_required: false,
		},
	]),
}))

vi.mock('@/actions/resolvePortalVerifiedAccountClient', () => ({
	resolvePortalVerifiedAccountClientInsert: vi.fn(),
	tryResolvePortalVerifiedAccountClientInsert: (...args: unknown[]) => tryUpgrade(...args),
}))

describe('enrichWebBookingWithClientType — portal session upgrade', () => {
	beforeEach(() => {
		tryUpgrade.mockReset()
	})

	it('upgrades domain-match account_client to portal_active when session verifies membership', async () => {
		tryUpgrade.mockResolvedValue({
			client_type: 'account_client',
			customer_account_id: '11111111-1111-1111-1111-111111111111',
			account_snapshot: {
				name: 'HyIMPACT',
				credit_terms_days: 30,
				default_billing_entity_ref: null,
				po_required_at_snapshot: false,
			},
			client_type_source: 'portal_active_account_session',
		})

		const payload = {
			bookingIntent: 'point_to_point' as const,
			origin: {
				placeId: 'a',
				formattedAddress: 'A',
				name: 'A',
				latitude: -26,
				longitude: 28,
			},
			destination: {
				placeId: 'b',
				formattedAddress: 'B',
				name: 'B',
				latitude: -26.1,
				longitude: 28.1,
			},
			date: new Date('2030-06-01T12:00:00.000Z'),
			passengers: 1,
			quoteAmount: 100,
			selectedVehicleId: '22222222-2222-2222-2222-222222222222',
			customer: { name: 'Test User', email: 'user@corp.example', phone: '+27123456789' },
			clientTypeResolution: {
				clientType: 'account_client' as const,
				customerAccountId: '11111111-1111-1111-1111-111111111111',
				clientTypeSource: 'user_confirmed_domain_match' as const,
			},
		} satisfies Partial<WebBookingPayload> as WebBookingPayload

		const out = await enrichWebBookingWithClientType(payload, {})

		expect(tryUpgrade).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111')
		expect(out.client_type).toBe('account_client')
		expect(out.booking_metadata.client_type_source).toBe('portal_active_account_session')
	})

	it('keeps domain-match metadata when portal upgrade returns null', async () => {
		tryUpgrade.mockResolvedValue(null)

		const payload = {
			bookingIntent: 'point_to_point' as const,
			origin: {
				placeId: 'a',
				formattedAddress: 'A',
				name: 'A',
				latitude: -26,
				longitude: 28,
			},
			destination: {
				placeId: 'b',
				formattedAddress: 'B',
				name: 'B',
				latitude: -26.1,
				longitude: 28.1,
			},
			date: new Date('2030-06-01T12:00:00.000Z'),
			passengers: 1,
			quoteAmount: 100,
			selectedVehicleId: '22222222-2222-2222-2222-222222222222',
			customer: { name: 'Test User', email: 'user@corp.example', phone: '+27123456789' },
			clientTypeResolution: {
				clientType: 'account_client' as const,
				customerAccountId: '11111111-1111-1111-1111-111111111111',
				clientTypeSource: 'user_confirmed_domain_match' as const,
			},
		} satisfies Partial<WebBookingPayload> as WebBookingPayload

		const out = await enrichWebBookingWithClientType(payload, {})

		expect(out.booking_metadata.client_type_source).toBe('user_confirmed_domain_match')
	})
})
