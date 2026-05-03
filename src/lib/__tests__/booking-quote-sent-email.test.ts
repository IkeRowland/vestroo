import { describe, it, expect, vi } from 'vitest'

import { resolveSentToEmailForBooking } from '@/lib/booking-quote-sent-email'

describe('resolveSentToEmailForBooking', () => {
	it('prefers account member email for account_client when member row exists', async () => {
		const supabase = {
			from: vi.fn((table: string) => {
				if (table === 'customer_account_members') {
					return {
						select: vi.fn().mockReturnThis(),
						eq: vi.fn().mockReturnThis(),
						maybeSingle: vi.fn().mockResolvedValue({
							data: { email: 'Member@Acme.co.za' },
							error: null,
						}),
					}
				}
				throw new Error(`unexpected ${table}`)
			}),
		}
		const res = await resolveSentToEmailForBooking(supabase as never, {
			client_type: 'account_client',
			customer_email: 'web@acme.co.za',
			customer_id: 'p1',
			customer_account_id: 'a1',
			account_snapshot: null,
		})
		expect(res).toEqual({ ok: true, email: 'member@acme.co.za' })
	})

	it('falls back to customer_email when no member match', async () => {
		const supabase = {
			from: vi.fn(() => ({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
			})),
		}
		const res = await resolveSentToEmailForBooking(supabase as never, {
			client_type: 'account_client',
			customer_email: 'Web@Acme.co.za',
			customer_id: 'p1',
			customer_account_id: 'a1',
			account_snapshot: null,
		})
		expect(res).toEqual({ ok: true, email: 'web@acme.co.za' })
	})

	it('uses account_snapshot.contact_email when member and booking email missing', async () => {
		const supabase = {
			from: vi.fn(() => ({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
			})),
		}
		const res = await resolveSentToEmailForBooking(supabase as never, {
			client_type: 'account_client',
			customer_email: null,
			customer_id: 'p1',
			customer_account_id: 'a1',
			account_snapshot: { contact_email: 'Snap@Acme.co.za' },
		})
		expect(res).toEqual({ ok: true, email: 'snap@acme.co.za' })
	})

	it('returns failure when nothing resolvable', async () => {
		const supabase = {
			from: vi.fn(() => ({
				select: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
				maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
			})),
		}
		const res = await resolveSentToEmailForBooking(supabase as never, {
			client_type: 'walk_in',
			customer_email: '   ',
			customer_id: null,
			customer_account_id: null,
			account_snapshot: null,
		})
		expect(res.ok).toBe(false)
	})
})
