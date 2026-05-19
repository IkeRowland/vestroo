import { describe, it, expect } from 'vitest'

import {
	assertClientResolutionForSubmit,
	resolveOpsReferrerClientTypeInsert,
} from '@/actions/client-type-resolution'

const row = (id: string, name: string) => ({
	id,
	name,
	credit_terms_days: 30,
	default_billing_entity_ref: null,
	default_po_required: false,
})

describe('assertClientResolutionForSubmit', () => {
	it('allows walk_in + no_match when no candidates', () => {
		expect(
			assertClientResolutionForSubmit([], {
				clientType: 'walk_in',
				customerAccountId: null,
				clientTypeSource: 'no_match',
			}),
		).toEqual({
			clientType: 'walk_in',
			customerAccountId: null,
			clientTypeSource: 'no_match',
		})
	})

	it('requires decline when candidates exist', () => {
		expect(() =>
			assertClientResolutionForSubmit([row('a', 'Acme')], {
				clientType: 'walk_in',
				customerAccountId: null,
				clientTypeSource: 'no_match',
			}),
		).toThrow(/confirm whether this is a business booking/)
	})

	it('resolveOpsReferrerClientTypeInsert sets referral client type', () => {
		const base = { trip_request: { version: 1 } }
		expect(resolveOpsReferrerClientTypeInsert(base)).toEqual({
			client_type: 'referral',
			customer_account_id: null,
			account_snapshot: null,
			client_type_source: 'ops_referrer',
			booking_metadata: {
				...base,
				client_type_source: 'ops_referrer',
			},
		})
	})

	it('allows account_client when id is in candidate list', () => {
		const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
		expect(
			assertClientResolutionForSubmit([row(id, 'Acme')], {
				clientType: 'account_client',
				customerAccountId: id,
				clientTypeSource: 'user_confirmed_domain_match',
			}),
		).toEqual({
			clientType: 'account_client',
			customerAccountId: id,
			clientTypeSource: 'user_confirmed_domain_match',
		})
	})
})
