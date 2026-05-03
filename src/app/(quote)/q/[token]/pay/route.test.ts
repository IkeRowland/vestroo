import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'

import { GET } from './route'

describe('legacy /q/[token]/pay → /accept redirect (Epic 16 Theme N / US-N7)', () => {
	it('returns 302 with Location path /q/{token}/accept on same origin', async () => {
		const request = new NextRequest('https://staging.example/q/abc123token/pay')
		const response = await GET(request, {
			params: Promise.resolve({ token: 'abc123token' }),
		})
		expect(response.status).toBe(302)
		expect(response.headers.get('location')).toBe(
			'https://staging.example/q/abc123token/accept',
		)
	})
})
