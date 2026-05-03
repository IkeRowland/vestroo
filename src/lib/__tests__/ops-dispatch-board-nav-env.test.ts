import { afterEach, describe, expect, it, vi } from 'vitest'

describe('isOpsDispatchBoardNavEnabled', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('returns false when unset', async () => {
		vi.unstubAllEnvs()
		vi.resetModules()
		const { isOpsDispatchBoardNavEnabled } = await import('@/lib/ops-dispatch-board-nav-env')
		expect(isOpsDispatchBoardNavEnabled()).toBe(false)
	})

	it('returns false for empty / falsey strings', async () => {
		for (const v of ['', '0', 'false', 'no', 'off', '  \t  ']) {
			vi.stubEnv('NEXT_PUBLIC_OPS_DISPATCH_BOARD_NAV_ENABLED', v)
			vi.resetModules()
			const { isOpsDispatchBoardNavEnabled } = await import('@/lib/ops-dispatch-board-nav-env')
			expect(isOpsDispatchBoardNavEnabled(), v).toBe(false)
		}
	})

	it('returns true for canonical truthy tokens', async () => {
		for (const v of ['1', 'true', 'TRUE', 'yes', 'On']) {
			vi.stubEnv('NEXT_PUBLIC_OPS_DISPATCH_BOARD_NAV_ENABLED', v)
			vi.resetModules()
			const { isOpsDispatchBoardNavEnabled } = await import('@/lib/ops-dispatch-board-nav-env')
			expect(isOpsDispatchBoardNavEnabled(), v).toBe(true)
		}
	})
})
