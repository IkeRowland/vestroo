import { afterEach, describe, expect, it, vi } from 'vitest'

import { isAccountProfileAvatarUploadEnabled } from '@/lib/account-profile-env'

describe('isAccountProfileAvatarUploadEnabled', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
	})

	it('is false for empty and off tokens', () => {
		vi.stubEnv('ACCOUNT_PROFILE_AVATAR_UPLOAD_ENABLED', '')
		expect(isAccountProfileAvatarUploadEnabled()).toBe(false)
		vi.stubEnv('ACCOUNT_PROFILE_AVATAR_UPLOAD_ENABLED', '0')
		expect(isAccountProfileAvatarUploadEnabled()).toBe(false)
		vi.stubEnv('ACCOUNT_PROFILE_AVATAR_UPLOAD_ENABLED', 'false')
		expect(isAccountProfileAvatarUploadEnabled()).toBe(false)
	})

	it('is true for canonical truthy tokens', () => {
		for (const v of ['1', 'true', 'YES', 'on']) {
			vi.stubEnv('ACCOUNT_PROFILE_AVATAR_UPLOAD_ENABLED', v)
			expect(isAccountProfileAvatarUploadEnabled()).toBe(true)
		}
	})
})
