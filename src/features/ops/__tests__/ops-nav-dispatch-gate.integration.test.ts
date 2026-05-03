import { afterEach, describe, expect, it, vi } from 'vitest'

/**
 * Dynamic import only — **`OPS_NAV_GROUPS`** calls **`isOpsDispatchBoardNavEnabled()`** at module init.
 * Do not add a static import of **`ops-nav-config`** at the top of this file.
 */
describe('OPS_NAV_GROUPS — /ops/dispatch nav gate', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
		vi.resetModules()
	})

	it('omits dispatch link when flag is false', async () => {
		vi.stubEnv('NEXT_PUBLIC_OPS_DISPATCH_BOARD_NAV_ENABLED', 'false')
		vi.resetModules()
		const { OPS_NAV_GROUPS } = await import('@/features/ops/ops-nav-config')
		const fulfil = OPS_NAV_GROUPS.find((g) => g.id === 'fulfilment')
		expect(fulfil?.items.some((i) => i.href === '/ops/dispatch')).toBe(false)
	})

	it('includes dispatch link when flag is truthy', async () => {
		vi.stubEnv('NEXT_PUBLIC_OPS_DISPATCH_BOARD_NAV_ENABLED', 'true')
		vi.resetModules()
		const { OPS_NAV_GROUPS } = await import('@/features/ops/ops-nav-config')
		const fulfil = OPS_NAV_GROUPS.find((g) => g.id === 'fulfilment')
		expect(fulfil?.items.some((i) => i.href === '/ops/dispatch')).toBe(true)
		const row = fulfil?.items.find((i) => i.href === '/ops/dispatch')
		expect(row?.label).toBe('Dispatch')
	})
})
