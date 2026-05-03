import { opsSettingsCopy } from '@/features/ops/copy/ops-settings-copy'

describe('opsSettingsCopy (Story 17.18)', () => {
	it('exposes index and bankAccount namespaces', () => {
		expect(opsSettingsCopy.index.pageTitle).toBe('Settings')
		expect(opsSettingsCopy.bankAccount.sectionBankDetails).toBeTruthy()
	})
})
