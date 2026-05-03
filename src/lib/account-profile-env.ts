/**
 * Story 18.9 — optional account portal avatar uploads (Supabase Storage).
 * Truthy tokens match {@link isSmsEnabled} / dispatch / rider map switches.
 */
export function isAccountProfileAvatarUploadEnabled(): boolean {
	const v = process.env.ACCOUNT_PROFILE_AVATAR_UPLOAD_ENABLED
	if (v === undefined) return false
	const t = v.trim().toLowerCase()
	return t === '1' || t === 'true' || t === 'yes' || t === 'on'
}
